// KernelScoreLayer — captures map click events for kernel scoring (Phase 2b).
//
// Mounted as a child of <MapContainer> alongside TransactionPinLayer. Listens
// for raw map clicks. Pin clicks are explicitly suppressed via
// `bubblingMouseEvents={false}` on TransactionPinLayer's CircleMarkers, so
// this handler fires only for "empty" map clicks and polygon clicks. Renders
// a single Coral CircleMarker at the clicked point, replacing any previous one.
//
// Design system mapping (DESIGN_SYSTEM.md "Map-Specific Shapes"):
//   - 12px circle (Leaflet `radius` is half-diameter → 6).
//   - fill Coral (#ff7759 — MAP_PIN.selected).
//   - stroke 1.5px white.
//
// Click semantics:
//   - GeoJSON polygon clicks DO bubble to the map by default. To keep the
//     polygon-click → DongPanel behavior intact while still letting the user
//     score "empty" map areas, we accept ALL clicks including ones over a
//     polygon. The parent then decides which panel takes precedence
//     (polygon click also fires DongPanel; we open kernel panel either way
//     since they're mutually exclusive).
//
// Why a separate file: mirrors TransactionPinLayer's pattern. HeatMap.tsx
// stays untouched.
import { CircleMarker, useMapEvents } from 'react-leaflet';

import { MAP_PIN } from '@/lib/colors';

import type { LatLng } from '@/hooks/useKernelScore';

const MARKER_RADIUS = 6;

export interface KernelScoreLayerProps {
  /** Currently selected point. Null → no marker, no click hint. */
  point: LatLng | null;
  /** Fired on every map click; parent decides whether to set the point. */
  onPointClick: (latLng: LatLng) => void;
}

export default function KernelScoreLayer({
  point,
  onPointClick,
}: KernelScoreLayerProps) {
  useMapEvents({
    click: (e) => {
      // Pin clicks are suppressed via TransactionPinLayer's
      // bubblingMouseEvents={false}, so this fires only for empty/polygon
      // clicks. The parent makes panels mutually exclusive.
      onPointClick([e.latlng.lat, e.latlng.lng]);
    },
  });

  if (!point) return null;

  return (
    <CircleMarker
      center={point}
      radius={MARKER_RADIUS}
      pathOptions={{
        color: MAP_PIN.innerDot, // white stroke
        opacity: 1,
        weight: 1.5,
        fillColor: MAP_PIN.selected, // Coral
        fillOpacity: 1,
      }}
      // Mark as non-interactive so a follow-up click on the same coord still
      // registers as a map click (otherwise Leaflet absorbs it).
      interactive={false}
    />
  );
}
