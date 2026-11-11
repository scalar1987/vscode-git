import { useParams, useNavigate } from 'react-router-dom';
import { loadCenters, loadTotRecords, supabase } from '../lib/centersData';
import { canEditSection, getProfile, getSession, isApproved, onAuthChange, type Profile } from '../lib/auth';
import { ReviewChip, commentOf, loadReviews, stateOf, type ReviewInfo } from '../lib/reviews';
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
  advanced_trainers?: any[];
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

type TrainerModule = 'word' | 'excel' | 'ppt' | 'green';
const TRAINER_MODULES: Array<{ key: TrainerModule; label: string }> = [
  { key: 'word', label: 'Microsoft Word' },
  { key: 'excel', label: 'Microsoft Excel' },
  { key: 'ppt', label: 'Microsoft PowerPoint' },
  { key: 'green', label: 'Green Practices' },
];

// One trainer's ToT: in-person ICT (Betterworld), in-person Green (Impact Lab), and online LMS (one flag per module)
type TrainerTot = {
  in_person_ict: boolean;
  in_person_ict_date: string;
  in_person_green: boolean;
  in_person_green_date: string;
  lms: Record<TrainerModule, boolean>;
};
type TrainerWithToT = { name: string; phone: string; email: string };

// Online LMS is complete only when all four modules are complete
const lmsComplete = (t: TrainerTot) => TRAINER_MODULES.every(m => t.lms[m.key]);

