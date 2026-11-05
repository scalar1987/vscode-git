import { useParams, useNavigate } from 'react-router-dom';
import { loadCenters, loadTotRecords } from '../lib/centersData';
import { useState, useEffect, Fragment } from 'react';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  Building2,
  GraduationCap,
  Briefcase,
  MapPin,
  Users,
  Monitor,
  CheckCircle2,
  Clock,
  Phone,
  Mail,
  Settings,
  ChevronDown
} from 'lucide-react';
import { CENTER_STATUS_COLORS, type CenterStatus } from '../types/center';

interface Center {
  id: string;
  name: string;
  type: 'University' | 'School' | 'Mairie';
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
  center_coordinators?: Array<{ name: string; phone: string; email: string }>;
  infrastructure?: any;
  training?: any;
  greenpreneur?: any;
  metadata?: any;
}

const STATUS_COLORS: Record<string, string> = CENTER_STATUS_COLORS;

const TYPE_ICONS: Record<string, React.ReactNode> = {
  'University': <GraduationCap className="w-8 h-8" />,
  'School': <Building2 className="w-8 h-8" />,
  'Mairie': <Briefcase className="w-8 h-8" />,
};

type ToTChannel = { completed: boolean; date: string };
type ToTEntry = { online_lms: ToTChannel; in_person: ToTChannel };
type CoordinatorWithToT = { name: string; phone: string; email: string; tot?: ToTEntry };

const emptyToT = (): ToTEntry => ({
  online_lms: { completed: false, date: '' },
  in_person: { completed: false, date: '' },
});

