<script setup>
import { PlaceSearch, usePlaceSearch } from '@w3geo/vue-place-search';
import View from 'ol/View';
import Map from 'ol/Map';
import 'ol/ol.css';
import LayerGroup from 'ol/layer/Group';
import { apply } from 'ol-mapbox-style';
import { register as registerPMTiles } from 'pmtiles-protocol';
import { useGeographic } from 'ol/proj';

const props = defineProps({ title: { type: String, default: 'Fläche wählen' } });
const mapContainer = ref();

useGeographic();
registerPMTiles();

const agraratlas = new LayerGroup();
apply(agraratlas, '/style.json');

const kataster = new LayerGroup({
  minZoom: 16,
  maxZoom: 18,
});
apply(kataster, 'https://kataster.bev.gv.at/styles/kataster/style_basic.json');

const map = new Map({
  target: mapContainer.value,
  layers: [kataster, agraratlas],
  view: new View({
    center: [13.8, 47.5],
    zoom: 14,
  }),
});

usePlaceSearch(map);

onMounted(async () => {
  await nextTick();
  map.setTarget(mapContainer.value);
  const { data: userData } = await useFetch('/api/users/me');
  const address = userData.value?.address;
  if (address) {
    const value = address.split(', ').reverse().join(' ');

    const { data: locationData } =
      /** @type {ReturnType<typeof useFetch<{data: import('geojson').FeatureCollection<import('geojson').Point>}>>} */ (
        await useFetch(
          `https://kataster.bev.gv.at/api/search/?layers=pg-adr-gn-rn-gst-kg-bl&term=${encodeURIComponent(value)}`,
        )
      );
    const { features } = locationData.value.data;
    if (features.length && features[0].geometry.type === 'Point') {
      const [feature] = features;
      map.getView().animate({ center: feature.geometry.coordinates, zoom: 16, duration: 500 });
    }
  }
});
</script>

<template>
  <v-layout class="d-flex fill-height">
    <v-app-bar
      :title="props.title"
      color="settings.$toolbar-color"
      density="compact"
      flat
      class="pr-1"
      ><v-spacer />
      <div><place-search /></div
    ></v-app-bar>
    <v-main>
      <div ref="mapContainer" class="map" />
    </v-main>
  </v-layout>
</template>

<style scoped>
.map {
  height: 100%;
  width: 100%;
}
</style>
