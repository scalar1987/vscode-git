import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../../lib/centersData';
import { canEditSection, isApproved, type Profile } from '../../lib/auth';
import { ReviewChip, commentOf, stateOf, type ReviewInfo } from '../../lib/reviews';

// Advanced ToT trainers: one list for the whole programme.
// A trainer is one person (ToT status belongs to the person) and can work at several centres.
// DigiFemme adds, renames, assigns and deactivates trainers; Betterworld ticks ICT, Impact Lab ticks Green.

interface Trainer {
  id: string;
  name: string;
  active: boolean;
  in_person_ict: boolean;
  in_person_ict_date: string | null;
  in_person_green: boolean;
  in_person_green_date: string | null;
  lms_ui_ux: boolean;
  lms_ios: boolean;
  lms_android: boolean;
  lms_green_business: boolean;
}

const ICT_FIELDS = ['in_person_ict', 'in_person_ict_date', 'lms_ui_ux', 'lms_ios', 'lms_android'] as const;
const GREEN_FIELDS = ['in_person_green', 'in_person_green_date', 'lms_green_business'] as const;
const TOT_FIELDS = [...ICT_FIELDS, ...GREEN_FIELDS] as const;
const ICT_MODULES = [
  { key: 'lms_ui_ux', label: 'UI/UX' },
  { key: 'lms_ios', label: 'iOS' },
  { key: 'lms_android', label: 'Android' },
] as const;

const isDone = (t: Trainer) =>
  t.in_person_ict && t.in_person_green && t.lms_ui_ux && t.lms_ios && t.lms_android && t.lms_green_business;

const blank = (id: string): Trainer => ({
  id,
  name: '',
  active: true,
  in_person_ict: false,
  in_person_ict_date: null,
  in_person_green: false,
  in_person_green_date: null,
  lms_ui_ux: false,
  lms_ios: false,
  lms_android: false,
  lms_green_business: false,
});

const sameSet = (a: string[], b: string[]) => a.length === b.length && a.every(x => b.includes(x));

