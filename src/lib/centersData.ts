import { createClient } from '@supabase/supabase-js';

// Supabase is the source for editable centre data (status, targets, infrastructure,
// coordinators, ToT). The static JSON keeps reference-only fields (coordinates, notes,
// greenpreneur, metadata) and is the fallback if Supabase cannot be reached.

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined;

export const supabase = url && key ? createClient(url, key) : null;

export interface TotRecord {
  id: string;
  name: string;
  center_id: string;
  placeholder: boolean;
  in_person_completed: boolean | null;
  lms_completed: boolean | null;
  lms_word: boolean;
  lms_excel: boolean;
  lms_ppt: boolean;
  lms_green: boolean;
  in_person_date: string | null;
  completed: boolean;
}

interface CentreRow {
  id: string;
  name: string;
  type: string;
  region: string | null;
  phase: string;
  status: string;
  target_basic_ict: number;
}

interface InfraRow {
  centre_id: string;
  renovation_issues: unknown[] | null;
  overall_status: string | null;
  renovation_status: string | null;
  renovation_pct: number;
  renovation_notes: string | null;
  rooms: Record<string, unknown>;
  internet_status: string | null;
  internet_bandwidth_mbps: number | null;
  internet_access_points: number | null;
  electricity_status: string | null;
  electricity_notes: string | null;
  equipment_status: string | null;
  equipment_pct: number;
  equipment_notes: string | null;
  equipment_items: unknown[];
}

interface CoordinatorRow {
  centre_id: string;
  position: number;
  name: string;
  phone: string | null;
  email: string | null;
}

async function fetchStatic<T>(path: string): Promise<T> {
  const r = await fetch(path);
  return r.json() as Promise<T>;
}

