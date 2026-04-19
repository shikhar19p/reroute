import React, { createElement, useEffect, useRef, useState } from 'react';
import { Animated, View, StyleSheet, TouchableOpacity, Text, Platform } from 'react-native';
import { MapPin } from 'lucide-react-native';
import { Linking } from 'react-native';
import { useTheme } from '../context/ThemeContext';

// WebView is native-only — load conditionally so the web bundle doesn't fail
const WebView = Platform.OS !== 'web'
  ? require('react-native-webview').WebView
  : null;

interface LocationMapViewProps {
  location: string;
  mapLink?: string;
  height?: number;
}

function extractCoords(mapLink: string): [number, number] | null {
  const patterns = [
    /[?&]q=(-?\d+\.?\d+),(-?\d+\.?\d+)/,
    /\/@(-?\d+\.?\d+),(-?\d+\.?\d+)[,z]/,
    /[?&]ll=(-?\d+\.?\d+),(-?\d+\.?\d+)/,
    /place\/[^/]+\/@(-?\d+\.?\d+),(-?\d+\.?\d+)/,
    /maps\?q=(-?\d+\.?\d+),(-?\d+\.?\d+)/,
  ];
  for (const re of patterns) {
    const m = mapLink.match(re);
    if (m) return [parseFloat(m[1]), parseFloat(m[2])];
  }
  return null;
}

function buildMapHtml(lat: number, lng: number, isDark: boolean): string {
  const bg = isDark ? '#111' : '#e8e8e8';

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no"/>
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <style>
    html,body,#map{margin:0;padding:0;width:100%;height:100%;background:${bg};overflow:hidden;}
    .leaflet-control-attribution,.leaflet-control-zoom{display:none!important;}
  </style>
</head>
<body>
<div id="map"></div>
<script>
  var map = L.map('map',{
    zoomControl:false,attributionControl:false,
    dragging:false,touchZoom:false,doubleClickZoom:false,
    scrollWheelZoom:false,boxZoom:false,keyboard:false
  }).setView([${lat},${lng}],15);

  L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',{
    subdomains:['a','b','c','d'],
    maxZoom:20
  }).addTo(map);

  var pin = L.divIcon({
    className:'',
    html:'<div style="width:14px;height:14px;background:#C5A565;border:2px solid #fff;border-radius:50% 50% 50% 0;transform:rotate(-45deg);box-shadow:0 2px 6px rgba(0,0,0,0.45);"></div>',
    iconSize:[14,14],iconAnchor:[7,14]
  });
  L.marker([${lat},${lng}],{icon:pin}).addTo(map);
