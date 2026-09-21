import type { Layer, PickingInfo } from '@deck.gl/core';
import { MapboxOverlay } from '@deck.gl/mapbox';
import { GeoJsonLayer, ScatterplotLayer } from '@deck.gl/layers';
import {
  Map as MapLibreMap,
  NavigationControl,
  type ErrorEvent,
  type StyleSpecification,
} from 'maplibre-gl';
import { useEffect, useRef, useState } from 'react';
import type { HistoricalCity, HistoricalCityObservation, MvpMetricId } from '@atlas/contracts';
import type {
  CountryFeatureCollection,
  CountryProperties,
  HistoricalFeatureCollection,
  HistoricalProperties,
} from '../data';
import { metricColor } from '../metricViews';

interface MapViewProps {
  geometry: CountryFeatureCollection;
  metricId: MvpMetricId;
  metricLabel: string;
  year: number;
  valueByCode: ReadonlyMap<string, number | null>;
  loading: boolean;
  historicalSnapshot: HistoricalFeatureCollection | null;
  historicalLoading: boolean;
  historicalEnabled: boolean;
  cityPoints: HistoricalCityPoint[];
  citiesEnabled: boolean;
  selectedCityId: string | null;
  selectedHistoricalId: string | null;
  caption: string;
  caution: string;
  selectedCode: string | null;
  onSelect: (code: string) => void;
  onHistoricalSelect: (properties: HistoricalProperties) => void;
  onCitySelect: (point: HistoricalCityPoint) => void;
}

