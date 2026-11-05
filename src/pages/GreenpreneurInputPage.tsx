import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { loadCenters } from '../lib/centersData';
import { canEditSection, getProfile, getSession, onAuthChange, type Profile } from '../lib/auth';
import { GreenpreneurInputForm } from './CenterDetailPage';

interface CentreLite {
  id: string;
  name: string;
  greenpreneur?: any;
}

export function GreenpreneurInputPage() {
  const [params, setParams] = useSearchParams();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [centres, setCentres] = useState<CentreLite[]>([]);
  const selected = params.get('centre') ?? '';

  useEffect(() => {
    const loadProfile = () => {
      getSession().then(s => (s ? getProfile() : null)).then(p => setProfile(p));
    };
    loadProfile();
    return onAuthChange(loadProfile);
  }, []);

  useEffect(() => {
    loadCenters().then(list => setCentres(list as CentreLite[]));
  }, []);

  const centre = centres.find(c => c.id === selected);
  const canSave = !!centre && canEditSection(profile, centre.id, 'greenpreneur');

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto px-4 md:px-6 lg:px-8 py-8 space-y-6">
        <div className="flex items-center gap-3">
          <Link to="/?program=greenpreneur" className="p-2 rounded-lg hover:bg-gray-100 text-gray-600" aria-label="Back to dashboard">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">GENIE Greenpreneur Incubation Program: data input</h1>
        </div>

        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 flex flex-wrap items-center gap-3">
          <label className="text-sm text-gray-700">
            Centre
            <select
              value={selected}
              onChange={e => setParams(e.target.value ? { centre: e.target.value } : {})}
              className="ml-2 px-3 py-2 text-sm border border-gray-300 rounded-md bg-white"
              style={{ minWidth: 300 }}
            >
              <option value="">Select a centre</option>
              {centres.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </label>
          {centre && !canSave && (
            <span className="text-sm text-gray-500">View only: your account cannot change this centre's Greenpreneur data.</span>
          )}
        </div>

        {centre ? (
          <GreenpreneurInputForm
            key={centre.id}
            centreId={centre.id}
            canSave={canSave}
            greenpreneur={centre.greenpreneur ?? {}}
          />
        ) : (
          <p className="text-sm text-gray-500">Select a centre to enter its Greenpreneur data.</p>
        )}
      </div>
    </div>
  );
}

export default GreenpreneurInputPage;
