/**
 * @returns {{ view: Ref<import('ol/View').ViewOptions> }}
 */
export default function useMapView() {
  const view = useState('mapView', () => ({}));
  return { view };
}
