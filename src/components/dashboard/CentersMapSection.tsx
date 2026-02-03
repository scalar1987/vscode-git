import { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MapPin,
  Building2,
  GraduationCap,
  Briefcase,
  Users,
  Monitor,
  Target,
  BookOpen,
  X,
  ChevronRight,
  CheckCircle2,
  Clock,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';

// Types
type CenterStatus = 'Operational' | 'Non-Operational';
type CenterType = 'University' | 'School' | 'Mairie';

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
}

// Fix for default marker icons in Leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

// Status colors
const STATUS_COLORS: Record<CenterStatus, string> = {
  'Operational': '#16a34a',
  'Non-Operational': '#9CA3AF',
};

// Custom marker icons with pulse animation for operational centers
const createCustomIcon = (status: CenterStatus, isSelected: boolean = false) => {
  const color = STATUS_COLORS[status];
  const isOperational = status === 'Operational';
  const size = isSelected ? 40 : 32;
  const pulseRing = isOperational && !isSelected ? `
    <circle cx="${size/2}" cy="${size/2 - 4}" r="${size/2 + 4}" fill="none" stroke="${color}" stroke-width="2" opacity="0.3">
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
const TYPE_ICONS: Record<CenterType, React.ReactNode> = {
  'University': <GraduationCap className="w-6 h-6" />,
  'School': <Building2 className="w-6 h-6" />,
  'Mairie': <Briefcase className="w-6 h-6" />,
};

// Center Detail Panel Component
function CenterDetailPanel({
  center,
  onClose
}: {
  center: Center | null;
  onClose: () => void;
}) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  if (!center) return null;

  const statusColor = STATUS_COLORS[center.status];
  const isOperational = center.status === 'Operational';

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[1001]"
        onClick={onClose}
      >
        <motion.div
          ref={panelRef}
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="absolute right-0 top-0 h-full w-full max-w-md bg-white shadow-2xl overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header with gradient */}
          <div
            className="relative p-6 pb-16"
            style={{
              background: `linear-gradient(135deg, ${statusColor}15 0%, ${statusColor}05 100%)`
            }}
          >
            <button
              onClick={onClose}
              className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/80 backdrop-blur-sm flex items-center justify-center text-gray-500 hover:text-gray-700 hover:bg-white transition-all shadow-sm"
              aria-label="Close panel"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-start gap-4">
              <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg"
                style={{ backgroundColor: statusColor, color: 'white' }}
              >
                {TYPE_ICONS[center.type]}
              </div>
              <div className="flex-1 min-w-0">
                <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {center.type}
                </span>
                <h2 className="text-xl font-bold text-gray-900 leading-tight mt-1">
                  {center.name}
                </h2>
                <div className="flex items-center gap-2 mt-2">
                  <span
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold"
                    style={{
                      backgroundColor: `${statusColor}20`,
                      color: statusColor
                    }}
                  >
                    {isOperational ? (
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    ) : (
                      <Clock className="w-3.5 h-3.5" />
                    )}
                    {center.status}
                  </span>
                  <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                    {center.phase}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="p-6 -mt-8">
            {/* Stats Grid */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 mb-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-3 rounded-xl bg-gradient-to-br from-dg-green-50 to-white">
                  <Users className="w-6 h-6 mx-auto text-dg-green-600 mb-2" />
                  <p className="text-2xl font-bold text-gray-900">
                    {typeof center.students === 'number'
                      ? center.students.toLocaleString()
                      : center.students}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">Students</p>
                </div>
                <div className="text-center p-3 rounded-xl bg-gradient-to-br from-dg-blue-50 to-white">
                  <Monitor className="w-6 h-6 mx-auto text-dg-blue-600 mb-2" />
                  <p className="text-2xl font-bold text-gray-900">{center.computers}</p>
                  <p className="text-xs text-gray-500 mt-0.5">Computers</p>
                </div>
                <div className="text-center p-3 rounded-xl bg-gradient-to-br from-dg-amber-50 to-white">
                  <Target className="w-6 h-6 mx-auto text-dg-amber-600 mb-2" />
                  <p className="text-2xl font-bold text-gray-900">
                    {center.target_basic_ict > 0
                      ? center.target_basic_ict.toLocaleString()
                      : 'N/A'}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">ICT Target</p>
                </div>
                <div className="text-center p-3 rounded-xl bg-gradient-to-br from-purple-50 to-white">
                  <BookOpen className="w-6 h-6 mx-auto text-purple-600 mb-2" />
                  <p className="text-2xl font-bold text-gray-900">{center.ongoing_programs.length}</p>
                  <p className="text-xs text-gray-500 mt-0.5">Programs</p>
                </div>
              </div>
            </div>

            {/* Info rows */}
            <div className="space-y-3 mb-6">
              <div className="flex justify-between items-center py-3 border-b border-gray-100">
                <span className="text-sm text-gray-500">Region</span>
                <span className="text-sm font-medium text-gray-900">{center.region}</span>
              </div>
              <div className="flex justify-between items-center py-3 border-b border-gray-100">
                <span className="text-sm text-gray-500">Coordinates</span>
                <span className="text-xs font-mono text-gray-500 bg-gray-50 px-2 py-1 rounded">
                  {center.coordinates[0].toFixed(4)}, {center.coordinates[1].toFixed(4)}
                </span>
              </div>
            </div>

            {/* Programs */}
            <div className="mb-6">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                Ongoing Programs
              </h3>
              {center.ongoing_programs.length > 0 ? (
                <div className="space-y-2">
                  {center.ongoing_programs.map((program, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl"
                    >
                      <div className="w-2 h-2 rounded-full bg-dg-green-500 flex-shrink-0" />
                      <span className="text-sm text-gray-700">{program}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-400 italic">No programs assigned yet</p>
              )}
            </div>

            {/* Notes */}
            <div>
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                Notes
              </h3>
              <div className="p-4 bg-gradient-to-br from-gray-50 to-white rounded-xl border border-gray-100">
                <p className="text-sm text-gray-700 leading-relaxed">{center.note}</p>
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

// Main Component
interface CentersMapSectionProps {
  centers: Center[];
  loading?: boolean;
}

export function CentersMapSection({ centers, loading = false }: CentersMapSectionProps) {
  const [selectedCenter, setSelectedCenter] = useState<Center | null>(null);
  const [hoveredCenterId, setHoveredCenterId] = useState<string | null>(null);

  const operationalCount = centers.filter(c => c.status === 'Operational').length;
  const nonOperationalCount = centers.filter(c => c.status === 'Non-Operational').length;

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
        {/* Stats skeleton */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-white rounded-xl p-5 animate-pulse">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 bg-gray-200 rounded-lg" />
                <div className="h-8 bg-gray-200 rounded w-12" />
              </div>
              <div className="h-4 bg-gray-200 rounded w-20" />
            </div>
          ))}
        </div>
        {/* Map skeleton */}
        <div className="bg-gray-100 rounded-2xl h-[400px] animate-pulse flex items-center justify-center">
          <MapPin className="w-12 h-12 text-gray-300" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Total Centers */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 hover:shadow-md transition-shadow"
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-dg-green-100 flex items-center justify-center">
              <Building2 className="w-5 h-5 text-dg-green-600" />
            </div>
            <span className="text-3xl font-bold text-gray-900">{centerStats.total}</span>
          </div>
          <p className="text-sm text-gray-600">Total Centers</p>
        </motion.div>

        {/* Operational */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 hover:shadow-md transition-shadow"
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5 text-green-600" />
            </div>
            <span className="text-3xl font-bold text-green-600">{centerStats.operational}</span>
          </div>
          <p className="text-sm text-gray-600">Operational</p>
          <div className="mt-2 h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${(centerStats.operational / centerStats.total) * 100}%` }}
              transition={{ duration: 0.8, delay: 0.3 }}
              className="h-full bg-green-500 rounded-full"
            />
          </div>
        </motion.div>

        {/* Phase Breakdown */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 hover:shadow-md transition-shadow"
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-dg-blue-100 flex items-center justify-center">
              <Clock className="w-5 h-5 text-dg-blue-600" />
            </div>
            <div className="flex gap-2 items-baseline">
              <span className="text-2xl font-bold text-gray-900">{centerStats.phaseI}</span>
              <span className="text-gray-400">/</span>
              <span className="text-lg text-gray-500">{centerStats.phaseII}</span>
            </div>
          </div>
          <p className="text-sm text-gray-600">Phase I / Phase II</p>
        </motion.div>

        {/* Regions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 hover:shadow-md transition-shadow"
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-dg-amber-100 flex items-center justify-center">
              <MapPin className="w-5 h-5 text-dg-amber-600" />
            </div>
            <span className="text-3xl font-bold text-gray-900">{centerStats.regions}</span>
          </div>
          <p className="text-sm text-gray-600">Regions Covered</p>
        </motion.div>
      </div>

      {/* Center Type Breakdown */}
      <div className="grid grid-cols-3 gap-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3 }}
          className="bg-gradient-to-br from-dg-green-50 to-white rounded-xl p-4 border border-dg-green-100"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Universities</p>
              <p className="text-2xl font-bold text-dg-green-700">{centerStats.universities}</p>
            </div>
            <GraduationCap className="w-8 h-8 text-dg-green-300" />
          </div>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.35 }}
          className="bg-gradient-to-br from-dg-blue-50 to-white rounded-xl p-4 border border-dg-blue-100"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Schools</p>
              <p className="text-2xl font-bold text-dg-blue-700">{centerStats.schools}</p>
            </div>
            <Building2 className="w-8 h-8 text-dg-blue-300" />
          </div>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.4 }}
          className="bg-gradient-to-br from-dg-amber-50 to-white rounded-xl p-4 border border-dg-amber-100"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Mairies</p>
              <p className="text-2xl font-bold text-dg-amber-700">{centerStats.mairies}</p>
            </div>
            <Briefcase className="w-8 h-8 text-dg-amber-300" />
          </div>
        </motion.div>
      </div>

      {/* Map Container */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.45 }}
        className="relative bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden"
      >
        {/* Legend */}
        <div className="absolute top-4 left-4 z-[1000] flex gap-4 bg-white/95 backdrop-blur-sm rounded-xl px-4 py-3 shadow-lg">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-green-500 shadow-sm" />
            <span className="text-sm font-medium text-gray-700">
              Operational ({operationalCount})
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-gray-400 shadow-sm" />
            <span className="text-sm font-medium text-gray-700">
              Non-Operational ({nonOperationalCount})
            </span>
          </div>
        </div>

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
              attribution='&copy; <a href="https://carto.com/">CARTO</a>'
              url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
            />
            <MapControls />

            {centers.map((center) => (
              <Marker
                key={center.id}
                position={center.coordinates}
                icon={createCustomIcon(center.status, hoveredCenterId === center.id)}
                eventHandlers={{
                  click: () => setSelectedCenter(center),
                  mouseover: (e) => {
                    setHoveredCenterId(center.id);
                    e.target.openPopup();
                  },
                  mouseout: (e) => {
                    setHoveredCenterId(null);
                    e.target.closePopup();
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
                      onClick={() => setSelectedCenter(center)}
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

      {/* Center Detail Panel */}
      <CenterDetailPanel
        center={selectedCenter}
        onClose={() => setSelectedCenter(null)}
      />
    </div>
  );
}
