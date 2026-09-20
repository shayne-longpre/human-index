import { MapboxOverlay } from '@deck.gl/mapbox';
import { GeoJsonLayer } from '@deck.gl/layers';
import {
  Map as MapLibreMap,
  NavigationControl,
  type ErrorEvent,
  type StyleSpecification,
} from 'maplibre-gl';
import { useEffect, useRef, useState } from 'react';
import type { MvpMetricId } from '@atlas/contracts';
import type { CountryFeatureCollection, CountryProperties } from '../data';
import { metricColor } from '../metricViews';

interface MapViewProps {
  geometry: CountryFeatureCollection;
  metricId: MvpMetricId;
  metricLabel: string;
  year: number;
  valueByCode: ReadonlyMap<string, number | null>;
  caption: string;
  caution: string;
  selectedCode: string | null;
  onSelect: (code: string) => void;
}

const style: StyleSpecification = {
  version: 8,
  sources: {},
  layers: [
    {
      id: 'ocean',
      type: 'background',
      paint: { 'background-color': '#071411' },
    },
  ],
};

export function MapView({
  geometry,
  metricId,
  metricLabel,
  year,
  valueByCode,
  caption,
  caution,
  selectedCode,
  onSelect,
}: MapViewProps) {
  const elementRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const overlayRef = useRef<MapboxOverlay | null>(null);
  const [fallback, setFallback] = useState(false);

  useEffect(() => {
    if (!elementRef.current || mapRef.current) return;
    try {
      const map = new MapLibreMap({
        container: elementRef.current,
        style,
        center: [8, 14],
        zoom: 1.12,
        minZoom: 0.75,
        maxZoom: 7,
        pitch: 18,
        bearing: 0,
        scrollZoom: false,
        cooperativeGestures: true,
        attributionControl: false,
        canvasContextAttributes: { antialias: true },
      });
      // deck.gl 9.4.0 interleaved mode is not compatible with MapLibre 6.10.0's
      // current internal viewport shape. Overlaid mode uses the public camera
      // contract and passed the renderer spike for this release.
      const overlay = new MapboxOverlay({ interleaved: false, layers: [] });
      map.addControl(overlay);
      map.addControl(new NavigationControl({ showCompass: false }), 'bottom-right');
      map.on('error', (event: ErrorEvent) => {
        if (event.error?.message.toLowerCase().includes('webgl')) setFallback(true);
      });
      mapRef.current = map;
      overlayRef.current = overlay;
      const resizeObserver = new ResizeObserver(() => map.resize());
      resizeObserver.observe(elementRef.current);
      return () => {
        resizeObserver.disconnect();
        overlay.finalize();
        map.remove();
        overlayRef.current = null;
        mapRef.current = null;
      };
    } catch {
      setFallback(true);
    }
  }, []);

  useEffect(() => {
    const overlay = overlayRef.current;
    if (!overlay) return;
    overlay.setProps({
      layers: [
        new GeoJsonLayer<CountryProperties>({
          id: `atlas-${metricId}-${year}`,
          data: geometry,
          filled: true,
          stroked: true,
          pickable: true,
          autoHighlight: true,
          highlightColor: [255, 246, 220, 90],
          lineWidthUnits: 'pixels',
          getLineWidth: (feature) => (feature.properties.code === selectedCode ? 2.3 : 0.55),
          getLineColor: (feature) =>
            feature.properties.code === selectedCode ? [255, 244, 211, 255] : [8, 22, 19, 180],
          getFillColor: (feature) =>
            metricColor(metricId, valueByCode.get(feature.properties.code) ?? null),
          onClick: ({ object }) => {
            if (object?.properties?.code) onSelect(object.properties.code);
          },
          updateTriggers: {
            getFillColor: [metricId, year, valueByCode],
            getLineWidth: [selectedCode],
            getLineColor: [selectedCode],
          },
        }),
      ],
    });
  }, [geometry, metricId, onSelect, selectedCode, valueByCode, year]);

  return (
    <div className="map-shell">
      <div
        ref={elementRef}
        className="map-canvas"
        role="img"
        aria-label={`World map colored by ${year} ${metricLabel.toLocaleLowerCase()}`}
      />
      {fallback ? (
        <div className="map-fallback" role="status">
          <span>Map rendering is unavailable.</span>
          <p>The complete data remain available in the accessible table below.</p>
        </div>
      ) : null}
      <div className="map-caption">
        <span className="eyebrow">Statistical support</span>
        <strong>{caption}</strong>
        <span>{caution}</span>
      </div>
      <div className="map-attribution">Geometry © Natural Earth · public domain</div>
    </div>
  );
}
