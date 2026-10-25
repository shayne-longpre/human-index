import type { Layer, PickingInfo } from '@deck.gl/core';
import { MapboxOverlay } from '@deck.gl/mapbox';
import { ColumnLayer, GeoJsonLayer, ScatterplotLayer } from '@deck.gl/layers';
import {
  Map as MapLibreMap,
  NavigationControl,
  type ErrorEvent,
  type StyleSpecification,
} from 'maplibre-gl';
import { useEffect, useRef, useState } from 'react';
import type { HistoricalCity, HistoricalCityObservation, MvpMetricId, PopulationSurfaceDataset } from '@atlas/contracts';
import type {
  CountryFeatureCollection,
  CountryProperties,
  HistoricalFeatureCollection,
  HistoricalProperties,
} from '../data';
import { metricColor } from '../metricViews';
import { camerasEqual, type AtlasMapCamera } from '../viewState';
import { surfaceColor, surfaceElevation } from '../surfaceScale';

export type PopulationSurfaceCell = PopulationSurfaceDataset['cells'][number];

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
  populationSurface: PopulationSurfaceDataset | null;
  populationSurfaceLabel: string | null;
  selectedSurfaceCell: PopulationSurfaceCell | null;
  onSurfaceSelect: (cell: PopulationSurfaceCell) => void;
  caption: string;
  caution: string;
  selectedCode: string | null;
  onSelect: (code: string) => void;
  onHistoricalSelect: (properties: HistoricalProperties) => void;
  onCitySelect: (point: HistoricalCityPoint) => void;
  camera: AtlasMapCamera;
  resetCamera: AtlasMapCamera;
  onCameraChange: (camera: AtlasMapCamera) => void;
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
  populationSurface,
  populationSurfaceLabel,
  selectedSurfaceCell,
  onSurfaceSelect,
  caption,
  caution,
  selectedCode,
  onSelect,
  onHistoricalSelect,
  onCitySelect,
  camera,
  resetCamera,
  onCameraChange,
}: MapViewProps) {
  const elementRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const overlayRef = useRef<MapboxOverlay | null>(null);
  const cameraCallbackRef = useRef(onCameraChange);
  cameraCallbackRef.current = onCameraChange;
  const [fallback, setFallback] = useState(false);
  const knownValueCount = Array.from(valueByCode.values()).filter((value) => value !== null).length;
  const territorialValuesAvailable = knownValueCount > 0;
  const showCountryValues = territorialValuesAvailable && !populationSurface;

  useEffect(() => {
    if (!elementRef.current || mapRef.current) return;
    try {
      const map = new MapLibreMap({
        container: elementRef.current,
        style,
        center: [camera.longitude, camera.latitude],
        zoom: camera.zoom,
        minZoom: 0.75,
        maxZoom: 7,
        pitch: camera.pitch,
        bearing: camera.bearing,
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
      map.on('moveend', () => {
        const center = map.getCenter();
        cameraCallbackRef.current({
          longitude: center.lng,
          latitude: center.lat,
          zoom: map.getZoom(),
          pitch: map.getPitch(),
          bearing: map.getBearing(),
        });
      });
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
    const map = mapRef.current;
    if (!map) return;
    const center = map.getCenter();
    const current = {
      longitude: center.lng,
      latitude: center.lat,
      zoom: map.getZoom(),
      pitch: map.getPitch(),
      bearing: map.getBearing(),
    };
    if (!camerasEqual(current, camera)) {
      map.jumpTo({
        center: [camera.longitude, camera.latitude],
        zoom: camera.zoom,
        pitch: camera.pitch,
        bearing: camera.bearing,
      });
    }
  }, [camera]);

  useEffect(() => {
    const overlay = overlayRef.current;
    if (!overlay) return;
    const layers: Layer[] = [
        new GeoJsonLayer<CountryProperties>({
          id: `atlas-${metricId}-${year}-${knownValueCount}`,
          data: geometry,
          filled: true,
          stroked: true,
          pickable: showCountryValues,
          autoHighlight: true,
          highlightColor: [255, 246, 220, 90],
          lineWidthUnits: 'pixels',
          getLineWidth: (feature) => (feature.properties.code === selectedCode ? 2.3 : 0.55),
          getLineColor: (feature) =>
            feature.properties.code === selectedCode
              ? [255, 244, 211, 255]
              : showCountryValues
                ? [8, 22, 19, 180]
                : [39, 65, 56, 0],
          getFillColor: (feature) =>
            showCountryValues
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

    if (populationSurface) {
      layers.push(new ColumnLayer<PopulationSurfaceCell>({
        id: `population-surface-${populationSurface.source_release_id}-${populationSurface.source_year}`,
        data: populationSurface.cells.filter((cell) => cell[2] > 0),
        diskResolution: 6,
        extruded: true,
        pickable: true,
        autoHighlight: true,
        highlightColor: [255, 247, 205, 190],
        radius: 31000,
        getPosition: (cell) => [cell[0] - 179.5, 89.5 - cell[1]],
        getElevation: (cell) => surfaceElevation(cell[2], populationSurface.cell_area_km2_by_row[cell[1]]),
        getFillColor: (cell) => surfaceColor(cell[2]),
        getLineColor: (cell) => cell[0] === selectedSurfaceCell?.[0] && cell[1] === selectedSurfaceCell?.[1]
          ? [255, 250, 220, 255] : [0, 0, 0, 0],
        stroked: selectedSurfaceCell !== null,
        onClick: ({ object }) => { if (object) onSurfaceSelect(object); },
        updateTriggers: { getLineColor: [selectedSurfaceCell] },
      }));
      layers.push(new ScatterplotLayer<PopulationSurfaceCell>({
        id: `population-surface-zero-${populationSurface.source_release_id}-${populationSurface.source_year}`,
        data: populationSurface.cells.filter((cell) => cell[2] === 0),
        visible: camera.zoom >= 2,
        pickable: true,
        radiusUnits: 'pixels',
        getRadius: 0.75,
        getPosition: (cell) => [cell[0] - 179.5, 89.5 - cell[1]],
        getFillColor: [111, 128, 117, 130],
        onClick: ({ object }) => { if (object) onSurfaceSelect(object); },
      }));
    }

    if (historicalEnabled && historicalSnapshot) {
      layers.push(
        new GeoJsonLayer<HistoricalProperties>({
          id: `historical-polities-${historicalSnapshot.atlas_year}`,
          data: historicalSnapshot,
          filled: !populationSurface,
          stroked: true,
          pickable: true,
          autoHighlight: true,
          highlightColor: [255, 239, 189, 75],
          lineWidthUnits: 'pixels',
          getLineWidth: (feature) =>
            feature.properties.source_feature_id === selectedHistoricalId
              ? 2.4
              : feature.properties.unresolved_overlap_count > 0
                ? 1.7
                : feature.properties.source_relation_role === 'composite' ? 1.3 : 0.9,
          getLineColor: (feature) => {
            if (feature.properties.source_feature_id === selectedHistoricalId) {
              return [255, 243, 204, 255];
            }
            if (populationSurface) {
              return feature.properties.unresolved_overlap_count > 0
                ? [220, 132, 105, 145]
                : [182, 201, 166, 115];
            }
            if (feature.properties.unresolved_overlap_count > 0) {
              return [232, 132, 105, 235];
            }
            return feature.properties.source_relation_role === 'composite'
              ? [244, 210, 128, 235]
              : [236, 204, 125, 205];
          },
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
            const opacity = populationSurface ? 5 : feature.properties.source_relation_role === 'composite'
              ? 7
              : feature.properties.unresolved_overlap_count > 0
                ? showCountryValues || populationSurface ? 42 : 105
                : showCountryValues || populationSurface ? 30 : 90;
            return [color[0], color[1], color[2], opacity];
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
        if (layer.id.startsWith('population-surface-')) {
          const cell = object as PopulationSurfaceCell;
          const area = populationSurface?.cell_area_km2_by_row[cell[1]] ?? 1;
          return { text: `${(populationSurfaceLabel ?? 'Population grid')} · ${populationSurface?.source_year}\n${Math.round(cell[2]).toLocaleString()} modeled people in this 1° bin\n${(cell[2] / area).toFixed(1)} people/km² · click for source` };
        }
        if (layer.id.startsWith('historical-cities-')) {
          const point = object as HistoricalCityPoint;
          return {
            text: `${point.city.name}\n${point.observation.population.toLocaleString()} people · ${point.city.source_release_id ?? 'reba-modelski-ancient-v2'} estimate`,
          };
        }
        if (layer.id.startsWith('historical-polities-')) {
          const feature = object as { properties?: HistoricalProperties };
          if (!feature.properties) return null;
          const reconciliation = feature.properties.unresolved_overlap_count > 0
            ? `${feature.properties.unresolved_overlap_count} unresolved overlap${feature.properties.unresolved_overlap_count === 1 ? '' : 's'}`
            : feature.properties.source_relation_role === 'composite'
              ? 'Source-declared composite · outline treatment'
              : feature.properties.source_member_of
                ? `Source-declared member of ${feature.properties.source_member_of}`
                : 'No overlap decision in the bounded pilot';
          return { text: `${feature.properties.name}\n${reconciliation}\nCliopatria political context` };
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
    populationSurface,
    camera.zoom,
    populationSurfaceLabel,
    selectedSurfaceCell,
    onSurfaceSelect,
    metricId,
    onHistoricalSelect,
    onCitySelect,
    onSelect,
    selectedCode,
    selectedHistoricalId,
    selectedCityId,
    territorialValuesAvailable,
    showCountryValues,
    valueByCode,
    year,
  ]);

  return (
    <div className="map-shell">
      <div
        ref={elementRef}
        className="map-canvas"
        role="region"
        aria-label={`World map for ${year} ${populationSurface ? `${populationSurfaceLabel ?? 'source-native'} population grid` : metricLabel.toLocaleLowerCase()}${historicalEnabled && historicalSnapshot ? ` with ${historicalSnapshot.feature_count} Cliopatria polity features` : ''}${citiesEnabled && cityPoints.length ? ` and ${cityPoints.length} historical city observations` : ''}`}
      />
      <button
        className="map-reset"
        type="button"
        onClick={() => {
          mapRef.current?.jumpTo({
            center: [resetCamera.longitude, resetCamera.latitude],
            zoom: resetCamera.zoom,
            pitch: resetCamera.pitch,
            bearing: resetCamera.bearing,
          });
        }}
      >
        Reset view
      </button>
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
        Geometry © Natural Earth · historical context © Cliopatria · cities © Reba/Modelski · {populationSurface ? `${populationSurfaceLabel} · ` : ''}CC BY 4.0
      </div>
    </div>
  );
}
