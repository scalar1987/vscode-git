import { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Center, CenterStatus } from '../types/center';
import { CenterDetailPanel } from '../components/CenterDetailPanel';
import styles from './CentersMap.module.css';

// Fix for default marker icons in Leaflet with webpack/vite
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

// Status colors
const STATUS_COLORS: Record<CenterStatus, string> = {
  'Operational': '#2E7D32',      // Green
  'Non-Operational': '#9CA3AF',  // Gray
};

// Custom marker icons
const createCustomIcon = (status: CenterStatus) => {
  const color = STATUS_COLORS[status];
  return L.divIcon({
    className: 'custom-marker',
    html: `
      <svg width="32" height="40" viewBox="0 0 32 40" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M16 0C7.164 0 0 7.164 0 16c0 12 16 24 16 24s16-12 16-24c0-8.836-7.164-16-16-16z" fill="${color}"/>
        <circle cx="16" cy="14" r="6" fill="white"/>
      </svg>
    `,
    iconSize: [32, 40],
    iconAnchor: [16, 40],
    popupAnchor: [0, -40],
  });
};

// Côte d'Ivoire center coordinates
const COTE_DIVOIRE_CENTER: [number, number] = [7.54, -5.55];
const DEFAULT_ZOOM = 7;

// Component to handle zoom controls positioning
function ZoomControl() {
  const map = useMap();

  useEffect(() => {
    map.zoomControl.setPosition('topright');
  }, [map]);

  return null;
}

export function CentersMap() {
  const [centers, setCenters] = useState<Center[]>([]);
  const [selectedCenter, setSelectedCenter] = useState<Center | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/centers.json')
      .then((res) => {
        if (!res.ok) {
          throw new Error(`HTTP error! status: ${res.status}`);
        }
        return res.json();
      })
      .then((data) => {
        setCenters(data);
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
      });
  }, []);

  const operationalCount = centers.filter(c => c.status === 'Operational').length;
  const nonOperationalCount = centers.filter(c => c.status === 'Non-Operational').length;

  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.loadingSpinner} />
        <p>Loading map...</p>
      </div>
    );
  }

  return (
    <div className={styles.mapPage}>
      <div className={styles.mapHeader}>
        <h1 className={styles.title}>DigiGreen Centers</h1>
        <p className={styles.subtitle}>
          Interactive map of {centers.length} DigiGreen Youth Centers across Côte d'Ivoire
        </p>
      </div>

      <div className={styles.legendBar}>
        <div className={styles.legendItem}>
          <span className={`${styles.legendDot} ${styles.operational}`} />
          <span>Operational ({operationalCount})</span>
        </div>
        <div className={styles.legendItem}>
          <span className={`${styles.legendDot} ${styles.nonOperational}`} />
          <span>Non-Operational ({nonOperationalCount})</span>
        </div>
      </div>

      <div className={styles.mapContainer}>
        <MapContainer
          center={COTE_DIVOIRE_CENTER}
          zoom={DEFAULT_ZOOM}
          className={styles.map}
          zoomControl={true}
          scrollWheelZoom={true}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <ZoomControl />

          {centers.map((center) => (
            <Marker
              key={center.id}
              position={center.coordinates}
              icon={createCustomIcon(center.status)}
              eventHandlers={{
                click: () => setSelectedCenter(center),
                mouseover: (e) => {
                  e.target.openPopup();
                },
                mouseout: (e) => {
                  e.target.closePopup();
                },
              }}
            >
              <Popup>
                <div className={styles.popupContent}>
                  <strong>{center.name}</strong>
                  <br />
                  <span className={styles.popupType}>{center.type}</span>
                  <br />
                  <span
                    className={styles.popupStatus}
                    style={{ color: STATUS_COLORS[center.status] }}
                  >
                    {center.status} • {center.phase}
                  </span>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>

      <CenterDetailPanel
        center={selectedCenter}
        onClose={() => setSelectedCenter(null)}
      />
    </div>
  );
}
