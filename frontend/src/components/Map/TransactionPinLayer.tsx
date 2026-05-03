// TransactionPinLayer — renders RentDeal pins on top of the heatmap.
//
// Lives INSIDE the <MapContainer>: relies on `useMap` + `useMapEvents` from
// react-leaflet to read the current zoom and viewport bbox. Emits the latest
// "stable" map state up to the parent via `onMapStateChange` (debounced
// internally) so MainMap can run the API query against it.
//
// Rendering rules (DESIGN_SYSTEM.md):
//   - Hidden when zoom < MIN_ZOOM_FOR_PINS (13).
//   - Default pin: 6px radius circle, fill Near-Black, stroke 1px white@60%,
//     opacity 0.85.
//   - Hover/selected pin: 8px radius, fill Coral, stroke 1.5px white.
//   - Same `jibun` collapses to one marker — clicking the marker opens the
//     panel for the whole jibun cluster.
//
// Spec note on radius: DESIGN_SYSTEM.md lists "12px circle" but that refers
// to *diameter* of a transaction pin. Leaflet `CircleMarker.radius` is the
// *radius in pixels*, so 6px → 12px diameter. Hover 16px diameter → 8px radius.
import { useEffect, useMemo, useRef } from 'react';
import { CircleMarker, useMap, useMapEvents } from 'react-leaflet';

import { MAP_PIN } from '@/lib/colors';
import type { Bbox, RentDealPin } from '@/types/api';

/** Below this zoom level pins are hidden. Mirrors useTransactions.MIN_ZOOM_FOR_PINS. */
const MIN_ZOOM_FOR_PINS = 13;

/** Debounce window after which a moveend/zoomend "settles" into a fetch. */
const MOVE_DEBOUNCE_MS = 250;

const PIN_RADIUS_DEFAULT = 6;
const PIN_RADIUS_ACTIVE = 8;

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
}

/** Stable string key for grouping pins by jibun.
 *  We include `gu` because jibun strings are not globally unique
 *  (e.g., "1-1" exists in many gu).
 */
function jibunKeyOf(p: RentDealPin): string {
  return `${p.gu}|${p.dong_name}|${p.jibun}`;
}

export default function TransactionPinLayer({
  pins,
  selectedJibun,
  onPinClick,
  onMapStateChange,
}: TransactionPinLayerProps) {
  const map = useMap();
  const debounceTimer = useRef<number | null>(null);

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
    zoomend: () => scheduleEmit(),
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
  const groups = useMemo(() => {
    const m = new Map<string, { key: string; pin: RentDealPin; count: number }>();
    for (const p of pins) {
      const key = jibunKeyOf(p);
      const existing = m.get(key);
      if (existing) {
        existing.count += 1;
      } else {
        m.set(key, { key, pin: p, count: 1 });
      }
    }
    return Array.from(m.values());
  }, [pins]);

  // Hide pins entirely below the threshold (the parent also gates the query
  // but we additionally avoid rendering any markers).
  if (map.getZoom() < MIN_ZOOM_FOR_PINS) return null;

  return (
    <>
      {groups.map(({ key, pin }) => {
        const isSelected = selectedJibun === key;
        const radius = isSelected ? PIN_RADIUS_ACTIVE : PIN_RADIUS_DEFAULT;
        const fill = isSelected ? MAP_PIN.selected : MAP_PIN.default;
        const stroke = MAP_PIN.innerDot; // white
        const strokeOpacity = isSelected ? 1 : 0.6;
        const strokeWeight = isSelected ? 1.5 : 1;
        const fillOpacity = isSelected ? 1 : 0.85;
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
          />
        );
      })}
    </>
  );
}

export { MIN_ZOOM_FOR_PINS, jibunKeyOf };
