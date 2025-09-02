<script setup>
import { PlaceSearch, usePlaceSearch } from '@w3geo/vue-place-search';
import { View } from 'ol';
import { getCenter } from 'ol/extent';
import VectorLayer from 'ol/layer/Vector.js';
import Map from 'ol/Map';
import 'ol/ol.css';
import { fromLonLat } from 'ol/proj';

const props = defineProps({
  commodity: {
    type: /** @type {import('vue').PropType<import('~/utils/constants.js').Commodity>} */ (String),
    required: true,
  },
  address: {
    type: String,
    default: undefined,
  },
});

const backgroundKatasterLayer = createBackgroundKatasterLayer();

/** @type {Ref<import('ol/layer/Vector.js').default>} */
const geolocationLayer = shallowRef(new VectorLayer());
/** @type {Ref<import('ol/layer/Group.js').default|null>} */
const commodityLayer = shallowRef(null);
/** @type {Ref<import('~/utils/layers-sources.client.js').GetFeatureAtPixel|(() => void)>} */
const getFeatureAtPixel = shallowRef(() => {});

const mapContainer = ref();

const { user } = useUserSession();
const login = user.value?.login;

const map = new Map({
  target: mapContainer.value,
  layers: [backgroundKatasterLayer],
  view: new View(login ? { ...useMapView().view.value } : undefined),
});

watch(
  () => props.commodity,
  (newValue) => {
    if (commodityLayer.value && geolocationLayer.value) {
      map.removeLayer(commodityLayer.value);
      map.removeLayer(geolocationLayer.value);
      geolocationLayer.value.getSource()?.dispose();
    }
    const commodityLayerset = createCommodityLayerset(newValue);
    const { geojson } = useStatement(newValue);
    geolocationLayer.value = new VectorLayer({ source: createGeolocationSource(geojson) });
    commodityLayer.value = commodityLayerset.layerGroup;
    getFeatureAtPixel.value = commodityLayerset.getFeatureAtPixel;
    map.addLayer(commodityLayer.value);
    map.addLayer(geolocationLayer.value);
  },
  { immediate: true },
);

usePlaceSearch(map);

const extent = [...fromLonLat([9.530952, 46.372276]), ...fromLonLat([17.160776, 49.020608])];
onMounted(async () => {
  await nextTick();
  map.setTarget(mapContainer.value);
  const view = map.getView();
  if (view.isDef()) {
    return;
  }
  view.on('change', () => {
    useMapView().view.value = {
      center: view.getCenter(),
      zoom: view.getZoom(),
      rotation: view.getRotation(),
    };
  });
  view.fit(extent, { size: map.getSize(), maxZoom: 10, padding: [20, 20, 20, 20] });
  mapContainer.value.classList.add('spinner');
  const address = props.address;
  const value = address?.split(', ').reverse().join(' ');
  const animation = { center: getCenter(extent), zoom: 13, duration: 500 };
  try {
    const locationData = value
      ? $fetch(
          `https://kataster.bev.gv.at/api/search/?layers=pg-adr-gn-rn-gst-kg-bl&term=${encodeURIComponent(value)}`,
        )
      : null;
    const { features } = locationData
      ? /** @type {{data: import('geojson').FeatureCollection<import('geojson').Point>}} */ (
          await locationData
        ).data
      : { features: null };
    if (features?.[0] && features[0].geometry.type === 'Point') {
      const [feature] = features;
      animation.center = fromLonLat(feature.geometry.coordinates);
      animation.zoom = 16;
    }
  } finally {
    view.animate(animation);
    map.once('rendercomplete', () => {
      mapContainer.value.classList.remove('spinner');
    });
  }
});
</script>

<template>
  <v-layout class="d-flex fill-height">
    <v-app-bar color="settings.$toolbar-color" density="compact" flat class="pr-1">
      <div>
        <map-tools
          :map="map"
          :get-feature-at-pixel="getFeatureAtPixel"
          :geolocation-source="geolocationLayer.getSource() || undefined"
          :commodity="props.commodity"
        />
      </div>
      <v-spacer />
      <div>
        <place-search />
      </div>
    </v-app-bar>
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
@keyframes spinner {
  to {
    transform: rotate(360deg);
  }
}

.spinner:after {
  content: '';
  box-sizing: border-box;
  position: absolute;
  top: 50%;
  left: 50%;
  width: 40px;
  height: 40px;
  margin-top: -20px;
  margin-left: -20px;
  border-radius: 50%;
  border: 5px solid rgba(180, 180, 180, 0.6);
  border-top-color: rgba(0, 0, 0, 0.6);
  animation: spinner 0.6s linear infinite;
}
</style>