export interface HistoricalCityPoint {
  city: HistoricalCity;
  observation: HistoricalCityObservation;
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
  loading,
  historicalSnapshot,
  historicalLoading,
  historicalEnabled,
  cityPoints,
  citiesEnabled,
  selectedCityId,
  selectedHistoricalId,
  caption,
  caution,
  selectedCode,
  onSelect,
  onHistoricalSelect,
  onCitySelect,
}: MapViewProps) {
  const elementRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const overlayRef = useRef<MapboxOverlay | null>(null);
  const [fallback, setFallback] = useState(false);
  const knownValueCount = Array.from(valueByCode.values()).filter((value) => value !== null).length;
  const territorialValuesAvailable = knownValueCount > 0;

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
    const layers: Layer[] = [
        new GeoJsonLayer<CountryProperties>({
          id: `atlas-${metricId}-${year}-${knownValueCount}`,
          data: geometry,
          filled: true,
          stroked: true,
          pickable: true,
          autoHighlight: true,
          highlightColor: [255, 246, 220, 90],
          lineWidthUnits: 'pixels',
          getLineWidth: (feature) => (feature.properties.code === selectedCode ? 2.3 : 0.55),
          getLineColor: (feature) =>
            feature.properties.code === selectedCode
              ? [255, 244, 211, 255]
              : territorialValuesAvailable
                ? [8, 22, 19, 180]
                : [39, 65, 56, 0],
          getFillColor: (feature) =>
            territorialValuesAvailable
              ? metricColor(metricId, valueByCode.get(feature.properties.code) ?? null)
              : [13, 36, 29, 255],
          onClick: ({ object }) => {
            if (object?.properties?.code) onSelect(object.properties.code);
          },
          updateTriggers: {
            getFillColor: [metricId, year, valueByCode],
            getLineWidth: [selectedCode],
            getLineColor: [selectedCode],
          },
        }),
    ];

    if (historicalEnabled && historicalSnapshot) {
      layers.push(
        new GeoJsonLayer<HistoricalProperties>({
          id: `historical-polities-${historicalSnapshot.atlas_year}`,
          data: historicalSnapshot,
          filled: true,
          stroked: true,
          pickable: true,
          autoHighlight: true,
          highlightColor: [255, 239, 189, 75],
          lineWidthUnits: 'pixels',
          getLineWidth: (feature) =>
            feature.properties.source_feature_id === selectedHistoricalId ? 2.4 : 0.9,
          getLineColor: (feature) =>
            feature.properties.source_feature_id === selectedHistoricalId
              ? [255, 243, 204, 255]
              : [236, 204, 125, 205],
          getFillColor: (feature) => {
            const seed = Array.from(feature.properties.name).reduce(
              (sum, character) => sum + character.charCodeAt(0),
              0,
            );
            const colors: Array<[number, number, number]> = [
              [62, 111, 91],
              [132, 125, 72],
              [92, 116, 112],
              [129, 91, 69],
            ];
            const color = colors[seed % colors.length];
            return [color[0], color[1], color[2], territorialValuesAvailable ? 30 : 90];
          },
          onClick: ({ object }) => {
            if (object?.properties) onHistoricalSelect(object.properties);
          },
          updateTriggers: {
            getLineWidth: [selectedHistoricalId],
            getLineColor: [selectedHistoricalId],
          },
        }),
      );
    }

    if (citiesEnabled && cityPoints.length > 0) {
      layers.push(
        new ScatterplotLayer<HistoricalCityPoint>({
          id: `historical-cities-${year}`,
          data: cityPoints,
          pickable: true,
          autoHighlight: true,
          getPosition: (point) => [point.city.longitude, point.city.latitude],
          getRadius: (point) => Math.max(4, Math.min(15, 3 + Math.log10(point.observation.population) * 1.8)),
          radiusUnits: 'pixels',
          getFillColor: [241, 207, 124, 210],
          getLineColor: (point) => point.city.id === selectedCityId
            ? [255, 255, 245, 255]
            : [46, 36, 18, 235],
          getLineWidth: (point) => point.city.id === selectedCityId ? 2.5 : 1,
          lineWidthUnits: 'pixels',
          stroked: true,
          onClick: ({ object }) => { if (object) onCitySelect(object); },
          updateTriggers: { getLineColor: [selectedCityId], getLineWidth: [selectedCityId] },
        }),
      );
    }

    overlay.setProps({
      layers,
      getTooltip: ({ layer, object }: PickingInfo) => {
        if (!layer || !object) return null;
        if (layer.id.startsWith('historical-cities-')) {
          const point = object as HistoricalCityPoint;
          return {
            text: `${point.city.name}\n${point.observation.population.toLocaleString()} people · published estimate`,
          };
        }
        if (layer.id.startsWith('historical-polities-')) {
          const feature = object as { properties?: HistoricalProperties };
          return feature.properties ? { text: `${feature.properties.name}\nCliopatria political context` } : null;
        }
        if (layer.id.startsWith('atlas-')) {
          const feature = object as { properties?: CountryProperties };
          if (!feature.properties) return null;
          const value = valueByCode.get(feature.properties.code);
          return {
            text: `${feature.properties.name}\n${value === null || value === undefined ? `No ${metricLabel.toLocaleLowerCase()} observation` : `${value.toLocaleString()} · ${metricLabel}`}`,
          };
        }
        return null;
      },
    });
  }, [
    geometry,
    historicalEnabled,
    historicalSnapshot,
    citiesEnabled,
    cityPoints,
    knownValueCount,
    metricId,
    onHistoricalSelect,
    onCitySelect,
    onSelect,
    selectedCode,
    selectedHistoricalId,
    selectedCityId,
    territorialValuesAvailable,
    valueByCode,
    year,
  ]);

  return (
    <div className="map-shell">
      <div
        ref={elementRef}
        className="map-canvas"
        role="img"
        aria-label={`World map for ${year} ${metricLabel.toLocaleLowerCase()}${historicalEnabled && historicalSnapshot ? ` with ${historicalSnapshot.feature_count} Cliopatria polity features` : ''}${citiesEnabled && cityPoints.length ? ` and ${cityPoints.length} historical city observations` : ''}`}
      />
      {fallback ? (
        <div className="map-fallback" role="status">
          <span>Map rendering is unavailable.</span>
          <p>The complete data remain available in the accessible table below.</p>
        </div>
      ) : null}
      {loading || historicalLoading ? (
        <div className="map-loading" role="status">
          <span className="loading-mark" aria-hidden="true" />
          Loading {loading ? metricLabel.toLocaleLowerCase() : 'historical boundary'} evidence…
        </div>
      ) : null}
      <div className="map-caption">
        <span className="eyebrow">Statistical support</span>
        <strong>{caption}</strong>
        <span>{caution}</span>
      </div>
      <div className="map-attribution">
        Geometry © Natural Earth · historical context © Cliopatria · cities © Reba/Modelski · CC BY 4.0
      </div>
    </div>
  );
}
