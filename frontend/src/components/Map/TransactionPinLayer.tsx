// TransactionPinLayer — renders RentDeal pins on top of the heatmap.
//
// Lives INSIDE the <MapContainer>: relies on `useMap` + `useMapEvents` from
// react-leaflet to read the current zoom and viewport bbox. Emits the latest
// "stable" map state up to the parent via `onMapStateChange` (debounced
// internally) so MainMap can run the API query against it.
//
// Rendering rules (DESIGN_SYSTEM.md):
//   - Hidden when zoom < MIN_ZOOM_FOR_PINS (13).
//   - Pin size scales with zoom for readability at deep zoom (17+).
//   - Default pin: Near-Black fill, 1px white@60% stroke, opacity 0.85.
//   - Hover/selected pin: Coral fill, 1.5px white stroke, slightly larger.
//   - Same `jibun` collapses to one marker — clicking the marker opens the
//     panel for the whole jibun cluster.
//   - Hover Tooltip preview (jibun + 평균 환산월세 + 거래 수) — auto-suppressed
//     when the transaction panel is already open (parent passes a flag).
//
// Spec note on radius: DESIGN_SYSTEM.md lists "12px circle" but that refers
// to *diameter* of a transaction pin. Leaflet `CircleMarker.radius` is the
// *radius in pixels*, so 6px → 12px diameter. Hover 16px diameter → 8px radius.
import { useEffect, useMemo, useRef, useState } from 'react';
import { CircleMarker, Tooltip, useMap, useMapEvents } from 'react-leaflet';

import { MAP_PIN } from '@/lib/colors';
import type { Bbox, RentDealPin } from '@/types/api';

/** Below this zoom level pins are hidden. Mirrors useTransactions.MIN_ZOOM_FOR_PINS. */
const MIN_ZOOM_FOR_PINS = 13;

/** Debounce window after which a moveend/zoomend "settles" into a fetch. */
const MOVE_DEBOUNCE_MS = 250;

/** Pin radius (Leaflet `radius` is in px) by zoom. Bigger at deep zoom so the
 *  marker reads as a clear hit target on top of detailed VWorld road tiles.
 *  Selected pin gets a +2 boost on top of these.
 */
function pinRadiusForZoom(zoom: number): number {
  if (zoom >= 17) return 9;
  if (zoom >= 15) return 7;
  return 6;
}

const SELECTED_RADIUS_BUMP = 2;

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
  /** When true, the right-side transaction panel is already open; suppress
   *  hover tooltips so they don't compete with (or hide behind) the panel. */
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

export default function TransactionPinLayer({
  pins,
  selectedJibun,
  onPinClick,
  onMapStateChange,
  suppressTooltips = false,
}: TransactionPinLayerProps) {
  const map = useMap();
  const debounceTimer = useRef<number | null>(null);
  // Track current zoom so pin radii respond to zoom in/out without remounting
  // CircleMarker (Leaflet handles the path-redraw via setStyle internally when
  // we re-render with new `radius` props).
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
      // Update zoom state immediately (no debounce) so pin radii feel snappy.
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

  // Deduplicate by jibun. Same-jibun pins → 1 marker at the shared coord.
  // We pick the first pin's lat/lng (all same-jibun share coords per SPEC 14.2).
  // We also pre-compute the average converted_rent so the hover tooltip can
  // render a single integer 만원 figure without a per-render reduce.
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

  // Hide pins entirely below the threshold (the parent also gates the query
  // but we additionally avoid rendering any markers).
  if (zoom < MIN_ZOOM_FOR_PINS) return null;

  return (
    <>
      {groups.map(({ key, pin, count, avgConverted }) => {
        const isSelected = selectedJibun === key;
        const baseRadius = pinRadiusForZoom(zoom);
        const radius = isSelected ? baseRadius + SELECTED_RADIUS_BUMP : baseRadius;
        const fill = isSelected ? MAP_PIN.selected : MAP_PIN.default;
        const stroke = MAP_PIN.innerDot; // white
        const strokeOpacity = isSelected ? 1 : 0.6;
        const strokeWeight = isSelected ? 1.5 : 1;
        const fillOpacity = isSelected ? 1 : 0.85;

        // Tooltip body — single price for 1건, average for 2건+. Mono tabular
        // figures keep digits aligned. Suppressed when the panel is open or
        // when this very pin is already selected.
        const showTooltip = !suppressTooltips && !isSelected;
        const priceLine =
          avgConverted != null
            ? count === 1
              ? `${avgConverted}만원 환산`
              : `${avgConverted}만원 평균 · ${count}건`
            : `${count}건`;

        return (
          <CircleMarker
            key={key}
            center={[pin.lat, pin.lng]}
            radius={radius}
            bubblingMouseEvents={false}
            pathOptions={{
              color: stroke,
              opacity: strokeOpacity,
              weight: strokeWeight,
              fillColor: fill,
              fillOpacity,
            }}
            eventHandlers={{
              click: (e) => {
                e.originalEvent.stopPropagation();
                onPinClick(key, pin);
              },
            }}
          >
            {showTooltip && (
              <Tooltip
                direction="top"
                offset={[0, -radius - 2]}
                opacity={1}
                className="tx-pin-tooltip"
              >
                <div className="tx-pin-tooltip__where">
                  {pin.dong_name} {pin.jibun}
                </div>
                <div className="tx-pin-tooltip__price tabular">{priceLine}</div>
              </Tooltip>
            )}
          </CircleMarker>
        );
      })}
    </>
  );
}

export { MIN_ZOOM_FOR_PINS, jibunKeyOf };
