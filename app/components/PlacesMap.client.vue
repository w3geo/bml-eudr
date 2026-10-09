<script setup>
import { mdiCrosshairsGps, mdiMagnify } from '@mdi/js';
import { PlaceSearch, usePlaceSearch } from '@w3geo/vue-place-search';
import { View } from 'ol';
import VectorLayer from 'ol/layer/Vector.js';
import Map from 'ol/Map';
import 'ol/ol.css';
import { fromLonLat } from 'ol/proj';

const { xs } = useDisplay();
const { errorMessage } = useErrorMessage();

const props = defineProps({
  commodity: {
    type: /** @type {import('vue').PropType<import('~~/shared/utils/constants.js').Commodity>} */ (
      String
    ),
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
/** @type {import('vue').ComputedRef<import('ol/source/Vector.js').default>} */
const geolocationSource = computed(
  () => /** @type {import('ol/source/Vector.js').default} */ (geolocationLayer.value.getSource()),
);
/** @type {Ref<import('ol/layer/Group.js').default|null>} */
const commodityLayer = shallowRef(null);
/** @type {Ref<import('~/utils/layers-sources.client.js').GetFeatureAtPixel|(() => void)>} */
const getFeatureAtPixel = shallowRef(() => {});
const showPlaceSearchMenu = ref(false);

/**
 * Zoom level from which the commodity's selectable features are rendered: the
 * agraratlas Schläge and Hofstellen tiles start at 12, the Kataster Wald layer at 14.
 */
const featuresMinZoom = computed(() => (props.commodity === 'holz' ? 14 : 12));
const featuresHint = computed(() =>
  props.commodity === 'holz'
    ? 'Waldflächen'
    : props.commodity === 'rind'
      ? 'Flächen und Hofstellen'
      : 'Flächen',
);
/** Whether the map is zoomed out too far to show the commodity's features */
const zoomedOut = ref(false);
/** Whether the user closed the zoom hint, until they zoom in far enough */
const zoomHintDismissed = ref(false);
const showZoomHint = computed({
  get: () => zoomedOut.value && !zoomHintDismissed.value,
  set: (value) => {
    zoomHintDismissed.value = !value;
  },
});
function updateZoomedOut() {
  const zoom = map.getView().getZoom();
  zoomedOut.value = zoom !== undefined && zoom < featuresMinZoom.value;
  if (!zoomedOut.value) {
    zoomHintDismissed.value = false;
  }
}
watch(featuresMinZoom, updateZoomedOut);

const mapContainer = ref();

const { user } = useUserSession();
const login = user.value?.login;

const fields = (await useFetch('/api/lfbis?layer=fields')).data.value;
const farms = (await useFetch('/api/lfbis?layer=farms')).data.value;

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
    const commodityLayerset = createCommodityLayerset(newValue, farms, fields);
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
    updateZoomedOut();
    map.on('moveend', updateZoomedOut);
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
  const addressParts = props.address ? parseAddress(props.address) : null;
  // Same order as the search result names ("3424 Zeiselmauer-Wolfpassing Rosengasse 7"); street
  // first finds nothing for some addresses
  const address = addressParts
    ? `${addressParts.postalCode} ${addressParts.city} ${addressParts.street}`
    : undefined;
  /** @type {import('ol/View.js').AnimationOptions|null} */
  let animation = null;
  try {
    const locationData = address
      ? $fetch(
          `https://kataster.bev.gv.at/api/search/?layers=pg-adr-gn-rn-gst-kg-bl&term=${encodeURIComponent(address)}`,
        )
      : null;
    const { features } = locationData
      ? /** @type {{data: import('geojson').FeatureCollection<import('geojson').Point>}} */ (
          await locationData
        ).data
      : { features: null };
    // The search returns fuzzy matches anywhere in Austria (e.g. "Hartmanngasse 4, 1050 Wien"
    // for "Hart 4 5321 Pischelsdorf"), so only trust a single result
    const feature =
      features?.length === 1 && features[0]?.geometry.type === 'Point' ? features[0] : undefined;
    if (feature) {
      animation = { center: fromLonLat(feature.geometry.coordinates), zoom: 16, duration: 500 };
    }
  } finally {
    // Without a known address, stay at the full extent; the zoom hint tells the user how to
    // get to their fields
    if (animation) {
      view.animate(animation);
    } else {
      updateZoomedOut();
    }
    map.on('moveend', updateZoomedOut);
    map.once('rendercomplete', () => {
      mapContainer.value.classList.remove('spinner');
    });
  }
});

function locateMe() {
  mapContainer.value.classList.add('spinner');
  navigator.geolocation.getCurrentPosition(
    (position) => {
      const center = fromLonLat([position.coords.longitude, position.coords.latitude]);
      map.getView().animate({ center, zoom: 18, duration: 500 });
      mapContainer.value.classList.remove('spinner');
    },
    (error) => {
      // Error (e.g., permission denied)
      errorMessage.value = `Position konnte nicht ermittelt werden: ${error.message}`;
      mapContainer.value.classList.remove('spinner');
    },
    { enableHighAccuracy: true },
  );
}
</script>

<template>
  <v-layout>
    <v-app-bar density="compact" flat class="pr-1">
      <map-tools
        :map="map"
        :get-feature-at-pixel="getFeatureAtPixel"
        :geolocation-source="geolocationSource"
        :commodity="props.commodity"
      />
      <v-spacer />
      <action-tooltip>
        <template #activator="{ props: on }">
          <v-btn flat :icon="mdiCrosshairsGps" v-bind="on" @click="locateMe" />
        </template>
        Auf meinen Standort zentrieren
      </action-tooltip>
      <place-search v-if="!xs" />
      <v-menu
        v-else
        v-model="showPlaceSearchMenu"
        :close-on-content-click="false"
        :offset="[-48, -48]"
      >
        <template #activator="{ props: menu }">
          <action-tooltip v-bind="menu">
            <template #activator="{ props: on }">
              <v-btn
                flat
                :icon="mdiMagnify"
                v-bind="on"
                @click="showPlaceSearchMenu = !showPlaceSearchMenu"
              />
            </template>
            Ortssuche
          </action-tooltip>
        </template>
        <v-list class="pa-0">
          <v-list-item class="pa-0">
            <place-search />
          </v-list-item>
        </v-list>
      </v-menu>
    </v-app-bar>
    <v-main>
      <div ref="mapContainer" class="fill-height" />
      <v-snackbar v-model="showZoomHint" timeout="-1">
        Um {{ featuresHint }} zu sehen, vergrößern Sie die Karte, verwenden Sie die Ortssuche oder
        zentrieren Sie auf Ihren Standort.
        <template #actions>
          <v-btn variant="text" @click="showZoomHint = false">OK</v-btn>
        </template>
      </v-snackbar>
    </v-main>
  </v-layout>
</template>

<style scoped>
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