function ToTInputForm({
  centreId,
  canSave,
  coordinators,
  records,
  reviews,
}: {
  centreId: string;
  canSave: boolean;
  coordinators: TrainerWithToT[];
  records: TotBasicRecord[];
  reviews?: Map<string, ReviewInfo>;
}) {
  // Start from the saved flags (matched by position within the centre)
  const [entries, setEntries] = useState<TrainerTot[]>(() =>
    coordinators.map((_, i) => {
      const r = records[i];
      return {
        in_person_ict: r?.in_person_ict === true,
        in_person_ict_date: r?.in_person_ict_date ?? '',
        in_person_green: r?.in_person_green === true,
        in_person_green_date: r?.in_person_green_date ?? '',
        lms: {
          word: r?.lms_word === true,
          excel: r?.lms_excel === true,
          ppt: r?.lms_ppt === true,
          green: r?.lms_green === true,
        },
      };
    }),
  );
  const [copied, setCopied] = useState(false);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const saveToDatabase = async () => {
    if (!supabase) return setSaveMsg('Supabase is not configured');
    setSaving(true);
    setSaveMsg(null);
    const { data: { user } } = await supabase.auth.getUser();
    const rows = coordinators.map((c, i) => ({
      centre_id: centreId,
      position: i + 1,
      name: c.name,
      in_person_ict: entries[i].in_person_ict,
      in_person_ict_date: entries[i].in_person_ict && entries[i].in_person_ict_date ? entries[i].in_person_ict_date : null,
      in_person_green: entries[i].in_person_green,
      in_person_green_date: entries[i].in_person_green && entries[i].in_person_green_date ? entries[i].in_person_green_date : null,
      lms_word: entries[i].lms.word,
      lms_excel: entries[i].lms.excel,
      lms_ppt: entries[i].lms.ppt,
      lms_green: entries[i].lms.green,
      updated_at: new Date().toISOString(),
      updated_by: user?.id ?? null,
    }));
    const { error } = await supabase.from('tot_trainees').upsert(rows);
    setSaving(false);
    setSaveMsg(error ? `Save failed: ${error.message}` : 'Saved to database');
  };

  const setInPerson = (index: number, track: 'ict' | 'green', value: boolean) => {
    setEntries(prev => prev.map((e, i) => (i === index ? { ...e, [`in_person_${track}`]: value } : e)));
    setCopied(false);
  };
  const setInPersonDate = (index: number, track: 'ict' | 'green', value: string) => {
    setEntries(prev => prev.map((e, i) => (i === index ? { ...e, [`in_person_${track}_date`]: value } : e)));
    setCopied(false);
  };
  const setModule = (index: number, key: TrainerModule, value: boolean) => {
    setEntries(prev => prev.map((e, i) => (i === index ? { ...e, lms: { ...e.lms, [key]: value } } : e)));
    setCopied(false);
  };

  const onlineDone = entries.filter(lmsComplete).length;
  const ictDone = entries.filter(e => e.in_person_ict).length;
  const greenDone = entries.filter(e => e.in_person_green).length;

  const copyJson = async () => {
    const payload = coordinators.map((c, i) => ({
      name: c.name,
      phone: c.phone,
      email: c.email,
      in_person_ict: entries[i].in_person_ict,
      in_person_green: entries[i].in_person_green,
      lms: entries[i].lms,
      lms_complete: lmsComplete(entries[i]),
    }));
    try {
      await navigator.clipboard.writeText(JSON.stringify(payload, null, 2));
      setCopied(true);
    } catch (error) {
      console.error('Clipboard write failed:', error);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">105 trainers ToT completion</h3>
            <p className="text-sm text-gray-600">
              Online LMS is complete when all four modules are done. In-person is tracked separately.
            </p>
          </div>
          <div className="flex gap-3 text-sm">
            <span className="px-3 py-1 rounded-full bg-dg-blue-50 text-dg-blue-700">
              Online LMS {onlineDone}/{coordinators.length}
            </span>
            <span className="px-3 py-1 rounded-full bg-dg-green-50 text-dg-green-700">
              In-person ICT {ictDone}/{coordinators.length}
            </span>
            <span className="px-3 py-1 rounded-full bg-dg-green-50 text-dg-green-700">
              In-person Green {greenDone}/{coordinators.length}
            </span>
          </div>
        </div>

        <div className="space-y-4">
          {coordinators.map((trainer, index) => (
            <div key={`${trainer.name}-${index}`} className="p-4 rounded-lg border border-gray-200">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-semibold text-gray-900">#{index + 1} {trainer.name}</p>
                  {reviews && (
                    <>
                      <ReviewChip
                        label="ICT"
                        notStarted={!(entries[index].in_person_ict || entries[index].lms.word || entries[index].lms.excel || entries[index].lms.ppt)}
                        state={stateOf(reviews, 'tot_trainees', `${centreId}|${index + 1}`, 'ict')}
                        comment={commentOf(reviews, 'tot_trainees', `${centreId}|${index + 1}`, 'ict')}
                      />
                      <ReviewChip
                        label="Green"
                        notStarted={!(entries[index].in_person_green || entries[index].lms.green)}
                        state={stateOf(reviews, 'tot_trainees', `${centreId}|${index + 1}`, 'green')}
                        comment={commentOf(reviews, 'tot_trainees', `${centreId}|${index + 1}`, 'green')}
                      />
                    </>
                  )}
                </div>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    lmsComplete(entries[index]) ? 'bg-dg-blue-100 text-dg-blue-700' : 'bg-gray-100 text-gray-500'
                  }`}
                >
                  Online LMS {lmsComplete(entries[index]) ? 'complete' : 'in progress'}
                </span>
              </div>

              {(['ict', 'green'] as const).map(track => {
                const done = entries[index][`in_person_${track}`];
                return (
                  <div key={track} className="flex flex-wrap items-center gap-4 text-sm text-gray-700 mb-3">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={done}
                        disabled={!canSave}
                        onChange={e => setInPerson(index, track, e.target.checked)}
                        className="w-4 h-4 accent-dg-green-600"
                      />
                      <Users className="w-4 h-4 text-dg-green-600" />
                      {track === 'ict' ? 'ICT in-person (Betterworld)' : 'Green in-person (Impact Lab)'}
                    </label>
                    {done && (
                      <label className="flex items-center gap-2">
                        Date
                        <input
                          type="date"
                          disabled={!canSave}
                          value={entries[index][`in_person_${track}_date`]}
                          onChange={e => setInPersonDate(index, track, e.target.value)}
                          className="px-2 py-1 text-sm border border-gray-300 rounded-md disabled:bg-gray-100"
                        />
                      </label>
                    )}
                  </div>
                );
              })}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 pl-1">
                {TRAINER_MODULES.map(m => (
                  <label key={m.key} className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={entries[index].lms[m.key]}
                      disabled={!canSave}
                      onChange={e => setModule(index, m.key, e.target.checked)}
                      className="w-4 h-4 accent-dg-blue-600"
                    />
                    <Monitor className="w-4 h-4 text-dg-blue-600" />
                    LMS: {m.label}
                  </label>
                ))}
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
          {canSave && (
            <button
              onClick={saveToDatabase}
              disabled={saving}
              className="px-4 py-2 bg-dg-blue-600 text-white rounded-lg hover:bg-dg-blue-700 disabled:opacity-60 transition-colors font-medium"
            >
              {saving ? 'Saving…' : 'Save to database'}
            </button>
          )}
          {copied && <span className="text-sm text-dg-green-700">Copied to clipboard</span>}
          {saveMsg && <span className="text-sm text-gray-700">{saveMsg}</span>}
        </div>
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

function InfrastructureInputForm({
  centreId,
  canSave,
  infrastructure,
}: {
  centreId: string;
  canSave: boolean;
  infrastructure: any;
}) {
  const [state, setState] = useState<InfraState>(() => toInfraState(infrastructure));
  const [issueText, setIssueText] = useState('');
  const [issueDate, setIssueDate] = useState('');
  const [copied, setCopied] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);

  const saveToDatabase = async () => {
    if (!supabase) return setSaveMsg('Supabase is not configured');
    setSaving(true);
    setSaveMsg(null);
    const { data: { user } } = await supabase.auth.getUser();
    const row = {
      centre_id: centreId,
      overall_status: infrastructure?.overall_status ?? null,
      renovation_status: state.renovation.status,
      renovation_pct: state.renovation.completion_percentage,
      renovation_notes: state.renovation.progress_notes ?? '',
      renovation_issues: state.renovation.issues ?? [],
      rooms: state.renovation.rooms,
      internet_status: state.internet_infrastructure.status,
      internet_bandwidth_mbps: state.internet_infrastructure.bandwidth_mbps,
      internet_access_points: state.internet_infrastructure.access_points,
      electricity_status: state.electricity.status,
      electricity_notes: state.electricity.notes ?? '',
      equipment_status: state.equipment.status,
      equipment_pct: state.equipment.completion_percentage,
      // equipment notes are not editable in this form, so keep the stored value
      equipment_notes: infrastructure?.equipment?.notes ?? '',
      equipment_items: state.equipment.items,
      updated_at: new Date().toISOString(),
      updated_by: user?.id ?? null,
    };
    const { error } = await supabase.from('centre_infrastructure').upsert(row);
    setSaving(false);
    setSaveMsg(error ? `Save failed: ${error.message}` : 'Saved to database');
  };

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
        {canSave && (
          <button
            onClick={saveToDatabase}
            disabled={saving}
            className="px-4 py-2 bg-dg-blue-600 text-white rounded-lg hover:bg-dg-blue-700 disabled:opacity-60 transition-colors font-medium"
          >
            {saving ? 'Saving…' : 'Save to database'}
          </button>
        )}
        {copied && <span className="text-sm text-dg-green-700">Copied to clipboard</span>}
        {saveMsg && <span className="text-sm text-gray-700">{saveMsg}</span>}
      </div>
    </div>
  );
}

// Advanced ICT & green business (DigiFemme): trainers assigned per centre, and yearly student counts
const ADVANCED_MODULES = [
  { key: 'ui_ux', label: 'UI/UX Design' },
  { key: 'ios', label: 'iOS' },
  { key: 'android', label: 'Android' },
  { key: 'green_business', label: 'Green Business' },
] as const;
type AdvancedModuleKey = (typeof ADVANCED_MODULES)[number]['key'];

interface AdvancedTrainerRow {
  id: string;
  name: string;
  in_person_ict: boolean;
  in_person_ict_date: string;
  in_person_green: boolean;
  in_person_green_date: string;
  lms: Record<AdvancedModuleKey, boolean>;
}

export function AdvancedInputForm({
  mode,
  centreId,
  canSave,
  canIct = false,
  canGreen = false,
  trainers,
  advancedByYear,
  reviews,
}: {
  mode: 'trainers' | 'students';
  centreId: string;
  canSave: boolean;
  canIct?: boolean;
  canGreen?: boolean;
  trainers: any[];
  advancedByYear: Record<string, { enrolled?: number; passed?: number }>;
  reviews?: Map<string, ReviewInfo>;
}) {
  const [rows, setRows] = useState<AdvancedTrainerRow[]>(() =>
    trainers.map(t => ({
      id: t.id,
      name: t.name,
      in_person_ict: t.in_person_ict === true,
      in_person_ict_date: t.in_person_ict_date ?? '',
      in_person_green: t.in_person_green === true,
      in_person_green_date: t.in_person_green_date ?? '',
      lms: {
        ui_ux: t.lms_ui_ux === true,
        ios: t.lms_ios === true,
        android: t.lms_android === true,
        green_business: t.lms_green_business === true,
      },
    })),
  );
  const [removedIds, setRemovedIds] = useState<string[]>([]);
  const [years, setYears] = useState<Record<string, { enrolled: number; passed: number }>>(() =>
    Object.fromEntries(
      TRAINING_YEARS.map(y => [y, { enrolled: advancedByYear[y]?.enrolled ?? 0, passed: advancedByYear[y]?.passed ?? 0 }]),
    ),
  );
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);

  const num = (v: string) => Math.max(0, Math.floor(Number(v) || 0));
  // DigiFemme holds both ICT and Green rights: only they add, rename or remove trainers
  const isFull = canIct && canGreen;

  const updateRow = (id: string, patch: Partial<AdvancedTrainerRow>) =>
    setRows(prev => prev.map(r => (r.id === id ? { ...r, ...patch } : r)));
  const removeRow = (id: string) => {
    setRows(prev => prev.filter(r => r.id !== id));
    setRemovedIds(prev => [...prev, id]);
  };
  const addRow = () =>
    setRows(prev => [
      ...prev,
      {
        id: crypto.randomUUID(),
        name: '',
        in_person_ict: false,
        in_person_ict_date: '',
        in_person_green: false,
        in_person_green_date: '',
        lms: { ui_ux: false, ios: false, android: false, green_business: false },
      },
    ]);

  const saveToDatabase = async () => {
    if (!supabase) return setSaveMsg('Supabase is not configured');
    const unnamed = mode === 'trainers' && rows.some(r => !r.name.trim());
    if (unnamed) return setSaveMsg('Enter a name for every trainer (or remove the empty row).');
    setSaving(true);
    setSaveMsg(null);
    const { data: { user } } = await supabase.auth.getUser();
    const now = new Date().toISOString();
    const trainerRows = rows.map(r => ({
      id: r.id,
      centre_id: centreId,
      name: r.name.trim(),
      in_person_ict: r.in_person_ict,
      in_person_ict_date: r.in_person_ict && r.in_person_ict_date ? r.in_person_ict_date : null,
      in_person_green: r.in_person_green,
      in_person_green_date: r.in_person_green && r.in_person_green_date ? r.in_person_green_date : null,
      lms_ui_ux: r.lms.ui_ux,
      lms_ios: r.lms.ios,
      lms_android: r.lms.android,
      lms_green_business: r.lms.green_business,
      updated_at: now,
      updated_by: user?.id ?? null,
    }));
    const yearRows = TRAINING_YEARS.map(y => ({
      centre_id: centreId,
      year: Number(y),
      enrolled: years[y].enrolled,
      passed: years[y].passed,
      updated_at: now,
      updated_by: user?.id ?? null,
    }));
    const results = await Promise.all(mode === 'trainers'
      ? [
          trainerRows.length ? supabase.from('advanced_trainers').upsert(trainerRows) : Promise.resolve({ error: null }),
          removedIds.length ? supabase.from('advanced_trainers').delete().in('id', removedIds) : Promise.resolve({ error: null }),
        ]
      : [supabase.from('centre_training_advanced').upsert(yearRows)]);
    setSaving(false);
    const error = results.find(r => r.error)?.error;
    if (!error) setRemovedIds([]);
    setSaveMsg(error ? `Save failed: ${error.message}` : 'Saved to database');
  };

  const cell = 'w-28 px-2 py-1.5 text-sm text-right border border-gray-200 rounded-md tabular-nums focus:outline-none focus:ring-2 focus:ring-dg-green-500';

  return (
    <div className="space-y-6">
      {mode === 'trainers' && (
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Advanced trainers ToT completion</h3>
            <p className="text-sm text-gray-600">
              Complete = ICT in-person (Betterworld) and Green in-person (Impact Lab) plus all four online modules (UI/UX Design, iOS, Android, Green Business)
            </p>
          </div>

        </div>

        <div className="space-y-4">
          {rows.map((r, index) => (
            <div key={r.id} className="p-4 rounded-lg border border-gray-200">
              <div className="flex flex-wrap items-center gap-3 mb-3">
                <span className="text-xs text-gray-500">#{index + 1}</span>
                <input
                  type="text"
                  value={r.name}
                  disabled={!isFull}
                  placeholder="Trainer name"
                  onChange={e => updateRow(r.id, { name: e.target.value })}
                  className="flex-1 min-w-[200px] px-3 py-1.5 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-dg-green-500 disabled:bg-gray-50"
                />
                {reviews && (
                  <>
                    <ReviewChip
                      label="ICT"
                      notStarted={!(r.in_person_ict || r.lms.ui_ux || r.lms.ios || r.lms.android)}
                      state={stateOf(reviews, 'advanced_trainers', r.id, 'ict')}
                      comment={commentOf(reviews, 'advanced_trainers', r.id, 'ict')}
                    />
                    <ReviewChip
                      label="Green"
                      notStarted={!(r.in_person_green || r.lms.green_business)}
                      state={stateOf(reviews, 'advanced_trainers', r.id, 'green')}
                      comment={commentOf(reviews, 'advanced_trainers', r.id, 'green')}
                    />
                  </>
                )}
                {isFull && (
                  <button
                    type="button"
                    onClick={() => removeRow(r.id)}
                    className="px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 rounded-md"
                  >
                    Remove
                  </button>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-4 mb-3 text-sm text-gray-700">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={r.in_person_ict}
                    disabled={!canIct}
                    onChange={e => updateRow(r.id, { in_person_ict: e.target.checked })}
                    className="w-4 h-4 accent-dg-green-600"
                  />
                  <Users className="w-4 h-4 text-dg-green-600" />
                  ICT in-person (Betterworld)
                </label>
                {r.in_person_ict && (
                  <label className="flex items-center gap-2">
                    Date
                    <input
                      type="date"
                      value={r.in_person_ict_date}
                      disabled={!canIct}
                      onChange={e => updateRow(r.id, { in_person_ict_date: e.target.value })}
                      className="px-2 py-1 text-sm border border-gray-300 rounded-md disabled:bg-gray-100"
                    />
                  </label>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-4 mb-3 text-sm text-gray-700">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={r.in_person_green}
                    disabled={!canGreen}
                    onChange={e => updateRow(r.id, { in_person_green: e.target.checked })}
                    className="w-4 h-4 accent-dg-green-600"
                  />
                  <Users className="w-4 h-4 text-dg-green-600" />
                  Green in-person (Impact Lab)
                </label>
                {r.in_person_green && (
                  <label className="flex items-center gap-2">
                    Date
                    <input
                      type="date"
                      value={r.in_person_green_date}
                      disabled={!canGreen}
                      onChange={e => updateRow(r.id, { in_person_green_date: e.target.value })}
                      className="px-2 py-1 text-sm border border-gray-300 rounded-md disabled:bg-gray-100"
                    />
                  </label>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 pl-1">
                {ADVANCED_MODULES.map(m => (
                  <label key={m.key} className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={r.lms[m.key]}
                      disabled={m.key === 'green_business' ? !canGreen : !canIct}
                      onChange={e => updateRow(r.id, { lms: { ...r.lms, [m.key]: e.target.checked } })}
                      className="w-4 h-4 accent-dg-blue-600"
                    />
                    <Monitor className="w-4 h-4 text-dg-blue-600" />
                    LMS: {m.label}
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>

        {isFull && (
          <button
            type="button"
            onClick={addRow}
            className="mt-4 px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            + Add trainer
          </button>
        )}
      </div>
      )}

      {mode === 'students' && (
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
        <h3 className="text-base font-semibold text-gray-900 mb-3">Advanced students enrolled and passed, by year</h3>
        <table className="text-sm">
          <thead>
            <tr className="text-left text-xs text-gray-500">
              <th className="py-2 pr-6 font-medium">Year</th>
              <th className="py-2 pr-6 font-medium">Enrolled</th>
              <th className="py-2 font-medium">Passed</th>
            </tr>
          </thead>
          <tbody>
            {TRAINING_YEARS.map(y => (
              <tr key={y} className="border-t border-gray-100">
                <td className="py-2 pr-6 text-gray-700">{y}</td>
                <td className="py-2 pr-6">
                  <input
                    type="number"
                    min={0}
                    disabled={!canSave}
                    value={years[y].enrolled}
                    onChange={e => setYears(s => ({ ...s, [y]: { ...s[y], enrolled: num(e.target.value) } }))}
                    className={cell}
                  />
                </td>
                <td className="py-2">
                  <input
                    type="number"
                    min={0}
                    disabled={!canSave}
                    value={years[y].passed}
                    onChange={e => setYears(s => ({ ...s, [y]: { ...s[y], passed: num(e.target.value) } }))}
                    className={cell}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      )}

      <div className="flex flex-wrap items-center gap-3">
        {canSave && (
          <button
            onClick={saveToDatabase}
            disabled={saving}
            className="px-4 py-2 bg-dg-blue-600 text-white rounded-lg hover:bg-dg-blue-700 disabled:opacity-60 transition-colors font-medium"
          >
            {saving ? 'Saving…' : 'Save to database'}
          </button>
        )}
        {saveMsg && <span className="text-sm text-gray-700">{saveMsg}</span>}
      </div>
    </div>
  );
}
// Student training (basic ICT & green practices): yearly enrolled / passed, and passed per module
const TRAINING_YEARS = ['2025', '2026', '2027'] as const;
const BASIC_MODULE_KEYS = [
  { key: 'word', label: 'Microsoft Word' },
  { key: 'excel', label: 'Microsoft Excel' },
  { key: 'ppt', label: 'Microsoft PowerPoint' },
  { key: 'green', label: 'Green Practices' },
] as const;

function BasicTrainingInputForm({
  centreId,
  canSave,
  training,
}: {
  centreId: string;
  canSave: boolean;
  training: any;
}) {
  const school = training?.basic_ict_green?.school_students?.by_year ?? {};
  const university = training?.basic_ict_green?.university_students?.by_year ?? {};
  const [years, setYears] = useState<Record<string, { enrolled: number; passed: number }>>(() =>
    Object.fromEntries(
      TRAINING_YEARS.map(y => [
        y,
        {
          enrolled: (school[y]?.enrolled ?? 0) + (university[y]?.enrolled ?? 0),
          passed: school[y]?.passed ?? 0,
        },
      ]),
    ),
  );
  const [modules, setModules] = useState<Record<string, number>>(() =>
    Object.fromEntries(BASIC_MODULE_KEYS.map(m => [m.key, training?.basic_modules?.[m.key]?.passed ?? 0])),
  );
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);

  const num = (v: string) => Math.max(0, Math.floor(Number(v) || 0));

  const saveToDatabase = async () => {
    if (!supabase) return setSaveMsg('Supabase is not configured');
    setSaving(true);
    setSaveMsg(null);
    const { data: { user } } = await supabase.auth.getUser();
    const now = new Date().toISOString();
    const yearRows = TRAINING_YEARS.map(y => ({
      centre_id: centreId,
      year: Number(y),
      enrolled: years[y].enrolled,
      passed: years[y].passed,
      updated_at: now,
      updated_by: user?.id ?? null,
    }));
    const moduleRows = BASIC_MODULE_KEYS.map(m => ({
      centre_id: centreId,
      module: m.key,
      passed: modules[m.key],
      updated_at: now,
      updated_by: user?.id ?? null,
    }));
    const [a, b] = await Promise.all([
      supabase.from('centre_training_basic').upsert(yearRows),
      supabase.from('centre_basic_modules').upsert(moduleRows),
    ]);
    setSaving(false);
    const error = a.error ?? b.error;
    setSaveMsg(error ? `Save failed: ${error.message}` : 'Saved to database');
  };

  const cell = 'w-28 px-2 py-1.5 text-sm text-right border border-gray-200 rounded-md tabular-nums focus:outline-none focus:ring-2 focus:ring-dg-green-500';

  return (
    <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 space-y-6">
      <div>
        <h3 className="text-base font-semibold text-gray-900 mb-3">Students enrolled and passed, by year</h3>
        <table className="text-sm">
          <thead>
            <tr className="text-left text-xs text-gray-500">
              <th className="py-2 pr-6 font-medium">Year</th>
              <th className="py-2 pr-6 font-medium">Enrolled</th>
              <th className="py-2 font-medium">Passed</th>
            </tr>
          </thead>
          <tbody>
            {TRAINING_YEARS.map(y => (
              <tr key={y} className="border-t border-gray-100">
                <td className="py-2 pr-6 text-gray-700">{y}</td>
                <td className="py-2 pr-6">
                  <input
                    type="number"
                    min={0}
                    disabled={!canSave}
                    value={years[y].enrolled}
                    onChange={e => setYears(s => ({ ...s, [y]: { ...s[y], enrolled: num(e.target.value) } }))}
                    className={cell}
                  />
                </td>
                <td className="py-2">
                  <input
                    type="number"
                    min={0}
                    disabled={!canSave}
                    value={years[y].passed}
                    onChange={e => setYears(s => ({ ...s, [y]: { ...s[y], passed: num(e.target.value) } }))}
                    className={cell}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div>
        <h3 className="text-base font-semibold text-gray-900 mb-3">Passed by module</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {BASIC_MODULE_KEYS.map(m => (
            <label key={m.key} className="flex items-center justify-between gap-4 text-sm text-gray-700">
              <span>{m.label}</span>
              <input
                type="number"
                min={0}
                disabled={!canSave}
                value={modules[m.key]}
                onChange={e => setModules(s => ({ ...s, [m.key]: num(e.target.value) }))}
                className={cell}
              />
            </label>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        {canSave && (
          <button
            onClick={saveToDatabase}
            disabled={saving}
            className="px-4 py-2 bg-dg-blue-600 text-white rounded-lg hover:bg-dg-blue-700 disabled:opacity-60 transition-colors font-medium"
          >
            {saving ? 'Saving…' : 'Save to database'}
          </button>
        )}
        {saveMsg && <span className="text-sm text-gray-700">{saveMsg}</span>}
      </div>
    </div>
  );
}

type InputSection = 'tot' | 'infrastructure' | 'training';

// Advanced programme data (trainers, cohorts, students by year) is entered on the Advanced programme input page
const INPUT_SECTIONS: Array<{ value: InputSection; label: string }> = [
  { value: 'tot', label: '105 trainers ToT completion' },
  { value: 'training', label: 'Student training (basic ICT & green practices)' },
  { value: 'infrastructure', label: 'Infrastructure (renovation, equipment)' },
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

// Basic ToT completion per trainer. Completed = in-person AND LMS both done.
interface TotBasicRecord {
  center_id: string;
  name: string;
  in_person_completed: boolean | null;
  in_person_ict?: boolean;
  in_person_green?: boolean;
  in_person_ict_date?: string | null;
  in_person_green_date?: string | null;
  lms_completed: boolean | null;
  lms_word?: boolean;
  lms_excel?: boolean;
  lms_ppt?: boolean;
  lms_green?: boolean;
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

// Advanced trainers (DigiFemme): summary bar + one card per trainer, same layout as the basic trainers
const ADVANCED_CHIP_MODULES = [
  { key: 'lms_ui_ux', label: 'UI/UX Design', by: 'Betterworld' },
  { key: 'lms_ios', label: 'iOS', by: 'Betterworld' },
  { key: 'lms_android', label: 'Android', by: 'Betterworld' },
  { key: 'lms_green_business', label: 'Green Business', by: 'Impact Lab' },
] as const;

function AdvancedTrainerProgress({ trainers }: { trainers: any[] }) {
  const isDone = (t: any) =>
    t.in_person_ict === true && t.in_person_green === true && ADVANCED_CHIP_MODULES.every(m => t[m.key] === true);

  const chip = (on: boolean) =>
    `inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium border ${
      on ? 'bg-dg-green-50 text-dg-green-700 border-dg-green-200' : 'bg-white text-gray-400 border-gray-200'
    }`;

  return (
    <div className="space-y-4">
      {trainers.length === 0 ? (
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 text-center">
          <p className="text-gray-500">No advanced trainer assigned</p>
        </div>
      ) : (
        trainers.map((t, idx) => {
          const complete = isDone(t);
          const lmsDone = ADVANCED_CHIP_MODULES.every(m => t[m.key] === true);
          const started = t.in_person_ict === true || t.in_person_green === true || ADVANCED_CHIP_MODULES.some(m => t[m.key] === true);
          const badge = complete
            ? { text: 'ToT completed', cls: 'bg-dg-blue-600 text-white' }
            : started
              ? { text: 'ToT in progress', cls: 'bg-dg-amber-100 text-dg-amber-700' }
              : { text: 'ToT not started', cls: 'bg-gray-100 text-gray-600' };
          const border = complete ? 'border-l-dg-blue-500' : started ? 'border-l-dg-amber-500' : 'border-l-gray-300';
          return (
            <div key={t.id ?? idx} className={`bg-white rounded-xl p-6 shadow-sm border border-gray-100 border-l-4 ${border}`}>
              <div className="flex items-start justify-between mb-3">
                <h4 className="text-lg font-semibold text-gray-900">{t.name}</h4>
              </div>
              <div className="flex flex-wrap items-center gap-2 mb-3">
                <span className={`px-3 py-1 rounded-full text-xs font-semibold ${badge.cls}`}>{badge.text}</span>
                <span className={chip(t.in_person_ict === true)} title="Entered by Betterworld">
                  <span className="font-bold">{t.in_person_ict === true ? '✓' : '○'}</span>
                  In-person ICT{t.in_person_ict === true && t.in_person_ict_date ? ` · ${t.in_person_ict_date}` : ''}
                </span>
                <span className={chip(t.in_person_green === true)} title="Entered by Impact Lab">
                  <span className="font-bold">{t.in_person_green === true ? '✓' : '○'}</span>
                  In-person Green{t.in_person_green === true && t.in_person_green_date ? ` · ${t.in_person_green_date}` : ''}
                </span>
                <span className={chip(lmsDone)}>
                  <span className="font-bold">{lmsDone ? '✓' : '○'}</span>
                  Online (LMS)
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                {ADVANCED_CHIP_MODULES.map(m => (
                  <span key={m.key} className={chip(t[m.key] === true)} title={`Entered by ${m.by}`}>
                    <span className="font-bold">{t[m.key] === true ? '✓' : '○'}</span>
                    {m.label}
                  </span>
                ))}
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}

// Advanced cohorts that run at this centre: registered, graduated and the trainers running it
function CentreCohortsCard({
  centreId,
  yearRows,
}: {
  centreId: string;
  yearRows: Array<{ year: string | number; enrolled: number; passed: number }>;
}) {
  const [rows, setRows] = useState<Array<{ cohort_id: string; name: string; start_month: string; enrolled: number; graduated: number; trainers: string[] }>>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!supabase) return;
    Promise.all([
      supabase.from('advanced_cohort_centres').select('cohort_id, enrolled, graduated, advanced_cohorts(name, start_month)').eq('centre_id', centreId),
      supabase.from('advanced_cohort_trainers').select('cohort_id, advanced_trainers(name)').eq('centre_id', centreId),
    ]).then(([cc, tt]) => {
      const tmap = new Map<string, string[]>();
      (tt.data ?? []).forEach((r: any) => tmap.set(r.cohort_id, [...(tmap.get(r.cohort_id) ?? []), r.advanced_trainers?.name ?? '']));
      setRows(
        (cc.data ?? []).map((r: any) => ({
          cohort_id: r.cohort_id,
          name: r.advanced_cohorts?.name ?? '',
          start_month: r.advanced_cohorts?.start_month ?? '',
          enrolled: r.enrolled ?? 0,
          graduated: r.graduated ?? 0,
          trainers: tmap.get(r.cohort_id) ?? [],
        })),
      );
      setLoaded(true);
    });
  }, [centreId]);

  return (
    <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
      <h3 className="text-base font-semibold text-gray-900 mb-3">Advanced ICT & Green Business</h3>
      {!loaded ? (
        <p className="text-sm text-gray-500">Loading…</p>
      ) : rows.length === 0 ? (
        <p className="text-sm text-gray-500">No advanced cohort runs at this centre yet</p>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-gray-500">
              <th className="py-2 pr-4 font-medium">Cohort</th>
              <th className="py-2 pr-4 font-medium">Trainers</th>
              <th className="py-2 pr-4 font-medium text-right">Registered</th>
              <th className="py-2 font-medium text-right">Graduated</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(r => (
              <tr key={r.cohort_id} className="border-t border-gray-100">
                <td className="py-2 pr-4 text-gray-800">
                  {r.name}
                  {r.start_month && <span className="block text-xs text-gray-500">starts {r.start_month}</span>}
                </td>
                <td className="py-2 pr-4 text-gray-700">{r.trainers.length ? r.trainers.join(', ') : <span className="text-gray-400">No trainer assigned</span>}</td>
                <td className="py-2 pr-4 text-right tabular-nums">{r.enrolled}</td>
                <td className="py-2 text-right tabular-nums">{r.graduated}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t border-gray-200 font-semibold text-gray-900">
              <td className="py-2 pr-4">Total</td>
              <td className="py-2 pr-4" />
              <td className="py-2 pr-4 text-right tabular-nums">{rows.reduce((n, r) => n + r.enrolled, 0)}</td>
              <td className="py-2 text-right tabular-nums">{rows.reduce((n, r) => n + r.graduated, 0)}</td>
            </tr>
          </tfoot>
        </table>
      )}
      <div className="mt-6 pt-4 border-t border-gray-100">
        <h4 className="text-sm font-semibold text-gray-900 mb-2">By year</h4>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-gray-500">
              <th className="py-2 font-medium">Year</th>
              <th className="py-2 font-medium text-right">Enrolled</th>
              <th className="py-2 font-medium text-right">Passed</th>
            </tr>
          </thead>
          <tbody>
            {yearRows.map(y => (
              <tr key={String(y.year)} className="border-t border-gray-100">
                <td className="py-2 text-gray-700">{y.year}</td>
                <td className="py-2 text-right tabular-nums">{y.enrolled}</td>
                <td className="py-2 text-right tabular-nums">{y.passed}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t border-gray-200 font-semibold text-gray-900">
              <td className="py-2">Total</td>
              <td className="py-2 text-right tabular-nums">{yearRows.reduce((n, y) => n + y.enrolled, 0)}</td>
              <td className="py-2 text-right tabular-nums">{yearRows.reduce((n, y) => n + y.passed, 0)}</td>
            </tr>
          </tfoot>
        </table>
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
  const [reviews, setReviews] = useState<Map<string, ReviewInfo>>(new Map());
  // Signed-in profile decides whether Data Input is shown for this centre
  const [profile, setProfile] = useState<Profile | null>(null);

  useEffect(() => {
    const load = () => {
      getSession().then(session => (session ? getProfile() : null)).then(p => setProfile(p));
    };
    load();
    return onAuthChange(load);
  }, []);

  // Per-section rights (mirrors the database policies)
  const centreKey = id ?? '';
  const canTot = isApproved(profile) && canEditSection(profile, centreKey, 'tot');
  const canInfra = isApproved(profile) && canEditSection(profile, centreKey, 'infra');
  const canTraining = isApproved(profile) && canEditSection(profile, centreKey, 'training');
  const canInput = canTot || canInfra || canTraining;
  const SECTION_RIGHTS: Record<InputSection, boolean> = {
    tot: canTot,
    training: canTraining,
    infrastructure: canInfra,
  };
  const allowedSections = INPUT_SECTIONS.filter(s => SECTION_RIGHTS[s.value]);
  const effectiveSection = allowedSections.find(s => s.value === inputSection)?.value ?? allowedSections[0]?.value;

  useEffect(() => {
    loadTotRecords()
      .then(records => setTotBasic(records))
      .catch(() => setTotBasic([]));
    loadReviews().then(setReviews).catch(() => setReviews(new Map()));
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
    <div className="min-h-screen" style={{ backgroundColor: '#FAFAF7' }}>
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mt-6 bg-white border-b border-gray-200 sticky top-0 z-40 shadow-sm"
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
                {center.note && (
                  <p className="mt-2 text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 max-w-2xl">
                    <span className="font-semibold">Note: </span>{center.note}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Tab Navigation */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-6">
          <div className="flex gap-8 overflow-x-auto">
            {(canInput ? (['overview', 'input'] as const) : (['overview'] as const)).map((tab) => (
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

        {/* Coordinators Tab */}
        {activeTab === 'overview' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4 mt-10">
            <h2 className="text-xl font-semibold text-gray-900">Trainers</h2>

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
                <p className="text-gray-500">No trainers assigned</p>
              </div>
            )}
          </motion.div>
        )}

        {/* Training Tab */}
        {activeTab === "overview" && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6 mt-10">
            <h2 className="text-xl font-semibold text-gray-900">Student Training</h2>
            <BasicModuleProgress center={center} />
          </motion.div>
        )}

        {/* Advanced Trainers Tab */}
        {activeTab === 'overview' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4 mt-10">
            <h2 className="text-xl font-semibold text-gray-900">Advanced Trainers</h2>
            <AdvancedTrainerProgress trainers={center.advanced_trainers ?? []} />
            <CentreCohortsCard
              centreId={center.id}
              yearRows={ACTUAL_YEARS.map(y => ({ year: y, enrolled: sumAdvancedYear(center, y, "enrolled"), passed: sumAdvancedYear(center, y, "passed") }))}
            />
          </motion.div>
        )}
        {/* Data Input Tab */}
        <div className={activeTab === 'input' ? 'space-y-6' : 'hidden'}>
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 flex flex-wrap items-center gap-3">
            <label htmlFor="input-section" className="text-sm font-medium text-gray-700">Data to enter</label>
            <select
              id="input-section"
              value={effectiveSection ?? ''}
              onChange={e => setInputSection(e.target.value as InputSection)}
              className="px-3 py-2 border border-gray-300 rounded-md bg-white text-sm min-w-[280px]"
            >
              {allowedSections.map(section => (
                <option key={section.value} value={section.value}>{section.label}</option>
              ))}
            </select>
          </div>

          {/* Forms stay mounted so unsaved input survives switching sections */}
          <div className={effectiveSection === 'tot' ? '' : 'hidden'}>
            {center.center_coordinators && center.center_coordinators.length > 0 ? (
              <ToTInputForm
                key={totBasic.length}
                centreId={center.id}
                canSave={canTot}
                coordinators={center.center_coordinators as TrainerWithToT[]}
                records={totBasic.filter(r => r.center_id === center.id)}
                reviews={reviews}
              />
            ) : (
              <EmptyInputNotice message="No trainers registered for this center" />
            )}
          </div>
          <div className={effectiveSection === 'training' ? '' : 'hidden'}>
            <BasicTrainingInputForm centreId={center.id} canSave={canTraining} training={center.training} />
          </div>
          <div className={effectiveSection === 'infrastructure' ? '' : 'hidden'}>
            {center.infrastructure ? (
              <InfrastructureInputForm centreId={center.id} canSave={canInfra} infrastructure={center.infrastructure} />
            ) : (
              <EmptyInputNotice message="No infrastructure data for this center" />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
