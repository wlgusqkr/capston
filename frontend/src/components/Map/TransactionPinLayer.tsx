// TransactionPinLayer — renders RentDeal price chips on top of the heatmap.
//
// Lives INSIDE the <MapContainer>: relies on `useMap` + `useMapEvents` from
// react-leaflet to read the current zoom and viewport bbox. Emits the latest
// "stable" map state up to the parent via `onMapStateChange` (debounced
// internally) so MainMap can run the API query against it.
//
// Visual pattern (호갱노노 / 직방-style):
//   The price chip itself IS the marker. We render an `<L.divIcon>`-backed
//   `<Marker>` per jibun, where the icon HTML is the chip:
//
//     ┌──────────┐
//     │  82만원  │   ← Near-Black (selected: Coral)
//     └────▼─────┘   ← 6px CSS triangle anchors bottom-center to lat/lng
//
//   This replaces the old `<CircleMarker>` + hover `<Tooltip>` combination.
//   The chip is always visible at zoom ≥ MIN_ZOOM_FOR_PINS (no hover required).
//   No tooltip — the chip is the affordance.
//
// Rendering rules (DESIGN_SYSTEM.md + PM design decision):
//   - Hidden when zoom < MIN_ZOOM_FOR_PINS (13).
//   - Variant scales with zoom for readability:
//       compact  (13~14): "82" only
//       standard (15~16): "82만원"
//       expanded (17+)  : "82만원" + "Nb건" sub-line
//   - default chip: Near-Black fill, 1px white@40% stroke, subtle shadow
//   - hover/selected: scale up + Coral fill (selected only), z-index raised
//   - When `dimWhenPanelOpen` is true (any right panel open), all non-selected
//     chips fade to opacity 0.4 so they don't compete with the panel content.
//   - Same `jibun` collapses to one chip — clicking opens the panel for the
//     whole jibun cluster.
//
// Why divIcon over CircleMarker (trade-offs):
//   + Always-visible price label is the design affordance — no hover required
//     and no separate tooltip layer to manage z-order against panels.
//   + Real DOM means full design-token CSS (fonts, radii, shadows, hover).
//   - Slightly heavier per marker than CircleMarker (an SVG path). At our pin
//     volumes (≤ a few hundred per viewport at zoom 13+) this is comfortable;
//     we already gate by zoom and rely on bbox queries.
import { useEffect, useMemo, useRef, useState } from 'react';
import L from 'leaflet';
import { Marker, useMap, useMapEvents } from 'react-leaflet';

import type { Bbox, RentDealPin } from '@/types/api';

import './TransactionPinLayer.css';

/** Below this zoom level pins are hidden. Mirrors useTransactions.MIN_ZOOM_FOR_PINS. */
const MIN_ZOOM_FOR_PINS = 13;

/** Debounce window after which a moveend/zoomend "settles" into a fetch. */
const MOVE_DEBOUNCE_MS = 250;

type ChipVariant = 'compact' | 'standard' | 'expanded';

/** Pick the chip variant to render at the current zoom level. */
function chipVariantForZoom(zoom: number): ChipVariant {
  if (zoom >= 17) return 'expanded';
  if (zoom >= 15) return 'standard';
  return 'compact';
}

/** Approximate icon dimensions per variant (px). Used so Leaflet can place
 *  the icon's bottom-center exactly on the pin's lat/lng (iconAnchor).
 *  Numbers were measured against the rendered chip in Chrome at default
 *  zoom; small variance from real layout is fine because the pointer is
 *  always centered horizontally and the chip stack hangs from the anchor. */
const VARIANT_SIZE: Record<ChipVariant, { w: number; h: number }> = {
  // "82"     : ~22px wide × 22px tall + 6px pointer
  compact: { w: 28, h: 28 },
  // "82만원" : ~58px wide × 24px tall + 6px pointer
  standard: { w: 64, h: 30 },
  // "82만원" + sub : ~64 wide × 38 tall + 6px pointer
  expanded: { w: 72, h: 44 },
};

