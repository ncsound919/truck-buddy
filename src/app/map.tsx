import { useCallback, useRef, useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { Map, Camera, UserLocation, GeoJSONSource, Layer } from '@maplibre/maplibre-react-native'
import type { CameraRef } from '@maplibre/maplibre-react-native'
import * as Location from 'expo-location'

const MAP_STYLE = process.env.EXPO_PUBLIC_STYLE_URL ?? 'https://tiles.openfreemap.org/styles/liberty'
const POI_API = process.env.EXPO_PUBLIC_POI_API

interface Poi { name: string; lat: number; lon: number; truck: boolean }

async function loadPois(lat: number, lon: number, radiusM = 30000): Promise<Poi[]> {
  if (!POI_API) return []
  const u = `${POI_API}/places?kind=fuel&lat=${lat}&lon=${lon}&radius=${radiusM}`
  const r = await fetch(u)
  const j = await r.json()
  return (Array.isArray(j) ? j : []).map((p: any) => ({
    name: p.name, lat: Number(p.lat), lon: Number(p.lon), truck: Boolean(p.truck),
  }))
}

function poiFc(ps: Poi[]) {
  return {
    type: 'FeatureCollection',
    features: ps.map(p => ({
      type: 'Feature', properties: { name: p.name, tag: p.truck ? 'truck' : 'fuel' },
      geometry: { type: 'Point', coordinates: [p.lon, p.lat] as [number, number] } })),
  }
}

export default function MapScreen() {
  const [status, setStatus] = useState('Tap locate, then load truck stops.')
  const [pois, setPois] = useState<Poi[]>([])
  const camera = useRef<CameraRef>(null)

  const locate = useCallback(async () => {
    const { status: perm } = await Location.requestForegroundPermissionsAsync()
    if (perm !== 'granted') { setStatus('Location permission denied'); return }
    const p = await Location.getLastKnownPositionAsync({}) ?? await Location.getCurrentPositionAsync({})
    camera.current?.easeTo({ center: [p.coords.longitude, p.coords.latitude], zoom: 12, duration: 600 })
  }, [])

  const truckStops = useCallback(async () => {
    if (!POI_API) { setStatus('POI API not configured (EXPO_PUBLIC_POI_API)'); return }
    const { status: perm } = await Location.requestForegroundPermissionsAsync()
    if (perm !== 'granted') { setStatus('Location permission denied'); return }
    setStatus('Loading stations...')
    const p = await Location.getCurrentPositionAsync({})
    const ps = await loadPois(p.coords.latitude, p.coords.longitude)
    setPois(ps)
    const t = ps.filter(x => x.truck).length
    setStatus(`${t} truck stops · ${ps.length - t} fuel`)
  }, [])

  return (
    <View style={s.root}>
      <Map style={s.map} mapStyle={MAP_STYLE}>
        <Camera ref={camera} initialViewState={{ center: [-98.5, 39.8], zoom: 3.2 }} />
        <UserLocation />
        <GeoJSONSource id="pois" data={poiFc(pois) as any}>
          <Layer id="pois-dots" type="circle" paint={{
            'circle-radius': 6,
            'circle-color': ['match', ['get', 'tag'], 'truck', '#0b8043', '#f29900'],
            'circle-stroke-width': 1.5,
            'circle-stroke-color': '#ffffff' }} />
        </GeoJSONSource>
      </Map>
      <View style={s.panel} pointerEvents="box-none">
        <Text style={s.title}>Truck Map</Text>
        <View style={s.row}>
          <Pressable style={s.btn} onPress={locate}><Text style={s.btnTxt}>Locate</Text></Pressable>
          <Pressable style={s.btn} onPress={truckStops}><Text style={s.btnTxt}>Truck stops</Text></Pressable>
        </View>
        <Text style={s.status}>{status}</Text>
      </View>
    </View>
  )
}

const s = StyleSheet.create({
  root: { flex: 1 },
  map: { flex: 1, alignSelf: 'stretch' },
  panel: { position: 'absolute', top: 48, left: 12, right: 12, backgroundColor: '#ffffffee', borderRadius: 10, padding: 12, gap: 8 },
  title: { fontWeight: '700', fontSize: 16, color: '#111' },
  row: { flexDirection: 'row', gap: 8 },
  btn: { backgroundColor: '#208AEF', borderRadius: 8, paddingVertical: 8, paddingHorizontal: 14 },
  btnTxt: { color: '#fff', fontWeight: '600' },
  status: { color: '#333', fontSize: 12 },
})