export function TrainerRoster({
  profile,
  centres,
  reviews,
  onSaved,
}: {
  profile: Profile | null;
  centres: Array<{ id: string; name: string }>;
  reviews: Map<string, ReviewInfo>;
  onSaved?: () => void;
}) {
  const canIct = isApproved(profile) && canEditSection(profile, '', 'advanced_ict');
  const canGreen = isApproved(profile) && canEditSection(profile, '', 'advanced_green');
  // Both tracks = DigiFemme (or GGGI): manages the list itself
  const canManage = canIct && canGreen;

  const [saved, setSaved] = useState<Trainer[]>([]);
  const [savedLinks, setSavedLinks] = useState<Record<string, string[]>>({});
  const [drafts, setDrafts] = useState<Record<string, Trainer>>({});
  const [linkDrafts, setLinkDrafts] = useState<Record<string, string[]>>({});
  const [newIds, setNewIds] = useState<string[]>([]);
  const [query, setQuery] = useState('');
  const [showInactive, setShowInactive] = useState(false);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  const centreName = useMemo(() => new Map(centres.map(c => [c.id, c.name])), [centres]);

  const load = async () => {
    if (!supabase) return;
    const [t, l] = await Promise.all([
      supabase
        .from('advanced_trainers')
        .select('id, name, active, in_person_ict, in_person_ict_date, in_person_green, in_person_green_date, lms_ui_ux, lms_ios, lms_android, lms_green_business')
        .order('name'),
      supabase.from('advanced_trainer_centres').select('trainer_id, centre_id'),
    ]);
    setSaved((t.data ?? []) as Trainer[]);
    const map: Record<string, string[]> = {};
    (l.data ?? []).forEach((r: any) => (map[r.trainer_id] = [...(map[r.trainer_id] ?? []), r.centre_id]));
    setSavedLinks(map);
    setLoaded(true);
  };

  useEffect(() => {
    load();
  }, []);

  const rowOf = (id: string): Trainer => drafts[id] ?? saved.find(t => t.id === id) ?? blank(id);
  const linksOf = (id: string): string[] => linkDrafts[id] ?? savedLinks[id] ?? [];

  const edit = (id: string, patch: Partial<Trainer>) => {
    setDrafts(prev => ({ ...prev, [id]: { ...rowOf(id), ...patch } }));
    setMsg(null);
  };
  const setLinks = (id: string, next: string[]) => {
    setLinkDrafts(prev => ({ ...prev, [id]: next }));
    setMsg(null);
  };

  // Rows that differ from what is saved
  const changedIds = useMemo(() => {
    const ids = new Set<string>(newIds);
    Object.entries(drafts).forEach(([id, d]) => {
      const s = saved.find(t => t.id === id);
      if (!s || (['name', ...TOT_FIELDS] as const).some(k => (d as any)[k] !== (s as any)[k])) ids.add(id);
    });
    Object.entries(linkDrafts).forEach(([id, l]) => {
      if (!sameSet(l, savedLinks[id] ?? [])) ids.add(id);
    });
    return ids;
  }, [drafts, linkDrafts, saved, savedLinks, newIds]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = [
      ...newIds.map(id => rowOf(id)),
      ...saved.filter(t => (showInactive ? !t.active : t.active)).map(t => rowOf(t.id)),
    ];
    if (!q) return list;
    return list.filter(
      t =>
        newIds.includes(t.id) ||
        t.name.toLowerCase().includes(q) ||
        linksOf(t.id).some(c => (centreName.get(c) ?? c).toLowerCase().includes(q)),
    );
  }, [saved, drafts, linkDrafts, savedLinks, newIds, query, showInactive, centreName]);

  const activeCount = saved.filter(t => t.active).length;
  const inactiveCount = saved.length - activeCount;
  const doneCount = saved.filter(t => t.active && isDone(rowOf(t.id))).length;

  const addTrainer = () => {
    const id = crypto.randomUUID();
    setNewIds(prev => [id, ...prev]);
    setDrafts(prev => ({ ...prev, [id]: blank(id) }));
    setShowInactive(false);
    setQuery('');
  };

  const discard = () => {
    setDrafts({});
    setLinkDrafts({});
    setNewIds([]);
    setMsg(null);
  };

  const save = async () => {
    const db = supabase;
    if (!db) return;
    const ids = [...changedIds];
    const unnamed = ids.filter(id => !rowOf(id).name.trim());
    if (unnamed.length) return setMsg('Enter a name for every new trainer (or discard the empty row).');
    setSaving(true);
    setMsg(null);
    const { data: { user } } = await db.auth.getUser();
    const now = new Date().toISOString();
    const errors: string[] = [];

    for (const id of ids) {
      const d = rowOf(id);
      const s = saved.find(t => t.id === id);
      const links = linksOf(id);
      const tot = Object.fromEntries(TOT_FIELDS.map(k => [k, d[k]])) as Partial<Trainer>;
      // A date only goes with a ticked in-person session
      if (!tot.in_person_ict) tot.in_person_ict_date = null;
      if (!tot.in_person_green) tot.in_person_green_date = null;
      if (!s) {
        const { error } = await db.from('advanced_trainers').insert({
          id,
          name: d.name.trim(),
          centre_id: links[0] ?? null,
          ...tot,
          updated_at: now,
          updated_by: user?.id ?? null,
        });
        if (error) {
          errors.push(`${d.name}: ${error.message}`);
          continue;
        }
      } else {
        const patch: Record<string, unknown> = {};
        if (d.name.trim() !== s.name) patch.name = d.name.trim();
        // Send only the fields that changed, so one organisation never rewrites the other's track
        TOT_FIELDS.forEach(k => {
          if ((tot as any)[k] !== (s as any)[k]) patch[k] = (tot as any)[k];
        });
        // The review queue follows ToT changes only (a rename is not ToT data)
        if (TOT_FIELDS.some(k => k in patch)) {
          patch.updated_at = now;
          patch.updated_by = user?.id ?? null;
        }
        if (Object.keys(patch).length) {
          const { error } = await db.from('advanced_trainers').update(patch).eq('id', id);
          if (error) {
            errors.push(`${d.name}: ${error.message}`);
            continue;
          }
        }
      }
      // Centre assignments
      const before = savedLinks[id] ?? [];
      const add = links.filter(c => !before.includes(c));
      const remove = before.filter(c => !links.includes(c));
      if (add.length) {
        const { error } = await db.from('advanced_trainer_centres').insert(add.map(c => ({ trainer_id: id, centre_id: c })));
        if (error) errors.push(`${d.name} (centres): ${error.message}`);
      }
      if (remove.length) {
        const { error } = await db.from('advanced_trainer_centres').delete().eq('trainer_id', id).in('centre_id', remove);
        if (error) errors.push(`${d.name} (centres): ${error.message}`);
      }
    }

    setSaving(false);
    discard();
    await load();
    onSaved?.();
    setMsg(errors.length ? `Some changes were not saved: ${errors.join('; ')}` : `Saved ${ids.length} trainer${ids.length === 1 ? '' : 's'}`);
  };

  // Deactivating hides the trainer and leaves them out of counts; the record and its history stay
  const setActive = async (t: Trainer, active: boolean) => {
    const db = supabase;
    if (!db) return;
    if (!active && !window.confirm(`Deactivate ${t.name}? They are hidden from the lists and not counted. You can reactivate them later.`)) return;
    setSaving(true);
    const { error } = await db.from('advanced_trainers').update({ active }).eq('id', t.id);
    setSaving(false);
    if (error) return setMsg(`Could not update ${t.name}: ${error.message}`);
    await load();
    onSaved?.();
    setMsg(`${t.name} ${active ? 'reactivated' : 'deactivated'}`);
  };

  const box = 'w-4 h-4 accent-dg-green-600';
  const dateCls = 'px-2 py-1 text-sm border border-gray-300 rounded-md disabled:bg-gray-100';

  return (
    <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-gray-900">Advanced trainers</h2>
          <p className="text-sm text-gray-600">
            {activeCount} trainers · {doneCount} with every item ticked (ICT and Green in-person plus all four online modules).
            Progress counts them once GGGI approves both tracks.
          </p>
          <p className="text-xs text-gray-500 mt-1">
            DigiFemme adds trainers and assigns their centres · Betterworld ticks ICT · Impact Lab ticks Green
          </p>
        </div>
        {canManage && !showInactive && (
          <button
            type="button"
            onClick={addTrainer}
            className="px-4 py-2 text-sm font-medium border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            + Add trainer
          </button>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <input
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search trainer or centre"
          className="flex-1 min-w-[240px] max-w-md px-3 py-2 border border-gray-300 rounded-md bg-white text-sm focus:outline-none focus:ring-2 focus:ring-dg-green-500"
        />
        {inactiveCount > 0 && (
          <button
            type="button"
            onClick={() => setShowInactive(v => !v)}
            className="text-sm text-gray-600 hover:text-gray-900 underline-offset-2 hover:underline"
          >
            {showInactive ? 'Back to active trainers' : `Show inactive (${inactiveCount})`}
          </button>
        )}
      </div>

      {!loaded ? (
        <p className="text-sm text-gray-400">Loading…</p>
      ) : visible.length === 0 ? (
        <p className="text-sm text-gray-500">{query ? 'No trainer found.' : 'No trainers yet.'}</p>
      ) : (
        <ul className="space-y-3">
          {visible.map(t => {
            const links = linksOf(t.id);
            const isNew = newIds.includes(t.id);
            const changed = changedIds.has(t.id);
            const free = centres.filter(c => !links.includes(c.id));
            return (
              <li
                key={t.id}
                className={`p-4 rounded-lg border ${changed ? 'border-dg-blue-300 bg-dg-blue-50/30' : 'border-gray-200'} ${t.active ? '' : 'opacity-70'}`}
              >
                <div className="flex flex-wrap items-center gap-3">
                  {canManage && t.active ? (
                    <input
                      type="text"
                      value={t.name}
                      placeholder="Trainer name"
                      onChange={e => edit(t.id, { name: e.target.value })}
                      className="flex-1 min-w-[200px] px-3 py-1.5 text-sm font-medium border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-dg-green-500"
                    />
                  ) : (
                    <span className="flex-1 min-w-[200px] text-sm font-semibold text-gray-900">{t.name}</span>
                  )}
                  {!isNew && (
                    <>
                      <ReviewChip
                        label="ICT"
                        notStarted={!(t.in_person_ict || t.lms_ui_ux || t.lms_ios || t.lms_android)}
                        state={stateOf(reviews, 'advanced_trainers', t.id, 'ict')}
                        comment={commentOf(reviews, 'advanced_trainers', t.id, 'ict')}
                      />
                      <ReviewChip
                        label="Green"
                        notStarted={!(t.in_person_green || t.lms_green_business)}
                        state={stateOf(reviews, 'advanced_trainers', t.id, 'green')}
                        comment={commentOf(reviews, 'advanced_trainers', t.id, 'green')}
                      />
                    </>
                  )}
                  <span
                    className={`px-2 py-0.5 rounded-full text-xs font-semibold ${isDone(t) ? 'bg-dg-green-50 text-dg-green-700' : 'bg-gray-100 text-gray-600'}`}
                  >
                    {isDone(t) ? 'ToT complete' : 'ToT in progress'}
                  </span>
                  {canManage && isNew && (
                    <button
                      type="button"
                      onClick={() => {
                        setNewIds(prev => prev.filter(x => x !== t.id));
                        setDrafts(prev => {
                          const next = { ...prev };
                          delete next[t.id];
                          return next;
                        });
                      }}
                      className="px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded-md"
                    >
                      Discard
                    </button>
                  )}
                  {canManage && !isNew && (
                    <button
                      type="button"
                      onClick={() => setActive(t, !t.active)}
                      disabled={saving || (t.active && changed)}
                      title={t.active && changed ? 'Save or discard the changes first' : undefined}
                      className={`px-3 py-1.5 text-sm rounded-md disabled:opacity-40 ${t.active ? 'text-red-600 hover:bg-red-50' : 'text-dg-green-700 hover:bg-dg-green-50'}`}
                    >
                      {t.active ? 'Deactivate' : 'Reactivate'}
                    </button>
                  )}
                </div>

                {/* Centres this trainer works at */}
                <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
                  <span className="text-xs text-gray-500">Centres</span>
                  {links.length === 0 && <span className="text-xs text-amber-700">No centre yet</span>}
                  {links.map(c => (
                    <span key={c} className="inline-flex items-center gap-1 rounded-full border border-gray-200 bg-gray-50 px-2.5 py-0.5 text-xs text-gray-800">
                      {centreName.get(c) ?? c}
                      {canManage && t.active && (
                        <button
                          type="button"
                          onClick={() => setLinks(t.id, links.filter(x => x !== c))}
                          aria-label={`Remove ${centreName.get(c) ?? c}`}
                          className="text-gray-400 hover:text-red-600"
                        >
                          ×
                        </button>
                      )}
                    </span>
                  ))}
                  {canManage && t.active && free.length > 0 && (
                    <select
                      value=""
                      onChange={e => e.target.value && setLinks(t.id, [...links, e.target.value])}
                      className="w-auto max-w-[220px] px-2 py-1 text-xs border border-gray-300 rounded-md bg-white text-gray-700"
                    >
                      <option value="">+ Add centre</option>
                      {free.map(c => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                {/* ToT status: ICT (Betterworld) and Green (Impact Lab) */}
                <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="rounded-md bg-gray-50 px-3 py-2 space-y-2">
                    <p className="text-xs font-semibold text-gray-700">ICT · Betterworld</p>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-gray-700">
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          className={box}
                          checked={t.in_person_ict}
                          disabled={!canIct || !t.active}
                          onChange={e => edit(t.id, { in_person_ict: e.target.checked })}
                        />
                        In-person
                      </label>
                      {t.in_person_ict && (
                        <input
                          type="date"
                          className={dateCls}
                          value={t.in_person_ict_date ?? ''}
                          disabled={!canIct || !t.active}
                          onChange={e => edit(t.id, { in_person_ict_date: e.target.value || null })}
                        />
                      )}
                      {ICT_MODULES.map(m => (
                        <label key={m.key} className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            className="w-4 h-4 accent-dg-blue-600"
                            checked={t[m.key]}
                            disabled={!canIct || !t.active}
                            onChange={e => edit(t.id, { [m.key]: e.target.checked } as Partial<Trainer>)}
                          />
                          LMS {m.label}
                        </label>
                      ))}
                    </div>
                  </div>
                  <div className="rounded-md bg-gray-50 px-3 py-2 space-y-2">
                    <p className="text-xs font-semibold text-gray-700">Green · Impact Lab</p>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-gray-700">
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          className={box}
                          checked={t.in_person_green}
                          disabled={!canGreen || !t.active}
                          onChange={e => edit(t.id, { in_person_green: e.target.checked })}
                        />
                        In-person
                      </label>
                      {t.in_person_green && (
                        <input
                          type="date"
                          className={dateCls}
                          value={t.in_person_green_date ?? ''}
                          disabled={!canGreen || !t.active}
                          onChange={e => edit(t.id, { in_person_green_date: e.target.value || null })}
                        />
                      )}
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          className="w-4 h-4 accent-dg-blue-600"
                          checked={t.lms_green_business}
                          disabled={!canGreen || !t.active}
                          onChange={e => edit(t.id, { lms_green_business: e.target.checked })}
                        />
                        LMS Green Business
                      </label>
                    </div>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {(changedIds.size > 0 || msg) && (
        <div className="sticky bottom-4 z-10 flex flex-wrap items-center gap-3 rounded-lg border border-gray-200 bg-white px-4 py-3 shadow-md">
          {changedIds.size > 0 && (
            <>
              <span className="text-sm text-gray-700">
                {changedIds.size} trainer{changedIds.size === 1 ? '' : 's'} with unsaved changes
              </span>
              <button
                type="button"
                onClick={save}
                disabled={saving}
                className="px-4 py-2 bg-dg-blue-600 text-white rounded-lg hover:bg-dg-blue-700 disabled:opacity-60 text-sm font-medium"
              >
                {saving ? 'Saving…' : 'Save changes'}
              </button>
              <button
                type="button"
                onClick={discard}
                disabled={saving}
                className="px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg"
              >
                Discard
              </button>
            </>
          )}
          {msg && <span className="text-sm text-gray-700">{msg}</span>}
        </div>
      )}
    </div>
  );
}

export default TrainerRoster;