export interface MapState {
  bbox: Bbox;
  zoom: number;
}

export interface TransactionPinLayerProps {
  /** Pin data, fetched by the parent against the current bbox. */
  pins: RentDealPin[];
  /** The currently selected jibun (a stable string key, "{gu}|{jibun}"). */
  selectedJibun: string | null;
  /** Click handler — receives jibun key. */
  onPinClick: (jibunKey: string, pin: RentDealPin) => void;
  /** Bubble debounced (bbox, zoom) up to the parent for the API query. */
  onMapStateChange: (state: MapState) => void;
  /** When true, a right-side panel is open; all chips fade to 0.4 opacity
   *  EXCEPT the selected one. Renamed from the old `suppressTooltips`
   *  signal — same trigger, but now it dims always-visible chips instead
   *  of hiding hover tooltips that no longer exist. */
  suppressTooltips?: boolean;
}

/** Stable string key for grouping pins by jibun.
 *  We include `gu` because jibun strings are not globally unique
 *  (e.g., "1-1" exists in many gu).
 */
function jibunKeyOf(p: RentDealPin): string {
  return `${p.gu}|${p.dong_name}|${p.jibun}`;
}

/** Round-half-up to integer 만원 — matches `formatConvertedRent` behavior. */
function roundMan(v: number): number {
  return Math.round(v);
}

/** Build the chip's inner HTML for a divIcon. Returns a single root element
 *  string with the variant + state classes already applied. */
