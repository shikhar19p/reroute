import React, { createElement, useEffect, useRef, useState } from 'react';
import { Animated, View, StyleSheet, TouchableOpacity, Text, Platform } from 'react-native';
import { MapPin } from 'lucide-react-native';
import { Linking } from 'react-native';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { useTheme } from '../context/ThemeContext';
import { extractCoordsFromMapLink } from '../utils/geo';

// The Maps JS key is browser-restricted (HTTP referrer) and handed out by a
// Cloud Function at runtime rather than baked into the app bundle — see
// functions/src/index.ts getMapsJsApiKey. Cached at module scope so every
// map preview on screen shares one fetch instead of one each.
let mapsApiKeyPromise: Promise<string | null> | null = null;
function getMapsApiKey(): Promise<string | null> {
  if (!mapsApiKeyPromise) {
    mapsApiKeyPromise = httpsCallable<void, { apiKey: string }>(getFunctions(), 'getMapsJsApiKey')()
      .then(res => res.data.apiKey)
      .catch(() => {
        mapsApiKeyPromise = null; // allow retry on next call
        return null;
      });
  }
  return mapsApiKeyPromise;
}

// Standard muted "night mode" Google Maps style, applied when the app is in dark mode.
const DARK_MAP_STYLE = [
  { elementType: 'geometry', stylers: [{ color: '#1a1a1a' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#1a1a1a' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#8a8a8a' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#2e2e2e' }] },
  { featureType: 'road', elementType: 'labels.text.fill', stylers: [{ color: '#8a8a8a' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#101820' }] },
  { featureType: 'poi', elementType: 'geometry', stylers: [{ color: '#222222' }] },
  { featureType: 'administrative', elementType: 'geometry', stylers: [{ color: '#3a3a3a' }] },
];

// WebView is native-only — load conditionally so the web bundle doesn't fail
const WebView = Platform.OS !== 'web'
  ? require('react-native-webview').WebView
  : null;

interface LocationMapViewProps {
  location: string;
  mapLink?: string;
  height?: number;
}

function buildMapHtml(lat: number, lng: number, isDark: boolean, apiKey: string): string {
  const bg = isDark ? '#111' : '#e8e8e8';
  const pinSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28"><path d="M14 27C14 27 24 17.5 24 11C24 5.5 19.5 1 14 1C8.5 1 4 5.5 4 11C4 17.5 14 27 14 27Z" fill="%23C5A565" stroke="white" stroke-width="2"/><circle cx="14" cy="11" r="4" fill="white"/></svg>`;

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no"/>
  <style>
    html,body,#map{margin:0;padding:0;width:100%;height:100%;background:${bg};overflow:hidden;}
    .gm-style-cc, a[href^="https://maps.google.com/maps"]{display:none!important;}
  </style>
</head>
<body>
<div id="map"></div>
<script src="https://maps.googleapis.com/maps/api/js?key=${apiKey}"></script>
<script>
  var center = {lat: ${lat}, lng: ${lng}};
  var map = new google.maps.Map(document.getElementById('map'), {
    center: center,
    zoom: 15,
    disableDefaultUI: true,
    draggable: false,
    scrollwheel: false,
    disableDoubleClickZoom: true,
    keyboardShortcuts: false,
    gestureHandling: 'none',
    styles: ${isDark ? JSON.stringify(DARK_MAP_STYLE) : 'undefined'}
  });
  new google.maps.Marker({
    position: center,
    map: map,
    icon: {
      url: 'data:image/svg+xml,${pinSvg}',
      scaledSize: new google.maps.Size(28, 28),
      anchor: new google.maps.Point(14, 27)
    }
  });
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
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [coordsLoading, setCoordsLoading] = useState(true);
  const [keyLoading, setKeyLoading] = useState(true);
  const mapFade = useRef(new Animated.Value(0)).current;
  const loading = coordsLoading || keyLoading;
  const mapReady = !loading && !!coords && !!apiKey;

  useEffect(() => {
    let cancelled = false;
    getMapsApiKey().then(key => {
      if (!cancelled) { setApiKey(key); setKeyLoading(false); }
    });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    let cancelled = false;

    const resolve = async () => {
      if (mapLink) {
        const fromUrl = extractCoordsFromMapLink(mapLink);
        if (fromUrl) {
          if (!cancelled) { setCoords(fromUrl); setCoordsLoading(false); }
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
        if (!cancelled) setCoordsLoading(false);
      }
    };

    resolve();
    return () => { cancelled = true; };
  }, [location, mapLink]);

  // Fade in the map once coords and the Maps API key are both ready
  useEffect(() => {
    if (mapReady) {
      Animated.timing(mapFade, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }).start();
    }
  }, [mapReady]);

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

      {/* Web: render iframe with Google Maps HTML inline */}
      {mapReady && Platform.OS === 'web' && (
        <Animated.View style={[StyleSheet.absoluteFill, { opacity: mapFade }]}>
          {createElement('iframe', {
            key: 'map-iframe',
            srcDoc: buildMapHtml(coords![0], coords![1], isDark, apiKey!),
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
      {mapReady && Platform.OS !== 'web' && WebView && (
        <Animated.View style={[StyleSheet.absoluteFill, { opacity: mapFade }]}>
          <WebView
            source={{ html: buildMapHtml(coords![0], coords![1], isDark, apiKey!), baseUrl: '' }}
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

      {!loading && (!coords || !apiKey) && (
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
