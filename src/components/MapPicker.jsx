import {
  MapContainer,
  TileLayer,
  Marker,
  useMapEvents,
  useMap,
} from "react-leaflet";
import { useEffect, useState } from "react";
import L from "leaflet";
import { GeoSearchControl, OpenStreetMapProvider } from "leaflet-geosearch";
import "leaflet-geosearch/dist/geosearch.css";

// Fix Leaflet marker icon path
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.9.3/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.3/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.3/dist/images/marker-shadow.png",
});

// 🔍 Add search functionality
function SearchControl({ setCoords }) {
  const map = useMap();

  useEffect(() => {
    if (!map) return;

    const provider = new OpenStreetMapProvider();

    const searchControl = new GeoSearchControl({
      provider,
      style: "bar",
      autoComplete: true,
      autoCompleteDelay: 250,
      showMarker: true,
      retainZoomLevel: false,
      animateZoom: true,
      keepResult: true,
    });

    map.addControl(searchControl);

    // Prevent Leaflet from hijacking keyboard focus
    map.getContainer().tabIndex = "0"; // necessary if not already focusable
    map.keyboard.disable(); // this is still good

    map.on("geosearch/showlocation", (result) => {
      const { label, location } = result;
      setCoords({
        lat: location.y,
        lng: location.x,
        name: label,
      });
    });

    // 🧠 Optional: Force input to keep focus
    setTimeout(() => {
      const input = document.querySelector(".leaflet-control-geosearch input");
      if (input) input.focus();
    }, 300);

    return () => {
      map.removeControl(searchControl);
    };
  }, []); // <-- empty dependency array!

  return null;
}

// 📍 Clickable marker logic
function LocationMarker({ setCoords }) {
  const [position, setPosition] = useState(null);

  useMapEvents({
    click(e) {
      const { lat, lng } = e.latlng;
      setPosition({ lat, lng });
      setCoords({ lat, lng });
    },
  });

  return position ? <Marker position={[position.lat, position.lng]} /> : null;
}

// 🗺️ Main export
export default function MapPicker({ setCoords }) {
  return (
    <div className="h-64 mb-3">
      <MapContainer
        center={[28.6024, -81.2001]}
        zoom={14}
        style={{ height: "100%", width: "100%" }}
      >
        <TileLayer
          attribution='© <a href="https://osm.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <SearchControl setCoords={setCoords} />
        <LocationMarker setCoords={setCoords} />
      </MapContainer>
    </div>
  );
}