function chipHtml(opts: {
  variant: ChipVariant;
  isSelected: boolean;
  isDimmed: boolean;
  avgConverted: number | null;
  count: number;
}): string {
  const { variant, isSelected, isDimmed, avgConverted, count } = opts;

  // Price label. avgConverted may legitimately be null if every same-jibun
  // deal lacked the converted_rent field — show a "?" so the chip still
  // serves as a clickable affordance pointing to the jibun.
  const priceText =
    avgConverted == null
      ? '?'
      : variant === 'compact'
        ? `${avgConverted}`
        : `${avgConverted}만원`;

  const sub =
    variant === 'expanded'
      ? `<span class="tx-chip__sub">${count}건</span>`
      : '';

  const cls = [
    'tx-chip',
    `tx-chip--${variant}`,
    isSelected ? 'tx-chip--selected' : '',
    isDimmed ? 'tx-chip--dimmed' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return `<div class="${cls}"><span class="tx-chip__price">${priceText}</span>${sub}<span class="tx-chip__pointer" aria-hidden="true"></span></div>`;
}

export default function TransactionPinLayer({
  pins,
  selectedJibun,
  onPinClick,
  onMapStateChange,
  suppressTooltips = false,
}: TransactionPinLayerProps) {
  const map = useMap();
  const debounceTimer = useRef<number | null>(null);
  // Track current zoom so chip variants respond to zoom in/out without
  // remounting the markers (we still rebuild the divIcon on variant change).
  const [zoom, setZoom] = useState<number>(() => map.getZoom());

  // Push initial map state once on mount so the parent can fire its first
  // query without waiting for a user gesture.
  useEffect(() => {
    const b = map.getBounds();
    onMapStateChange({
      bbox: {
        lng1: b.getWest(),
        lat1: b.getSouth(),
        lng2: b.getEast(),
        lat2: b.getNorth(),
      },
      zoom: map.getZoom(),
    });
    // We intentionally only run on mount — moveend handler covers the rest.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useMapEvents({
    moveend: () => scheduleEmit(),
    zoomend: () => {
      // Update zoom state immediately (no debounce) so chip variants feel snappy.
      setZoom(map.getZoom());
      scheduleEmit();
    },
  });

  function scheduleEmit() {
    if (debounceTimer.current != null) {
      window.clearTimeout(debounceTimer.current);
    }
    debounceTimer.current = window.setTimeout(() => {
      const b = map.getBounds();
      onMapStateChange({
        bbox: {
          lng1: b.getWest(),
          lat1: b.getSouth(),
          lng2: b.getEast(),
          lat2: b.getNorth(),
        },
        zoom: map.getZoom(),
      });
      debounceTimer.current = null;
    }, MOVE_DEBOUNCE_MS);
  }

  // Cleanup pending debounce timer on unmount.
  useEffect(
    () => () => {
      if (debounceTimer.current != null) {
        window.clearTimeout(debounceTimer.current);
      }
    },
    []
  );

  // Deduplicate by jibun. Same-jibun pins → 1 chip at the shared coord.
  // We pick the first pin's lat/lng (all same-jibun share coords per SPEC 14.2)
  // and pre-compute the average converted_rent so the chip can render a
  // single integer 만원 figure without per-render reduction.
  const groups = useMemo(() => {
    interface Group {
      key: string;
      pin: RentDealPin;
      count: number;
      convertedSum: number;
      convertedSamples: number;
    }
    const m = new Map<string, Group>();
    for (const p of pins) {
      const key = jibunKeyOf(p);
      const existing = m.get(key);
      // converted_rent is required by the API contract (RentDealPin.converted_rent
      // is non-optional) but defensive guard for legacy responses.
      const conv = typeof p.converted_rent === 'number' ? p.converted_rent : null;
      if (existing) {
        existing.count += 1;
        if (conv != null) {
          existing.convertedSum += conv;
          existing.convertedSamples += 1;
        }
      } else {
        m.set(key, {
          key,
          pin: p,
          count: 1,
          convertedSum: conv ?? 0,
          convertedSamples: conv != null ? 1 : 0,
        });
      }
    }
    return Array.from(m.values()).map((g) => ({
      key: g.key,
      pin: g.pin,
      count: g.count,
      avgConverted:
        g.convertedSamples > 0 ? roundMan(g.convertedSum / g.convertedSamples) : null,
    }));
  }, [pins]);

  // Hide chips entirely below the threshold (the parent also gates the query
  // but we additionally avoid rendering any markers).
  if (zoom < MIN_ZOOM_FOR_PINS) return null;

  const variant = chipVariantForZoom(zoom);
  const size = VARIANT_SIZE[variant];

  return (
    <>
      {groups.map(({ key, pin, count, avgConverted }) => {
        const isSelected = selectedJibun === key;
        // Dim ALL non-selected chips when any right panel is open. The
        // selected chip stays fully opaque (and Coral) so the user can
        // visually trace it to the open panel content.
        const isDimmed = suppressTooltips && !isSelected;

        // Build the icon. divIcon is rebuilt on variant/state change so the
        // HTML class list reflects the new state — Leaflet then redraws the
        // marker. iconAnchor places the bottom-center on the lat/lng so the
        // ▼ pointer points at the actual jibun coordinate.
        const icon = L.divIcon({
          className: 'tx-chip-icon',
          html: chipHtml({
            variant,
            isSelected,
            isDimmed,
            avgConverted,
            count,
          }),
          iconSize: [size.w, size.h],
          iconAnchor: [size.w / 2, size.h],
        });

        return (
          <Marker
            key={key}
            position={[pin.lat, pin.lng]}
            icon={icon}
            // Selected chip floats above neighbors; dimmed chips sink below
            // so a stack doesn't visually fight the active panel.
            zIndexOffset={isSelected ? 1000 : isDimmed ? -100 : 0}
            // Stop click propagation so map-background click handlers
            // (KernelScoreLayer) don't also fire. Default L.Marker stops
            // mousedown but not always click; explicit guard in the handler.
            bubblingMouseEvents={false}
            eventHandlers={{
              click: (e) => {
                e.originalEvent.stopPropagation();
                onPinClick(key, pin);
              },
            }}
          />
        );
      })}
    </>
  );
}

export { MIN_ZOOM_FOR_PINS, jibunKeyOf };