/** Centre list in the same shape the components already use. */
export async function loadCenters(): Promise<any[]> {
  const base = await fetchStatic<any[]>('/centers.json');
  if (!supabase) return base;

  try {
    const [centresRes, infraRes, coordRes, gpRes, trRes, modRes, advTrRes, advStRes] = await Promise.all([
      supabase.from('centres').select('*').order('sort_order'),
      supabase.from('centre_infrastructure').select('*'),
      supabase.from('centre_coordinators').select('*').order('position'),
      supabase.from('centre_greenpreneur').select('centre_id, data'),
      supabase.from('centre_training_basic').select('centre_id, year, enrolled, passed'),
      supabase.from('centre_basic_modules').select('centre_id, module, passed'),
      supabase.from('advanced_trainers').select('*').order('name'),
      supabase.from('centre_training_advanced').select('centre_id, year, enrolled, passed'),
    ]);
    if (centresRes.error || infraRes.error || coordRes.error || gpRes.error || trRes.error || modRes.error) {
      throw new Error('supabase read failed');
    }

    const centres = centresRes.data as CentreRow[];
    if (!centres.length) return base;

    const gpBy = new Map((gpRes.data ?? []).map((r: any) => [r.centre_id, r.data as Record<string, unknown>]));

    // Student training: yearly totals and module passes per centre
    const trainingBy = new Map<string, any>();
    (trRes.data ?? []).forEach((r: any) => {
      const t = trainingBy.get(r.centre_id) ?? { by_year: {} as Record<string, { enrolled: number; passed: number }>, enrolled: 0, passed: 0 };
      t.by_year[String(r.year)] = { enrolled: r.enrolled, passed: r.passed };
      t.enrolled += r.enrolled;
      t.passed += r.passed;
      trainingBy.set(r.centre_id, t);
    });
    const advTrBy = new Map<string, any[]>();
    (advTrRes.data ?? []).forEach((t: any) => advTrBy.set(t.centre_id, [...(advTrBy.get(t.centre_id) ?? []), t]));
    const advStBy = new Map<string, any>();
    (advStRes.data ?? []).forEach((r: any) => {
      const a = advStBy.get(r.centre_id) ?? { by_year: {} as Record<string, { enrolled: number; passed: number }>, enrolled: 0, passed: 0 };
      a.by_year[String(r.year)] = { enrolled: r.enrolled, passed: r.passed };
      a.enrolled += r.enrolled;
      a.passed += r.passed;
      advStBy.set(r.centre_id, a);
    });
    const modulesBy = new Map<string, Record<string, { passed: number }>>();
    (modRes.data ?? []).forEach((r: any) => {
      modulesBy.set(r.centre_id, { ...(modulesBy.get(r.centre_id) ?? {}), [r.module]: { passed: r.passed } });
    });
    const infraBy = new Map((infraRes.data as InfraRow[]).map(r => [r.centre_id, r]));
    const coordsBy = new Map<string, CoordinatorRow[]>();
    (coordRes.data as CoordinatorRow[]).forEach(c => coordsBy.set(c.centre_id, [...(coordsBy.get(c.centre_id) ?? []), c]));
    const baseBy = new Map(base.map(b => [b.id, b]));

    return centres.map(row => {
      const b = baseBy.get(row.id) ?? {};
      const infra = infraBy.get(row.id);
      const baseInfra = b.infrastructure ?? {};
      return {
        ...b,
        id: row.id,
        name: row.name,
        type: row.type,
        region: row.region ?? b.region,
        phase: row.phase,
        status: row.status,
        target_basic_ict: row.target_basic_ict,
        center_coordinators: (coordsBy.get(row.id) ?? []).map(c => ({ name: c.name, phone: c.phone ?? '', email: c.email ?? '' })),
        greenpreneur: gpBy.get(row.id) && Object.keys(gpBy.get(row.id)!).length ? gpBy.get(row.id) : b.greenpreneur,
        advanced_trainers: (advTrBy.get(row.id) ?? []).map(t => ({
          id: t.id,
          name: t.name,
          in_person_ict: t.in_person_ict === true,
          in_person_ict_date: t.in_person_ict_date ?? null,
          in_person_green: t.in_person_green === true,
          in_person_green_date: t.in_person_green_date ?? null,
          lms_ui_ux: t.lms_ui_ux === true,
          lms_ios: t.lms_ios === true,
          lms_android: t.lms_android === true,
          lms_green_business: t.lms_green_business === true,
          lms_completed: t.lms_completed === true,
        })),
        training: {
          ...(b.training ?? {}),
          ...(advStBy.has(row.id) ? { advanced_ict_green: advStBy.get(row.id) } : {}),
          ...(trainingBy.has(row.id) ? {
              basic_ict_green: {
                school_students: {
                  enrolled: trainingBy.get(row.id).enrolled,
                  passed_assessment: trainingBy.get(row.id).passed,
                  by_year: trainingBy.get(row.id).by_year,
                },
                university_students: { enrolled: 0, by_year: {} },
              },
              basic_modules: modulesBy.get(row.id) ?? {},
            } : {}),
        },
        infrastructure: infra
          ? {
              ...baseInfra,
              overall_status: infra.overall_status ?? baseInfra.overall_status,
              renovation: {
                ...(baseInfra.renovation ?? {}),
                status: infra.renovation_status,
                completion_percentage: infra.renovation_pct,
                progress_notes: infra.renovation_notes ?? '',
                rooms: infra.rooms,
                issues: infra.renovation_issues ?? [],
              },
              internet_infrastructure: {
                ...(baseInfra.internet_infrastructure ?? {}),
                status: infra.internet_status,
                bandwidth_mbps: infra.internet_bandwidth_mbps,
                access_points: infra.internet_access_points ?? 0,
              },
              electricity: { status: infra.electricity_status, notes: infra.electricity_notes ?? '' },
              equipment: {
                status: infra.equipment_status,
                completion_percentage: infra.equipment_pct,
                notes: infra.equipment_notes ?? '',
                items: infra.equipment_items,
              },
            }
          : baseInfra,
      };
    });
  } catch {
    return base;
  }
}

/** Basic ToT trainee records (in-person / LMS flags). */
export async function loadTotRecords(): Promise<TotRecord[]> {
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('tot_trainees')
        .select('centre_id, position, name, in_person_completed, lms_completed, lms_word, lms_excel, lms_ppt, lms_green, in_person_date')
        .order('centre_id')
        .order('position');
      if (!error && data) {
        return data.map((r: any) => ({
          id: `basic-${r.centre_id}-${r.position}`,
          name: r.name,
          center_id: r.centre_id,
          placeholder: false,
          in_person_completed: r.in_person_completed,
          lms_completed: r.lms_completed,
          lms_word: r.lms_word === true,
          lms_excel: r.lms_excel === true,
          lms_ppt: r.lms_ppt === true,
          lms_green: r.lms_green === true,
          in_person_date: r.in_person_date ?? null,
          completed: r.in_person_completed === true && r.lms_completed === true,
        }));
      }
    } catch {
      // fall through to the static file
    }
  }
  const data = await fetchStatic<{ tot_basic: TotRecord[] }>('/training_records.json');
  return data.tot_basic ?? [];
}
