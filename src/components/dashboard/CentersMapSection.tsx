import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { motion } from 'framer-motion';
import {
  MapPin,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  Search,
  ChevronDown,
} from 'lucide-react';

import { CENTER_STATUSES, CENTER_STATUS_COLORS, type CenterStatus } from '../../types/center';

// Types
type CenterType = 'University' | 'School' | 'Mairie';

interface CenterCoordinator {
  name: string;
  phone: string;
  email: string;
}

interface TrainingData {
  basic_ict_green?: {
    status: string;
    school_students: {
      enrolled: number;
      completed: number;
      passed_assessment: number;
      targets: Record<string, number>;
      passed_targets: Record<string, number>;
      by_year: Record<string, { enrolled: number; completed: number; passed: number }>;
    };
    university_students: {
      enrolled: number;
      completed: number;
      targets: Record<string, number>;
    };
  };
  advanced_ict_green?: {
    status: string;
    targets: Record<string, number>;
    passed_targets: Record<string, number>;
    by_year: Record<string, { enrolled: number; completed: number; passed: number }>;
  };
}

interface Infrastructure {
  overall_status: string;
  renovation: {
    status: string;
    completion_percentage: number;
    scheduled_completion_date: string;
    progress_notes: string;
    issues: Array<{ issue: string; impact: string }>;
  };
  equipment: {
    status: string;
    completion_percentage: number;
    items: Array<{ item: string; status: string; quantity_installed: number; total_quantity: number }>;
  };
}

interface Center {
  id: string;
  name: string;
  type: CenterType;
  coordinates: [number, number];
  region: string;
  status: CenterStatus;
  phase: string;
  students: number | string;
  computers: number;
  target_basic_ict: number;
  ongoing_programs: string[];
  linkedActivities: string[];
  note: string;
  center_coordinators?: CenterCoordinator[];
  infrastructure?: Infrastructure;
  training?: TrainingData;
  greenpreneur?: Record<string, any>;
  metadata?: Record<string, any>;
}

// Fix for default marker icons in Leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

// Status colors
const STATUS_COLORS = CENTER_STATUS_COLORS;

// Custom marker icons with pulse animation for operational centers
const createCustomIcon = (status: CenterStatus, isSelected: boolean = false) => {
  const color = STATUS_COLORS[status];
  const isOperational = status === 'Operational';
  const size = isSelected ? 40 : 32;
  const pulseRing = isOperational && !isSelected ? `
    <circle cx="${(size + 24)/2}" cy="18" r="${size/2 + 4}" fill="none" stroke="${color}" stroke-width="2" opacity="0.3">
      <animate attributeName="r" from="${size/2}" to="${size/2 + 12}" dur="1.5s" repeatCount="indefinite"/>
      <animate attributeName="opacity" from="0.6" to="0" dur="1.5s" repeatCount="indefinite"/>
    </circle>
  ` : '';

  return L.divIcon({
    className: 'custom-marker',
    html: `
      <svg width="${size + 24}" height="${size + 16}" viewBox="0 0 ${size + 24} ${size + 16}" fill="none" xmlns="http://www.w3.org/2000/svg">
        ${pulseRing}
        <g filter="url(#shadow)">
          <path d="M${(size + 24)/2} 4C${(size + 24)/2 - 10} 4 ${(size + 24)/2 - 16} 10 ${(size + 24)/2 - 16} 20c0 14 16 ${size - 8} 16 ${size - 8}s16-${size - 22} 16-${size - 8}c0-10-6-16-16-16z" fill="${color}" stroke="white" stroke-width="2"/>
          <circle cx="${(size + 24)/2}" cy="18" r="5" fill="white"/>
        </g>
        <defs>
          <filter id="shadow" x="0" y="0" width="${size + 24}" height="${size + 16}" filterUnits="userSpaceOnUse">
            <feDropShadow dx="0" dy="2" stdDeviation="2" flood-color="#000" flood-opacity="0.2"/>
          </filter>
        </defs>
      </svg>
    `,
    iconSize: [size + 24, size + 16],
    iconAnchor: [(size + 24) / 2, size + 12],
    popupAnchor: [0, -(size + 8)],
  });
};

