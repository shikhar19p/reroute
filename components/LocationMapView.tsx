import React, { useEffect, useState } from 'react';
import { View, StyleSheet, TouchableOpacity, ActivityIndicator, Text } from 'react-native';
import { WebView } from 'react-native-webview';
import { MapPin } from 'lucide-react-native';
import { Linking } from 'react-native';
import { useTheme } from '../context/ThemeContext';

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

  L.tileLayer('https://mt{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}',{
    subdomains:['0','1','2','3'],
    maxZoom:20
  }).addTo(map);

  var pin = L.divIcon({
    className:'',
    html:'<div style="width:28px;height:28px;background:#C5A565;border:3px solid #fff;border-radius:50% 50% 50% 0;transform:rotate(-45deg);box-shadow:0 2px 10px rgba(0,0,0,0.5);"></div>',
    iconSize:[28,28],iconAnchor:[14,28]
  });
  L.marker([${lat},${lng}],{icon:pin}).addTo(map);
</script>
</body>
</html>`;
}

export default function LocationMapView({ location, mapLink, height = 200 }: LocationMapViewProps) {
  const { colors, isDark } = useTheme();
  const [coords, setCoords] = useState<[number, number] | null>(null);
  const [loading, setLoading] = useState(true);

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
          { headers: { 'User-Agent': 'ReRouteAdventures/1.0' } }
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
      {loading && (
        <View style={[styles.centered, { backgroundColor: isDark ? '#111' : '#e8e8e8' }]}>
          <ActivityIndicator color={colors.primary} size="small" />
        </View>
      )}

      {!loading && coords && (
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
      )}

      {!loading && !coords && (
        <View style={[styles.centered, { backgroundColor: isDark ? '#111' : '#e8e8e8' }]}>
          <MapPin size={28} color={colors.placeholder} />
          <Text style={[styles.fallbackText, { color: colors.placeholder }]}>
            Location unavailable
          </Text>
        </View>
      )}

      {/* Tap overlay — transparent, captures the touch on top of WebView */}
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
