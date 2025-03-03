/** @type {import('vue').Ref<import('ol/format/GeoJSON').GeoJSONFeatureCollection>} */
const geolocation = shallowRef({ type: 'FeatureCollection', features: [] });
const area = computed(() => {
  return toPrecision(
    geolocation.value.features.reduce((acc, feature) => {
      return acc + feature.properties?.Area || 0;
    }, 0),
    4,
  );
});

export const useStatement = () => ({
  area,
  geolocation,
});