// Côte d'Ivoire center coordinates
const COTE_DIVOIRE_CENTER: [number, number] = [7.54, -5.55];
const DEFAULT_ZOOM = 7;

// Map zoom controls component
function MapControls() {
  const map = useMap();

  return (
    <div className="absolute top-4 right-4 z-[1000] flex flex-col gap-2">
      <button
        onClick={() => map.zoomIn()}
        className="w-10 h-10 bg-white rounded-lg shadow-md flex items-center justify-center text-gray-600 hover:bg-gray-50 hover:text-dg-green-600 transition-colors"
        aria-label="Zoom in"
      >
        <ZoomIn className="w-5 h-5" />
      </button>
      <button
        onClick={() => map.zoomOut()}
        className="w-10 h-10 bg-white rounded-lg shadow-md flex items-center justify-center text-gray-600 hover:bg-gray-50 hover:text-dg-green-600 transition-colors"
        aria-label="Zoom out"
      >
        <ZoomOut className="w-5 h-5" />
      </button>
    </div>
  );
}

// Type icons mapping

// Main Component
interface CentersMapSectionProps {
  centers: Center[];
  loading?: boolean;
}

export function CentersMapSection({ centers, loading = false }: CentersMapSectionProps) {
  const navigate = useNavigate();
  const [hoveredCenterId, setHoveredCenterId] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState<'all' | CenterType>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | CenterStatus>('all');
  const [query, setQuery] = useState('');
  const [listOpen, setListOpen] = useState(false);
  const activeFilterCount = (typeFilter !== 'all' ? 1 : 0) + (statusFilter !== 'all' ? 1 : 0);

  const filteredCenters = centers
    .filter(c => typeFilter === 'all' || c.type === typeFilter)
    .filter(c => statusFilter === 'all' || c.status === statusFilter)
    .filter(c => c.name.toLowerCase().includes(query.trim().toLowerCase()))
    .sort((a, b) => a.name.localeCompare(b.name));

  const statusCounts = Object.fromEntries(
    CENTER_STATUSES.map(s => [s, centers.filter(c => c.status === s).length]),
  ) as Record<CenterStatus, number>;
  const operationalCount = statusCounts['Operational'];

  // Stats calculations
  const centerStats = {
    total: centers.length,
    operational: operationalCount,
    phaseI: centers.filter(c => c.phase === 'Phase I').length,
    phaseII: centers.filter(c => c.phase === 'Phase II').length,
    universities: centers.filter(c => c.type === 'University').length,
    schools: centers.filter(c => c.type === 'School').length,
    mairies: centers.filter(c => c.type === 'Mairie').length,
    regions: [...new Set(centers.map(c => c.region))].length,
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {/* Map skeleton */}
        <div className="bg-gray-100 rounded-2xl h-[400px] animate-pulse flex items-center justify-center">
          <MapPin className="w-12 h-12 text-gray-300" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 flex flex-col gap-3">
        <div className="text-sm font-medium text-gray-700">
          Filters{activeFilterCount > 0 ? ` (${activeFilterCount})` : ''}
        </div>
        <div className="flex flex-col gap-3">
        <div className="flex flex-wrap gap-2">
          {[
            { value: 'all', label: 'All types', count: centers.length },
            { value: 'University', label: 'Universities', count: centerStats.universities },
            { value: 'School', label: 'Schools', count: centerStats.schools },
            { value: 'Mairie', label: 'Mairies', count: centerStats.mairies },
          ].map(opt => (
            <button
              key={opt.value}
              onClick={() => setTypeFilter(opt.value as 'all' | CenterType)}
              className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
                typeFilter === opt.value
                  ? 'bg-dg-green-600 text-white border-dg-green-600'
                  : 'bg-white text-gray-700 border-gray-200 hover:border-dg-green-400'
              }`}
            >
              {opt.label} <span className="opacity-75">({opt.count})</span>
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          {[
            { value: 'all', label: 'All status', count: centers.length },
            ...CENTER_STATUSES.map(s => ({ value: s, label: s, count: statusCounts[s] })),
          ].map(opt => (
            <button
              key={opt.value}
              onClick={() => setStatusFilter(opt.value as 'all' | CenterStatus)}
              className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
                statusFilter === opt.value
                  ? 'bg-dg-blue-600 text-white border-dg-blue-600'
                  : 'bg-white text-gray-700 border-gray-200 hover:border-dg-blue-400'
              }`}
            >
              {opt.label} <span className="opacity-75">({opt.count})</span>
            </button>
          ))}
        </div>
        </div>
      </div>

      <div>
      {/* Centers search bar (between filters and map) */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 mb-6">
        <div className="p-3 flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={query}
              onChange={e => { setQuery(e.target.value); setListOpen(true); }}
              onClick={() => setListOpen(true)}
              onKeyDown={e => { if (e.key === 'Escape') setListOpen(false); }}
              placeholder="Search centers"
              className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-dg-green-500"
            />
          </div>
          <span className="text-xs text-gray-500 whitespace-nowrap">
            {filteredCenters.length} of {centers.length} centers
          </span>
          <button
            onClick={() => setListOpen(o => !o)}
            aria-label={listOpen ? 'Collapse center list' : 'Expand center list'}
            className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 flex-shrink-0"
          >
            <ChevronDown className={`w-4 h-4 transition-transform ${listOpen ? 'rotate-180' : ''}`} />
          </button>
        </div>
        {listOpen && (
          <ul className="max-h-72 overflow-y-auto divide-y divide-gray-100 border-t border-gray-100">
            {filteredCenters.map(center => (
              <li key={center.id}>
                <button
                  onClick={() => navigate(`/centers/${center.id}`)}
                  onMouseEnter={() => setHoveredCenterId(center.id)}
                  onMouseLeave={() => setHoveredCenterId(null)}
                  className="w-full text-left px-4 py-2.5 hover:bg-gray-50 transition-colors flex items-center gap-3"
                >
                  <span
                    className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                    style={{ backgroundColor: STATUS_COLORS[center.status] }}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-900 truncate">{center.name}</p>
                    <p className="text-xs text-gray-500">
                      {center.type} · {center.region} · {center.phase} · {center.status}
                    </p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
                </button>
              </li>
            ))}
            {filteredCenters.length === 0 && (
              <li className="px-4 py-6 text-center text-sm text-gray-500">No centers match these filters</li>
            )}
          </ul>
        )}
      </div>

      {/* Map Container (full width) */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.45 }}
        className="relative bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden"
      >
        {/* Map */}
        <div className="h-[450px] md:h-[500px]">
          <MapContainer
            center={COTE_DIVOIRE_CENTER}
            zoom={DEFAULT_ZOOM}
            className="w-full h-full"
            zoomControl={false}
            scrollWheelZoom={true}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <MapControls />

            {filteredCenters.map((center) => (
              <Marker
                key={center.id}
                position={center.coordinates}
                icon={createCustomIcon(center.status, hoveredCenterId === center.id)}
                eventHandlers={{
                  click: () => navigate(`/centers/${center.id}`),
                  mouseover: (e) => {
                    setHoveredCenterId(center.id);
                    e.target.openPopup();
                  },
                  // Popup stays open after the pointer leaves; Leaflet closes the previous one when another opens
                  mouseout: () => {
                    setHoveredCenterId(null);
                  },
                }}
              >
                <Popup>
                  <div className="text-center min-w-[180px]">
                    <p className="font-semibold text-gray-900 text-sm mb-1">{center.name}</p>
                    <p className="text-xs text-gray-500 uppercase tracking-wide mb-2">{center.type}</p>
                    <div className="flex items-center justify-center gap-1.5 mb-3">
                      <span
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: STATUS_COLORS[center.status] }}
                      />
                      <span
                        className="text-xs font-medium"
                        style={{ color: STATUS_COLORS[center.status] }}
                      >
                        {center.status}
                      </span>
                      <span className="text-gray-300 mx-1">•</span>
                      <span className="text-xs text-gray-500">{center.phase}</span>
                    </div>
                    <button
                      onClick={() => navigate(`/centers/${center.id}`)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 bg-dg-green-600 hover:bg-dg-green-700 text-white text-xs font-medium rounded-lg transition-colors"
                    >
                      View Details
                      <ChevronRight className="w-3 h-3" />
                    </button>
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        </div>
      </motion.div>
      </div>
    </div>
  );
}