function ToTInputForm({ coordinators }: { coordinators: CoordinatorWithToT[] }) {
  const [entries, setEntries] = useState<ToTEntry[]>(() => coordinators.map(c => c.tot ?? emptyToT()));
  const [copied, setCopied] = useState(false);

  const updateChannel = (index: number, channel: keyof ToTEntry, patch: Partial<ToTChannel>) => {
    setEntries(prev => prev.map((entry, i) => (i === index ? { ...entry, [channel]: { ...entry[channel], ...patch } } : entry)));
    setCopied(false);
  };

  const onlineDone = entries.filter(e => e.online_lms.completed).length;
  const inPersonDone = entries.filter(e => e.in_person.completed).length;

  const copyJson = async () => {
    const payload = coordinators.map((c, i) => ({ name: c.name, phone: c.phone, email: c.email, tot: entries[i] }));
    try {
      await navigator.clipboard.writeText(JSON.stringify(payload, null, 2));
      setCopied(true);
    } catch (error) {
      console.error('Clipboard write failed:', error);
    }
  };

  const channelRow = (
    index: number,
    channel: keyof ToTEntry,
    label: string,
    icon: React.ReactNode,
  ) => {
    const value = entries[index][channel];
    return (
      <div className="flex flex-wrap items-center gap-3 py-2">
        <label className="flex items-center gap-2 text-sm text-gray-700 w-40 cursor-pointer">
          <input
            type="checkbox"
            checked={value.completed}
            onChange={e => updateChannel(index, channel, { completed: e.target.checked, date: e.target.checked ? value.date : '' })}
            className="w-4 h-4 accent-dg-green-600"
          />
          {icon}
          {label}
        </label>
        <input
          type="date"
          value={value.date}
          disabled={!value.completed}
          onChange={e => updateChannel(index, channel, { date: e.target.value })}
          aria-label={`${label} completion date`}
          className="px-2 py-1 text-sm border border-gray-300 rounded-md disabled:bg-gray-100 disabled:text-gray-400"
        />
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Coordinator ToT Completion</h3>
            <p className="text-sm text-gray-600">Online LMS and In-person training tracked separately per coordinator</p>
          </div>
          <div className="flex gap-3 text-sm">
            <span className="px-3 py-1 rounded-full bg-dg-blue-50 text-dg-blue-700">
              Online LMS {onlineDone}/{coordinators.length}
            </span>
            <span className="px-3 py-1 rounded-full bg-dg-green-50 text-dg-green-700">
              In-person {inPersonDone}/{coordinators.length}
            </span>
          </div>
        </div>

        <div className="space-y-4">
          {coordinators.map((coordinator, index) => (
            <div key={`${coordinator.name}-${index}`} className="p-4 rounded-lg border border-gray-200">
              <p className="font-semibold text-gray-900 mb-1">
                #{index + 1} {coordinator.name}
              </p>
              <div className="divide-y divide-gray-100">
                {channelRow(index, 'online_lms', 'Online LMS', <Monitor className="w-4 h-4 text-dg-blue-600" />)}
                {channelRow(index, 'in_person', 'In-person', <Users className="w-4 h-4 text-dg-green-600" />)}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <button
            onClick={copyJson}
            className="px-4 py-2 bg-dg-green-600 text-white rounded-lg hover:bg-dg-green-700 transition-colors font-medium"
          >
            Copy JSON
          </button>
          {copied && <span className="text-sm text-dg-green-700">Copied to clipboard</span>}
        </div>
        <p className="mt-3 text-xs text-gray-500">
          No save backend is connected yet. Entries are kept until the page is reloaded. Use Copy JSON to store them in centers.json.
        </p>
      </div>
    </div>
  );
}

type InfraStatus = 'Pending' | 'In Progress' | 'Completed';
type InfraIssue = { date: string; description: string; resolved: boolean };
type RoomState = { status: InfraStatus };
type EquipmentItem = {
  item: string;
  total_quantity: number;
  quantity_installed: number;
  status: InfraStatus;
  supplier: string;
  installation_date: string | null;
};
type InfraState = {
  renovation: {
    status: InfraStatus;
    completion_percentage: number;
    scheduled_completion_date: string;
    progress_notes: string;
    issues: InfraIssue[];
    rooms: Record<string, RoomState>;
  };
  equipment: { status: InfraStatus; completion_percentage: number; items: EquipmentItem[] };
  internet_infrastructure: { status: InfraStatus; bandwidth_mbps: number | null; access_points: number };
  electricity: { status: InfraStatus; notes: string };
};

const INFRA_STATUSES: InfraStatus[] = ['Pending', 'In Progress', 'Completed'];

const clampPercent = (value: number) => Math.min(100, Math.max(0, Number.isFinite(value) ? value : 0));

function toInfraState(raw: any): InfraState {
  return {
    renovation: {
      status: raw?.renovation?.status ?? 'Pending',
      completion_percentage: raw?.renovation?.completion_percentage ?? 0,
      scheduled_completion_date: raw?.renovation?.scheduled_completion_date ?? '',
      progress_notes: raw?.renovation?.progress_notes ?? '',
      issues: raw?.renovation?.issues ?? [],
      rooms: Object.fromEntries(
        ROOM_ITEMS.map(room => [room.key, { status: raw?.renovation?.rooms?.[room.key]?.status ?? 'Pending' }]),
      ),
    },
    equipment: {
      status: raw?.equipment?.status ?? 'Pending',
      completion_percentage: raw?.equipment?.completion_percentage ?? 0,
      items: (raw?.equipment?.items ?? []).map((item: any) => ({
        item: item.item,
        total_quantity: item.total_quantity ?? 0,
        quantity_installed: item.quantity_installed ?? 0,
        status: item.status ?? 'Pending',
        supplier: item.supplier ?? 'TBD',
        installation_date: item.installation_date ?? null,
      })),
    },
    internet_infrastructure: {
      status: raw?.internet_infrastructure?.status ?? 'Pending',
      bandwidth_mbps: raw?.internet_infrastructure?.bandwidth_mbps ?? null,
      access_points: raw?.internet_infrastructure?.access_points ?? 0,
    },
    electricity: {
      status: raw?.electricity?.status ?? 'Pending',
      notes: raw?.electricity?.notes ?? '',
    },
  };
}

function InfrastructureInputForm({ infrastructure }: { infrastructure: any }) {
  const [state, setState] = useState<InfraState>(() => toInfraState(infrastructure));
  const [issueText, setIssueText] = useState('');
  const [issueDate, setIssueDate] = useState('');
  const [copied, setCopied] = useState(false);

  const patchRenovation = (patch: Partial<InfraState['renovation']>) => {
    setState(s => ({ ...s, renovation: { ...s.renovation, ...patch } }));
    setCopied(false);
  };
  const patchEquipment = (patch: Partial<InfraState['equipment']>) => {
    setState(s => ({ ...s, equipment: { ...s.equipment, ...patch } }));
    setCopied(false);
  };
  const patchRoom = (key: string, status: InfraStatus) =>
    patchRenovation({ rooms: { ...state.renovation.rooms, [key]: { status } } });
  const patchItem = (index: number, patch: Partial<EquipmentItem>) =>
    patchEquipment({ items: state.equipment.items.map((it, i) => (i === index ? { ...it, ...patch } : it)) });
  const patchElectricity = (patch: Partial<InfraState['electricity']>) => {
    setState(s => ({ ...s, electricity: { ...s.electricity, ...patch } }));
    setCopied(false);
  };
  const patchInternet = (patch: Partial<InfraState['internet_infrastructure']>) => {
    setState(s => ({ ...s, internet_infrastructure: { ...s.internet_infrastructure, ...patch } }));
    setCopied(false);
  };

  const addIssue = () => {
    const description = issueText.trim();
    if (!description) return;
    patchRenovation({ issues: [...state.renovation.issues, { date: issueDate, description, resolved: false }] });
    setIssueText('');
    setIssueDate('');
  };

  const toggleIssue = (index: number) =>
    patchRenovation({
      issues: state.renovation.issues.map((issue, i) => (i === index ? { ...issue, resolved: !issue.resolved } : issue)),
    });

  const removeIssue = (index: number) =>
    patchRenovation({ issues: state.renovation.issues.filter((_, i) => i !== index) });

  const copyJson = async () => {
    const payload = {
      ...infrastructure,
      renovation: { ...infrastructure?.renovation, ...state.renovation },
      equipment: { ...infrastructure?.equipment, ...state.equipment },
      internet_infrastructure: { ...infrastructure?.internet_infrastructure, ...state.internet_infrastructure },
      electricity: { ...infrastructure?.electricity, ...state.electricity },
    };
    try {
      await navigator.clipboard.writeText(JSON.stringify(payload, null, 2));
      setCopied(true);
    } catch (error) {
      console.error('Clipboard write failed:', error);
    }
  };

  const statusSelect = (value: InfraStatus, onChange: (status: InfraStatus) => void, label: string) => (
    <label className="flex flex-col gap-1 text-sm text-gray-700">
      {label}
      <select
        value={value}
        onChange={e => onChange(e.target.value as InfraStatus)}
        className="px-2 py-1.5 border border-gray-300 rounded-md bg-white"
      >
        {INFRA_STATUSES.map(s => (
          <option key={s} value={s}>{s}</option>
        ))}
      </select>
    </label>
  );

  const percentInput = (value: number, onChange: (percent: number) => void, label: string) => (
    <label className="flex flex-col gap-1 text-sm text-gray-700">
      {label} (%)
      <input
        type="number"
        min={0}
        max={100}
        value={value}
        onChange={e => onChange(clampPercent(Number(e.target.value)))}
        className="px-2 py-1.5 border border-gray-300 rounded-md"
      />
    </label>
  );

  const { renovation, equipment, internet_infrastructure: internet, electricity } = state;

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Renovation</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          {statusSelect(renovation.status, status => patchRenovation({ status }), 'Status')}
          {percentInput(renovation.completion_percentage, p => patchRenovation({ completion_percentage: p }), 'Completion')}
          <label className="flex flex-col gap-1 text-sm text-gray-700">
            Scheduled completion
            <input
              type="date"
              value={renovation.scheduled_completion_date}
              onChange={e => patchRenovation({ scheduled_completion_date: e.target.value })}
              className="px-2 py-1.5 border border-gray-300 rounded-md"
            />
          </label>
        </div>
        <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden mb-4">
          <div
            className="h-full bg-gradient-to-r from-dg-green-500 to-dg-green-600 transition-all"
            style={{ width: `${renovation.completion_percentage}%` }}
          />
        </div>
        <h4 className="text-sm font-semibold text-gray-900 mb-3">Rooms</h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          {ROOM_ITEMS.map(room =>
            statusSelect(renovation.rooms[room.key]?.status ?? 'Pending', status => patchRoom(room.key, status), room.label),
          )}
        </div>
        <label className="flex flex-col gap-1 text-sm text-gray-700 mb-6">
          Progress notes
          <textarea
            rows={3}
            value={renovation.progress_notes}
            onChange={e => patchRenovation({ progress_notes: e.target.value })}
            className="px-2 py-1.5 border border-gray-300 rounded-md"
          />
        </label>

        <h4 className="text-sm font-semibold text-gray-900 mb-3">Issues</h4>
        {renovation.issues.length === 0 ? (
          <p className="text-sm text-gray-500 mb-3">No issues logged</p>
        ) : (
          <ul className="space-y-2 mb-4">
            {renovation.issues.map((issue, index) => (
              <li
                key={index}
                className="flex flex-wrap items-center gap-3 p-3 rounded-lg border border-gray-200"
              >
                <label className="flex items-center gap-2 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    checked={issue.resolved}
                    onChange={() => toggleIssue(index)}
                    className="w-4 h-4 accent-dg-green-600"
                  />
                  Resolved
                </label>
                <span className={`flex-1 text-sm ${issue.resolved ? 'text-gray-400 line-through' : 'text-gray-900'}`}>
                  {issue.description}
                </span>
                {issue.date && <span className="text-xs text-gray-500">{issue.date}</span>}
                <button
                  onClick={() => removeIssue(index)}
                  className="text-xs text-red-600 hover:underline"
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        )}
        <div className="flex flex-wrap gap-2">
          <input
            type="text"
            value={issueText}
            onChange={e => setIssueText(e.target.value)}
            placeholder="Describe a new issue"
            className="flex-1 min-w-[200px] px-2 py-1.5 border border-gray-300 rounded-md text-sm"
          />
          <input
            type="date"
            value={issueDate}
            onChange={e => setIssueDate(e.target.value)}
            aria-label="Issue date"
            className="px-2 py-1.5 border border-gray-300 rounded-md text-sm"
          />
          <button
            onClick={addIssue}
            disabled={!issueText.trim()}
            className="px-4 py-1.5 bg-dg-amber-600 text-white rounded-md text-sm font-medium hover:bg-dg-amber-700 transition-colors disabled:bg-gray-300"
          >
            Add issue
          </button>
        </div>

        <div className="mt-8 pt-6 border-t border-gray-200">
          <h4 className="text-sm font-semibold text-gray-900 mb-3">Internet</h4>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {statusSelect(internet.status, status => patchInternet({ status }), 'Status')}
            <label className="flex flex-col gap-1 text-sm text-gray-700">
              Bandwidth (Mbps)
              <input
                type="number"
                min={0}
                value={internet.bandwidth_mbps ?? ''}
                onChange={e => patchInternet({ bandwidth_mbps: e.target.value === '' ? null : Number(e.target.value) })}
                className="px-2 py-1.5 border border-gray-300 rounded-md"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm text-gray-700">
              Access points
              <input
                type="number"
                min={0}
                value={internet.access_points}
                onChange={e => patchInternet({ access_points: Math.max(0, Number(e.target.value) || 0) })}
                className="px-2 py-1.5 border border-gray-300 rounded-md"
              />
            </label>
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-gray-200">
          <h4 className="text-sm font-semibold text-gray-900 mb-3">Electricity</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {statusSelect(electricity.status, status => patchElectricity({ status }), "Status")}
            <label className="flex flex-col gap-1 text-sm text-gray-700 md:col-span-2">
              Notes
              <input
                type="text"
                value={electricity.notes}
                onChange={e => patchElectricity({ notes: e.target.value })}
                className="px-2 py-1.5 border border-gray-300 rounded-md"
              />
            </label>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Equipment</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          {statusSelect(equipment.status, status => patchEquipment({ status }), 'Status')}
          {percentInput(equipment.completion_percentage, p => patchEquipment({ completion_percentage: p }), 'Completion')}
        </div>
        <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-dg-amber-500 to-dg-amber-600 transition-all"
            style={{ width: `${equipment.completion_percentage}%` }}
          />
        </div>

        <h4 className="text-sm font-semibold text-gray-900 mt-6 mb-3">Items</h4>
        <div className="space-y-2">
          {equipment.items.map((item, index) => (
            <div
              key={index}
              className="grid grid-cols-1 md:grid-cols-3 gap-3 items-center p-3 rounded-lg border border-gray-200 text-sm"
            >
              <span className="font-medium text-gray-900">{item.item}</span>
              <label className="flex items-center gap-2 text-gray-700">
                Installed
                <input
                  type="number"
                  min={0}
                  max={item.total_quantity}
                  value={item.quantity_installed}
                  onChange={e =>
                    patchItem(index, {
                      quantity_installed: Math.min(item.total_quantity, Math.max(0, Number(e.target.value) || 0)),
                    })
                  }
                  className="w-20 px-2 py-1 border border-gray-300 rounded-md"
                />
                <span className="text-gray-400">/ {item.total_quantity}</span>
              </label>
              {statusSelect(item.status, status => patchItem(index, { status }), "Status")}
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button
          onClick={copyJson}
          className="px-4 py-2 bg-dg-green-600 text-white rounded-lg hover:bg-dg-green-700 transition-colors font-medium"
        >
          Copy infrastructure JSON
        </button>
        {copied && <span className="text-sm text-dg-green-700">Copied to clipboard</span>}
      </div>
    </div>
  );
}

type GpStatus = 'Not Started' | 'Scheduled' | 'In Progress' | 'Completed';
type GpYearKey = '2025' | '2026' | '2027';
type GpPitch = {
  participants: number;
  round_number: number;
  winners: number;
  total_seed_capital_allocated: number;
  seed_capital_per_winner: number;
  scheduled_date: string;
  status: GpStatus;
};
type GpIncubation = {
  status: GpStatus;
  start_date: string;
  end_date: string;
  participants_enrolled: number;
  participants_completed: number;
};
type GpYear = { pitch_competition: GpPitch; incubation?: GpIncubation };
type GpState = { status: GpStatus; years: Record<GpYearKey, GpYear> };

const GP_STATUSES: GpStatus[] = ['Not Started', 'Scheduled', 'In Progress', 'Completed'];
const GP_YEARS: GpYearKey[] = ['2025', '2026', '2027'];
const GP_PARTICIPANT_TARGET_PER_YEAR = 225;

const nonNegative = (value: number) => (Number.isFinite(value) && value > 0 ? value : 0);

function toGpState(raw: any): GpState {
  const years = {} as Record<GpYearKey, GpYear>;
  GP_YEARS.forEach((year, index) => {
    const yearRaw = raw?.[year];
    const pitch = yearRaw?.pitch_competition;
    const incubation = yearRaw?.incubation;
    years[year] = {
      pitch_competition: {
        participants: pitch?.participants ?? 0,
        round_number: pitch?.round_number ?? index + 1,
        winners: pitch?.winners ?? 0,
        total_seed_capital_allocated: pitch?.total_seed_capital_allocated ?? 0,
        seed_capital_per_winner: pitch?.seed_capital_per_winner ?? 15000,
        scheduled_date: pitch?.scheduled_date ?? '',
        status: pitch?.status ?? 'Scheduled',
      },
      ...(incubation
        ? {
            incubation: {
              status: incubation.status ?? 'Not Started',
              start_date: incubation.start_date ?? '',
              end_date: incubation.end_date ?? '',
              participants_enrolled: incubation.participants_enrolled ?? 0,
              participants_completed: incubation.participants_completed ?? 0,
            },
          }
        : {}),
    };
  });
  return { status: raw?.status ?? 'Not Started', years };
}

function GreenpreneurInputForm({ greenpreneur }: { greenpreneur: any }) {
  const [state, setState] = useState<GpState>(() => toGpState(greenpreneur));
  const [copied, setCopied] = useState(false);

  const patch = (updater: (s: GpState) => GpState) => {
    setState(updater);
    setCopied(false);
  };

  const patchPitch = (year: GpYearKey, values: Partial<GpPitch>) =>
    patch(s => ({
      ...s,
      years: { ...s.years, [year]: { ...s.years[year], pitch_competition: { ...s.years[year].pitch_competition, ...values } } },
    }));

  const patchIncubation = (year: GpYearKey, values: Partial<GpIncubation>) =>
    patch(s => ({
      ...s,
      years: {
        ...s.years,
        [year]: { ...s.years[year], incubation: { ...(s.years[year].incubation as GpIncubation), ...values } },
      },
    }));

  const totals = GP_YEARS.reduce(
    (acc, year) => {
      const pitch = state.years[year].pitch_competition;
      acc.participants += pitch.participants;
      acc.winners += pitch.winners;
      acc.seedCapital += pitch.total_seed_capital_allocated;
      return acc;
    },
    { participants: 0, winners: 0, seedCapital: 0 },
  );

  const copyJson = async () => {
    try {
      await navigator.clipboard.writeText(JSON.stringify({ ...greenpreneur, ...state.years, status: state.status }, null, 2));
      setCopied(true);
    } catch (error) {
      console.error('Clipboard write failed:', error);
    }
  };

  const selectField = (label: string, value: GpStatus, onChange: (v: GpStatus) => void) => (
    <label className="flex flex-col gap-1 text-sm text-gray-700">
      {label}
      <select
        value={value}
        onChange={e => onChange(e.target.value as GpStatus)}
        className="px-2 py-1.5 border border-gray-300 rounded-md bg-white"
      >
        {GP_STATUSES.map(s => (
          <option key={s} value={s}>{s}</option>
        ))}
      </select>
    </label>
  );

  const numberField = (label: string, value: number, onChange: (v: number) => void) => (
    <label className="flex flex-col gap-1 text-sm text-gray-700">
      {label}
      <input
        type="number"
        min={0}
        value={value}
        onChange={e => onChange(nonNegative(Number(e.target.value)))}
        className="px-2 py-1.5 border border-gray-300 rounded-md"
      />
    </label>
  );

  const dateField = (label: string, value: string, onChange: (v: string) => void) => (
    <label className="flex flex-col gap-1 text-sm text-gray-700">
      {label}
      <input
        type="date"
        value={value}
        onChange={e => onChange(e.target.value)}
        className="px-2 py-1.5 border border-gray-300 rounded-md"
      />
    </label>
  );

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Greenpreneur Program</h3>
            <p className="text-sm text-gray-600">
              Logframe 2.2.2.1: {GP_PARTICIPANT_TARGET_PER_YEAR} participants per year (675 total)
            </p>
          </div>
          <div className="w-56">
            {selectField('Overall status', state.status, v => patch(s => ({ ...s, status: v })))}
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3 text-sm">
          <div className="p-3 rounded-lg bg-gray-50 border border-gray-200">
            <p className="text-xs text-gray-600">Pitch participants</p>
            <p className="text-xl font-bold text-gray-900">{totals.participants}</p>
          </div>
          <div className="p-3 rounded-lg bg-gray-50 border border-gray-200">
            <p className="text-xs text-gray-600">Winners</p>
            <p className="text-xl font-bold text-gray-900">{totals.winners}</p>
          </div>
          <div className="p-3 rounded-lg bg-gray-50 border border-gray-200">
            <p className="text-xs text-gray-600">Seed capital allocated</p>
            <p className="text-xl font-bold text-gray-900">{totals.seedCapital.toLocaleString()}</p>
          </div>
        </div>
      </div>

      {GP_YEARS.map(year => {
        const { pitch_competition: pitch, incubation } = state.years[year];
        return (
          <div key={year} className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <h4 className="text-base font-semibold text-gray-900 mb-4">{year}</h4>

            <div className="mb-6">
              <p className="text-sm font-semibold text-gray-700 mb-3">Pitch competition (round {pitch.round_number})</p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {numberField('Participants', pitch.participants, v => patchPitch(year, { participants: v }))}
                {numberField('Winners', pitch.winners, v => patchPitch(year, { winners: v }))}
                {selectField('Status', pitch.status, v => patchPitch(year, { status: v }))}
                {dateField('Scheduled date', pitch.scheduled_date, v => patchPitch(year, { scheduled_date: v }))}
                {numberField('Seed capital per winner', pitch.seed_capital_per_winner, v => patchPitch(year, { seed_capital_per_winner: v }))}
                {numberField('Total seed capital allocated', pitch.total_seed_capital_allocated, v => patchPitch(year, { total_seed_capital_allocated: v }))}
              </div>
            </div>

            {incubation && (
              <div>
                <p className="text-sm font-semibold text-gray-700 mb-3">Incubation</p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {selectField('Status', incubation.status, v => patchIncubation(year, { status: v }))}
                  {dateField('Start date', incubation.start_date, v => patchIncubation(year, { start_date: v }))}
                  {dateField('End date', incubation.end_date, v => patchIncubation(year, { end_date: v }))}
                  {numberField('Participants enrolled', incubation.participants_enrolled, v => patchIncubation(year, { participants_enrolled: v }))}
                  {numberField('Participants completed', incubation.participants_completed, v => patchIncubation(year, { participants_completed: v }))}
                </div>
              </div>
            )}
          </div>
        );
      })}

      <div className="flex flex-wrap items-center gap-3">
        <button
          onClick={copyJson}
          className="px-4 py-2 bg-dg-green-600 text-white rounded-lg hover:bg-dg-green-700 transition-colors font-medium"
        >
          Copy Greenpreneur JSON
        </button>
        {copied && <span className="text-sm text-dg-green-700">Copied to clipboard</span>}
      </div>
    </div>
  );
}

type InputSection = 'tot' | 'infrastructure' | 'greenpreneur';

const INPUT_SECTIONS: Array<{ value: InputSection; label: string }> = [
  { value: 'tot', label: 'Coordinator ToT completion' },
  { value: 'infrastructure', label: 'Infrastructure (renovation, equipment, internet)' },
  { value: 'greenpreneur', label: 'Greenpreneur program' },
];

// Per-center actuals for the Overview cards. Targets are per center (centers.json), not logframe totals.
function basicEnrolledOf(c: Center): number {
  const t = c.training?.basic_ict_green;
  return (t?.school_students?.enrolled ?? 0) + (t?.university_students?.enrolled ?? 0);
}

// Basic passed = the centre's passed-assessment count (same field the Overview uses)
function basicPassedOf(c: Center): number {
  return c.training?.basic_ict_green?.school_students?.passed_assessment ?? 0;
}

function advancedEnrolledOf(c: Center): number {
  const byYear: Record<string, { enrolled?: number }> = c.training?.advanced_ict_green?.by_year ?? {};
  return Object.values(byYear).reduce((sum, y) => sum + (y?.enrolled ?? 0), 0);
}

const ROOM_ITEMS: Array<{ key: string; label: string }> = [
  { key: "floor", label: "Floor" },
  { key: "ceiling", label: "Ceiling" },
  { key: "wall", label: "Wall" },
  { key: "window", label: "Window" },
  { key: "door", label: "Door" },
];

// Year-by-year center actuals (enrolled / passed) for the Overview training tables.
const ACTUAL_YEARS = ["2025", "2026", "2027"];

function sumAdvancedYear(c: Center, year: string, field: "enrolled" | "passed"): number {
  return c.training?.advanced_ict_green?.by_year?.[year]?.[field] ?? 0;
}

// Basic ICT modules, each measured against the centre's basic target
const BASIC_MODULES = [
  { key: 'word', label: 'Microsoft Word', bar: 'bg-dg-blue-500' },
  { key: 'excel', label: 'Microsoft Excel', bar: 'bg-dg-blue-500' },
  { key: 'ppt', label: 'Microsoft PowerPoint', bar: 'bg-dg-blue-500' },
  { key: 'green', label: 'Green Practices', bar: 'bg-dg-green-500' },
];

// Pass target = 64% of the enrolment target (logframe 1.2.7.1 21,715 / 1.2.6 33,930)
const PASS_RATE_TARGET = 0.64;

function BasicModuleProgress({ center }: { center: Center }) {
  const target = center.target_basic_ict ?? 0;
  const passTarget = Math.round(target * PASS_RATE_TARGET);
  // Same enrolled figure as the Overview card at the top (single source)
  const totalEnrolled = basicEnrolledOf(center);
  const modules: Record<string, { passed?: number }> = center.training?.basic_modules ?? {};

  const Bar = ({ value, max, cls }: { value: number; max: number; cls: string }) => {
    const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
    return (
      <div className="w-full h-1.5 bg-gray-200 rounded-full overflow-hidden">
        <div className={`h-full transition-all ${cls}`} style={{ width: `${pct}%` }} />
      </div>
    );
  };

  return (
    <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
      <div className="flex flex-wrap items-baseline justify-between gap-2 mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Basic ICT &amp; Green Practices – by module</h3>
        <p className="text-xs text-gray-500 tabular-nums">
          Enrolled target {target.toLocaleString()} · Pass target {passTarget.toLocaleString()} (64%)
        </p>
      </div>
      <div className="grid grid-cols-[minmax(120px,1fr)_2fr_2fr] gap-x-6 gap-y-0 text-sm">
        <div className="pb-2 text-xs font-medium text-gray-500 border-b border-gray-200">Module</div>
        <div className="pb-2 text-xs font-medium text-gray-500 border-b border-gray-200">Enrolled</div>
        <div className="pb-2 text-xs font-medium text-gray-500 border-b border-gray-200">Passed</div>
        {BASIC_MODULES.map(m => {
          const enrolled = totalEnrolled;
          const passed = modules[m.key]?.passed ?? 0;
          return (
            <Fragment key={m.key}>
              <div className="py-3 border-b border-gray-100 font-medium text-gray-800">{m.label}</div>
              <div className="py-3 border-b border-gray-100">
                <p className="tabular-nums text-gray-700 mb-1">
                  {enrolled.toLocaleString()} <span className="text-gray-400">/ {target.toLocaleString()}</span>
                </p>
                <Bar value={enrolled} max={target} cls="bg-dg-blue-500" />
              </div>
              <div className="py-3 border-b border-gray-100">
                <p className="tabular-nums text-gray-700 mb-1">
                  {passed.toLocaleString()} <span className="text-gray-400">/ {passTarget.toLocaleString()}</span>
                </p>
                <Bar value={passed} max={passTarget} cls="bg-dg-green-500" />
              </div>
            </Fragment>
          );
        })}
      </div>
    </div>
  );
}

function ActualsTable({ title, rows }: { title: string; rows: Array<{ year: string; enrolled: number; passed: number }> }) {
  const totalEnrolled = rows.reduce((sum, r) => sum + r.enrolled, 0);
  const totalPassed = rows.reduce((sum, r) => sum + r.passed, 0);
  return (
    <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">{title}</h3>
      <table className="w-full text-sm tabular-nums">
        <thead>
          <tr className="text-left text-xs text-gray-500 border-b border-gray-200">
            <th className="py-2 font-medium">Year</th>
            <th className="py-2 font-medium text-right">Enrolled</th>
            <th className="py-2 font-medium text-right">Passed</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(r => (
            <tr key={r.year} className="border-b border-gray-100">
              <td className="py-2 text-gray-700">{r.year}</td>
              <td className="py-2 text-right text-gray-900">{r.enrolled.toLocaleString()}</td>
              <td className="py-2 text-right text-gray-900">{r.passed.toLocaleString()}</td>
            </tr>
          ))}
          <tr className="font-semibold">
            <td className="py-2 text-gray-900">Total</td>
            <td className="py-2 text-right text-gray-900">{totalEnrolled.toLocaleString()}</td>
            <td className="py-2 text-right text-gray-900">{totalPassed.toLocaleString()}</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

// Basic ToT completion per trainer. Completed = in-person AND LMS both done.
interface TotBasicRecord {
  center_id: string;
  name: string;
  in_person_completed: boolean | null;
  lms_completed: boolean | null;
}

type TotState = 'completed' | 'partial' | 'none';

function totState(record: TotBasicRecord | undefined): TotState {
  const ip = record?.in_person_completed === true;
  const lms = record?.lms_completed === true;
  return ip && lms ? 'completed' : ip || lms ? 'partial' : 'none';
}

const TOT_STATE_STYLE: Record<TotState, { border: string; badge: string; label: string }> = {
  completed: { border: 'border-l-dg-green-500', badge: 'bg-dg-green-600 text-white', label: 'ToT completed' },
  partial: { border: 'border-l-dg-amber-500', badge: 'bg-dg-amber-100 text-dg-amber-700', label: 'ToT in progress' },
  none: { border: 'border-l-gray-300', badge: 'bg-gray-100 text-gray-600', label: 'ToT not started' },
};

function TotStatusChip({ label, done }: { label: string; done: boolean | null }) {
  const isDone = done === true;
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium border ${
        isDone ? 'bg-dg-green-50 text-dg-green-700 border-dg-green-200' : 'bg-white text-gray-400 border-gray-200'
      }`}
    >
      <span className={`font-bold ${isDone ? 'text-dg-green-600' : 'text-gray-300'}`}>{isDone ? '✓' : '○'}</span>
      {label}
    </span>
  );
}

function TotSummary({ record }: { record: TotBasicRecord | undefined }) {
  const style = TOT_STATE_STYLE[totState(record)];
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${style.badge}`}>{style.label}</span>
      <TotStatusChip label="In-person" done={record?.in_person_completed ?? null} />
      <TotStatusChip label="Online (LMS)" done={record?.lms_completed ?? null} />
    </div>
  );
}

// Summary bar above the coordinator cards
function CoordinatorTotProgress({ records, total }: { records: TotBasicRecord[]; total: number }) {
  const done = records.filter(r => totState(r) === 'completed').length;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  return (
    <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-semibold text-gray-900">Basic ToT completed (in-person + online)</p>
        <p className="text-lg font-bold text-gray-900 tabular-nums">
          {done} <span className="text-sm font-normal text-gray-400">/ {total}</span>
        </p>
      </div>
      <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden">
        <div className="h-full bg-gradient-to-r from-dg-green-500 to-dg-green-600 transition-all" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

// Overview infra card: progress summary always visible, details revealed on click
function InfraDetailCard({
  title,
  percent,
  barClass,
  summary,
  children,
}: {
  title: string;
  percent: number;
  barClass: string;
  summary: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        aria-expanded={open}
        className="w-full text-left"
      >
        <div className="flex items-center justify-between mb-4">
          <h4 className="font-semibold text-gray-900">{title}</h4>
          <span className="flex items-center gap-2 text-sm font-bold text-gray-900">
            {percent}%
            <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} />
          </span>
        </div>
        <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden">
          <div className={`h-full transition-all ${barClass}`} style={{ width: `${percent}%` }} />
        </div>
        <p className="mt-3 text-sm text-gray-600">{summary}</p>
        <p className="mt-1 text-xs text-gray-400">{open ? 'Hide details' : 'Show details'}</p>
      </button>
      {open && <div className="mt-4 pt-4 border-t border-gray-100">{children}</div>}
    </div>
  );
}

function EmptyInputNotice({ message }: { message: string }) {
  return (
    <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 text-center">
      <Settings className="w-10 h-10 text-gray-400 mx-auto mb-3" />
      <p className="text-gray-500">{message}</p>
    </div>
  );
}

export function CenterDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [center, setCenter] = useState<Center | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'input'>('overview');
  const [inputSection, setInputSection] = useState<InputSection>('tot');
  // Basic ToT records per coordinator (index-matched to center_coordinators)
  const [totBasic, setTotBasic] = useState<TotBasicRecord[]>([]);

  useEffect(() => {
    loadTotRecords()
      .then(records => setTotBasic(records))
      .catch(() => setTotBasic([]));
  }, []);

  useEffect(() => {
    const fetchCenter = async () => {
      try {
        const centers = (await loadCenters()) as Center[];
        const found = centers.find(c => c.id === id);
        setCenter(found || null);
      } catch (error) {
        console.error('Error loading center:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchCenter();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-dg-green-600" />
      </div>
    );
  }

  if (!center) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 mb-4">Center not found</p>
          <button
            onClick={() => navigate('/')}
            className="px-4 py-2 bg-dg-green-600 text-white rounded-lg hover:bg-dg-green-700 transition-colors"
          >
            Back to Map
          </button>
        </div>
      </div>
    );
  }

  const statusColor = STATUS_COLORS[center.status];
  const isOperational = center.status === 'Operational';

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white border-b border-gray-200 sticky top-0 z-40 shadow-sm"
      >
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/')}
              className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
              aria-label="Back to map"
            >
              <ArrowLeft className="w-6 h-6 text-gray-600" />
            </button>
            <div className="flex items-center gap-3">
              <div
                className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-md"
                style={{ backgroundColor: statusColor, color: 'white' }}
              >
                {TYPE_ICONS[center.type]}
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{center.name}</h1>
                <div className="flex items-center gap-2 mt-1">
                  <span
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold"
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
                  <span className="px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                    {center.phase}
                  </span>
                  <span className="text-xs text-gray-500 flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5" />
                    {center.region}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Tab Navigation */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-6">
          <div className="flex gap-8 overflow-x-auto">
            {(['overview', 'input'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                  activeTab === tab
                    ? 'border-dg-green-500 text-dg-green-600'
                    : 'border-transparent text-gray-600 hover:text-gray-900'
                }`}
              >
                {tab === 'input' ? '📝 Data Input' : 'Overview'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                <div className="flex items-center gap-3 mb-2">
                  <GraduationCap className="w-6 h-6 text-dg-green-600" />
                  <span className="text-sm text-gray-600">Basic ICT & Green Practices</span>
                </div>
                <p className="text-3xl font-bold text-gray-900">
                  {basicEnrolledOf(center).toLocaleString()}
                  <span className="text-lg font-normal text-gray-400"> / {center.target_basic_ict.toLocaleString()}</span>
                </p>
                <p className="text-sm text-gray-500 mt-1">Students enrolled / center target</p>
                <p className="mt-4 pt-3 border-t border-gray-100 text-sm text-gray-700 tabular-nums">
                  Passed <span className="font-semibold text-gray-900">{basicPassedOf(center).toLocaleString()}</span>
                  <span className="text-gray-400"> / {Math.round(center.target_basic_ict * PASS_RATE_TARGET).toLocaleString()} pass target (64%)</span>
                </p>
              </div>
              <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                <div className="flex items-center gap-3 mb-2">
                  <Briefcase className="w-6 h-6 text-dg-blue-600" />
                  <span className="text-sm text-gray-600">Advanced ICT & Green Business</span>
                </div>
                <p className="text-3xl font-bold text-gray-900">
                  {advancedEnrolledOf(center).toLocaleString()}
                  <span className="text-lg font-normal text-gray-400"> / pending</span>
                </p>
                <p className="text-sm text-gray-500 mt-1">Students enrolled / center target (after DigiFemme trainer assignment)</p>
              </div>
              <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                <div className="flex items-center gap-3 mb-2">
                  <Settings className="w-6 h-6 text-dg-amber-600" />
                  <span className="text-sm text-gray-600">Infrastructure</span>
                </div>
                <ul className="text-sm text-gray-700 space-y-1">
                  <li>Renovation: <span className="font-medium">{center.infrastructure?.renovation?.status ?? "Pending"}</span></li>
                  <li>Equipment: <span className="font-medium">{center.infrastructure?.equipment?.status ?? "Pending"}</span></li>
                </ul>
              </div>
            </div>

            {/* Notes */}
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Notes</h3>
              <p className="text-gray-700 leading-relaxed">{center.note}</p>
            </div>
          </motion.div>
        )}

        {/* Infrastructure Tab */}
        {activeTab === 'overview' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6 mt-10">
            <h2 className="text-xl font-semibold text-gray-900">Infrastructure</h2>
            {center.infrastructure ? (
              <>
                <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">Overall Status</h3>
                    <span className="px-3 py-1 rounded-full text-sm font-semibold bg-dg-blue-100 text-dg-blue-700">
                      {center.infrastructure.overall_status}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Renovation */}
                  <InfraDetailCard
                    title="Renovation"
                    percent={center.infrastructure.renovation.completion_percentage}
                    barClass="bg-gradient-to-r from-dg-green-500 to-dg-green-600"
                    summary={center.infrastructure.renovation.status ?? 'Pending'}
                  >
                    {center.infrastructure.renovation.progress_notes && (
                      <p className="text-sm text-gray-600 mb-4">{center.infrastructure.renovation.progress_notes}</p>
                    )}
                    <div className="space-y-2 text-sm">
                      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Rooms</p>
                      {ROOM_ITEMS.map(room => (
                        <div key={room.key} className="flex justify-between gap-4">
                          <span className="text-gray-600">{room.label}</span>
                          <span className="font-medium text-gray-900">
                            {center.infrastructure.renovation.rooms?.[room.key]?.status ?? "Pending"}
                          </span>
                        </div>
                      ))}
                    </div>
                    <div className="mt-4 pt-4 border-t border-gray-100 space-y-2 text-sm">
                      <div className="flex justify-between gap-4">
                        <span className="text-gray-600">Internet</span>
                        <span className="font-medium text-gray-900">
                          {center.infrastructure.internet_infrastructure?.status ?? "Pending"}
                          {center.infrastructure.internet_infrastructure?.access_points
                            ? ` · ${center.infrastructure.internet_infrastructure.access_points} access points`
                            : ""}
                        </span>
                      </div>
                      <div className="flex justify-between gap-4">
                        <span className="text-gray-600">Electricity</span>
                        <span className="font-medium text-gray-900">{center.infrastructure.electricity?.status ?? "Pending"}</span>
                      </div>
                      {center.infrastructure.electricity?.notes && (
                        <p className="text-sm text-gray-600">{center.infrastructure.electricity.notes}</p>
                      )}
                    </div>
                  </InfraDetailCard>

                  {/* Equipment */}
                  <InfraDetailCard
                    title="Equipment"
                    percent={center.infrastructure.equipment.completion_percentage}
                    barClass="bg-gradient-to-r from-dg-amber-500 to-dg-amber-600"
                    summary={center.infrastructure.equipment.status ?? 'Pending'}
                  >
                    {center.infrastructure.equipment.notes && (
                      <p className="text-sm text-gray-600 mb-4">{center.infrastructure.equipment.notes}</p>
                    )}
                    <div className="space-y-2 text-sm">
                      {(center.infrastructure.equipment.items ?? []).map((item: any, i: number) => (
                        <div key={i} className="flex justify-between gap-4">
                          <span className="text-gray-600">{item.item}</span>
                          <span className="font-medium text-gray-900 tabular-nums">
                            {item.quantity_installed ?? 0} / {item.total_quantity}
                          </span>
                        </div>
                      ))}
                    </div>
                  </InfraDetailCard>
                </div>
              </>
            ) : (
              <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 text-center">
                <p className="text-gray-500">No infrastructure data available</p>
              </div>
            )}
          </motion.div>
        )}

        {/* Training Tab */}
        {activeTab === "overview" && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6 mt-10">
            <h2 className="text-xl font-semibold text-gray-900">Student Training</h2>
            <BasicModuleProgress center={center} />
            <ActualsTable
              title="Advanced ICT & Green Business"
              rows={ACTUAL_YEARS.map(y => ({ year: y, enrolled: sumAdvancedYear(center, y, "enrolled"), passed: sumAdvancedYear(center, y, "passed") }))}
            />
          </motion.div>
        )}

        {/* Coordinators Tab */}
        {activeTab === 'overview' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4 mt-10">
            <h2 className="text-xl font-semibold text-gray-900">Coordinators</h2>
            {center.center_coordinators && center.center_coordinators.length > 0 && (
              <CoordinatorTotProgress
                records={totBasic.filter(r => r.center_id === center.id)}
                total={center.center_coordinators.length}
              />
            )}
            {center.center_coordinators && center.center_coordinators.length > 0 ? (
              center.center_coordinators.map((coord, idx) => (
                <div
                  key={idx}
                  className={`bg-white rounded-xl p-6 shadow-sm border border-gray-100 border-l-4 ${
                    TOT_STATE_STYLE[totState(totBasic.filter(r => r.center_id === center.id)[idx])].border
                  }`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <h4 className="text-lg font-semibold text-gray-900">{coord.name}</h4>
                    <span className="text-xs font-medium text-gray-500">#{idx + 1}</span>
                  </div>
                  <div className="mb-4">
                    <TotSummary record={totBasic.filter(r => r.center_id === center.id)[idx]} />
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center gap-3 text-gray-700">
                      <Phone className="w-5 h-5 text-dg-green-600 flex-shrink-0" />
                      <span className="font-mono">{coord.phone}</span>
                    </div>
                    <div className="flex items-center gap-3 text-gray-700 break-all">
                      <Mail className="w-5 h-5 text-dg-blue-600 flex-shrink-0" />
                      <span className="font-mono text-sm">{coord.email}</span>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 text-center">
                <p className="text-gray-500">No coordinators assigned</p>
              </div>
            )}
          </motion.div>
        )}

        {/* Data Input Tab */}
        <div className={activeTab === 'input' ? 'space-y-6' : 'hidden'}>
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 flex flex-wrap items-center gap-3">
            <label htmlFor="input-section" className="text-sm font-medium text-gray-700">Data to enter</label>
            <select
              id="input-section"
              value={inputSection}
              onChange={e => setInputSection(e.target.value as InputSection)}
              className="px-3 py-2 border border-gray-300 rounded-md bg-white text-sm min-w-[280px]"
            >
              {INPUT_SECTIONS.map(section => (
                <option key={section.value} value={section.value}>{section.label}</option>
              ))}
            </select>
          </div>

          {/* Forms stay mounted so unsaved input survives switching sections */}
          <div className={inputSection === 'tot' ? '' : 'hidden'}>
            {center.center_coordinators && center.center_coordinators.length > 0 ? (
              <ToTInputForm coordinators={center.center_coordinators as CoordinatorWithToT[]} />
            ) : (
              <EmptyInputNotice message="No coordinators registered for this center" />
            )}
          </div>
          <div className={inputSection === 'infrastructure' ? '' : 'hidden'}>
            {center.infrastructure ? (
              <InfrastructureInputForm infrastructure={center.infrastructure} />
            ) : (
              <EmptyInputNotice message="No infrastructure data for this center" />
            )}
          </div>
          <div className={inputSection === 'greenpreneur' ? '' : 'hidden'}>
            {center.greenpreneur ? (
              <GreenpreneurInputForm greenpreneur={center.greenpreneur} />
            ) : (
              <EmptyInputNotice message="No Greenpreneur data for this center" />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
