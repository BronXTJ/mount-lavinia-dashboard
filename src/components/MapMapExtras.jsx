import MapInvalidateOnResize from './MapInvalidateOnResize.jsx'
import MapContextMenuCoordinates from './map/MapContextMenuCoordinates.jsx'

/** Standard children for every MapContainer (resize + right-click coordinates). */
export default function MapMapExtras() {
  return (
    <>
      <MapInvalidateOnResize />
      <MapContextMenuCoordinates />
    </>
  )
}