</script>
</body>
</html>`;
}

function MapSkeleton({ height, isDark }: { height: number; isDark: boolean }) {
  const shimmer = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(0.6)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(shimmer, { toValue: 1, duration: 1100, useNativeDriver: true }),
        Animated.timing(shimmer, { toValue: 0, duration: 1100, useNativeDriver: true }),
      ])
    ).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 900, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0.6, duration: 900, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  const bg = isDark ? '#1a1a1a' : '#e8e4dc';
  const line = isDark ? '#2e2e2e' : '#d2cdc3';
  const pinBg = isDark ? '#2a2a2a' : '#c9c4bb';

  const shimmerOpacity = shimmer.interpolate({ inputRange: [0, 1], outputRange: [0.0, 0.5] });

  return (
    <View style={[StyleSheet.absoluteFill, { backgroundColor: bg, overflow: 'hidden' }]}>
      {/* Fake road grid */}
      <View style={[mapSkeletonStyles.hLine, { top: height * 0.35, backgroundColor: line }]} />
      <View style={[mapSkeletonStyles.hLine, { top: height * 0.62, backgroundColor: line }]} />
      <View style={[mapSkeletonStyles.vLine, { left: '28%', backgroundColor: line }]} />
      <View style={[mapSkeletonStyles.vLine, { left: '60%', backgroundColor: line }]} />
      {/* Thinner secondary roads */}
      <View style={[mapSkeletonStyles.hLine, { top: height * 0.20, backgroundColor: line, opacity: 0.5, height: 1 }]} />
      <View style={[mapSkeletonStyles.vLine, { left: '44%', backgroundColor: line, opacity: 0.5, width: 1 }]} />

      {/* Moving shimmer sweep */}
      <Animated.View
        style={[
          mapSkeletonStyles.shimmerSweep,
          { opacity: shimmerOpacity, backgroundColor: isDark ? '#fff' : '#fff' },
        ]}
      />

      {/* Pulsing pin in center */}
      <View style={mapSkeletonStyles.pinCenter}>
        <Animated.View
          style={[
            mapSkeletonStyles.pinRing,
            { opacity: pulse, borderColor: '#C5A565' },
          ]}
        />
        <Animated.View style={[mapSkeletonStyles.pinDot, { opacity: pulse, backgroundColor: pinBg }]} />
      </View>

      {/* "Loading map…" label */}
      <Animated.Text style={[mapSkeletonStyles.loadingLabel, { opacity: pulse, color: isDark ? '#555' : '#aaa8a0' }]}>
        Loading map…
      </Animated.Text>
    </View>
  );
}

const mapSkeletonStyles = StyleSheet.create({
  hLine: { position: 'absolute', left: 0, right: 0, height: 2 },
  vLine: { position: 'absolute', top: 0, bottom: 0, width: 2 },
  shimmerSweep: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: '45%',
    left: '-50%',
    transform: [{ skewX: '-10deg' }],
  },
  pinCenter: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [{ translateX: -16 }, { translateY: -16 }],
    alignItems: 'center',
    justifyContent: 'center',
    width: 32,
    height: 32,
  },
  pinRing: {
    position: 'absolute',
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
  },
  pinDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  loadingLabel: {
    position: 'absolute',
    bottom: 12,
    alignSelf: 'center',
    fontSize: 11,
    fontWeight: '500',
    letterSpacing: 0.4,
  },
});

export default function LocationMapView({ location, mapLink, height = 200 }: LocationMapViewProps) {
  const { colors, isDark } = useTheme();
  const [coords, setCoords] = useState<[number, number] | null>(null);
  const [loading, setLoading] = useState(true);
  const mapFade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    let cancelled = false;

    const resolve = async () => {
      if (mapLink) {
        const fromUrl = extractCoords(mapLink);
        if (fromUrl) {
          if (!cancelled) { setCoords(fromUrl); setLoading(false); }
          return;
        }
      }

      try {
        const query = encodeURIComponent(location);
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?q=${query}&format=json&limit=1&countrycodes=in`,
          { headers: { 'User-Agent': 'RerouteAventures/1.0' } }
        );
        const data = await res.json();
        if (!cancelled && data?.[0]) {
          setCoords([parseFloat(data[0].lat), parseFloat(data[0].lon)]);
        }
      } catch {
        // leave coords null
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    resolve();
    return () => { cancelled = true; };
  }, [location, mapLink]);

  // Fade in the map once coords are ready
  useEffect(() => {
    if (!loading && coords) {
      Animated.timing(mapFade, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }).start();
    }
  }, [loading, coords]);

  const openMaps = () => {
    const url = mapLink
      || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location)}`;
    Linking.openURL(url);
  };

  return (
    <TouchableOpacity
      activeOpacity={0.9}
      onPress={openMaps}
      style={[styles.wrapper, { borderColor: colors.border, height }]}
    >
      {/* Skeleton shown while loading */}
      {loading && <MapSkeleton height={height} isDark={isDark} />}

      {/* Web: render iframe with Leaflet HTML inline */}
      {!loading && coords && Platform.OS === 'web' && (
        <Animated.View style={[StyleSheet.absoluteFill, { opacity: mapFade }]}>
          {createElement('iframe', {
            key: 'map-iframe',
            srcDoc: buildMapHtml(coords[0], coords[1], isDark),
            style: {
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              border: 'none',
            } as any,
            sandbox: 'allow-scripts allow-same-origin',
            title: 'Map',
          } as any)}
        </Animated.View>
      )}

      {/* Native: render WebView */}
      {!loading && coords && Platform.OS !== 'web' && WebView && (
        <Animated.View style={[StyleSheet.absoluteFill, { opacity: mapFade }]}>
          <WebView
            source={{ html: buildMapHtml(coords[0], coords[1], isDark), baseUrl: '' }}
            style={StyleSheet.absoluteFill}
            javaScriptEnabled
            domStorageEnabled
            originWhitelist={['*']}
            mixedContentMode="always"
            androidLayerType="hardware"
            scrollEnabled={false}
            showsHorizontalScrollIndicator={false}
            showsVerticalScrollIndicator={false}
            pointerEvents="none"
          />
        </Animated.View>
      )}

      {!loading && !coords && (
        <View style={[styles.centered, { backgroundColor: isDark ? '#111' : '#e8e8e8' }]}>
          <MapPin size={28} color={colors.placeholder} />
          <Text style={[styles.fallbackText, { color: colors.placeholder }]}>
            Location unavailable
          </Text>
        </View>
      )}

      {/* Tap overlay — transparent, captures the touch on top of WebView/iframe */}
      <View style={StyleSheet.absoluteFill} pointerEvents="box-only" />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  fallbackText: {
    fontSize: 13,
  },
});
