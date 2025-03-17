import View from 'ol/View';

/** @type {Object<string, View>} */
const views = {};

/**
 * @param {string} login
 * @returns {{ view: View }}
 */
export default function useMapView(login) {
  if (!views[login]) {
    views[login] = new View();
  }
  const view = views[login];
  return { view };
}
