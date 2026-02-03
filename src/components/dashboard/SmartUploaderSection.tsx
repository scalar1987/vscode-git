import { useState } from 'react';
import { Upload, FileText, CheckCircle, AlertCircle, Loader2, ChevronDown, ChevronUp, Brain, Save, X } from 'lucide-react';

interface IndicatorUpdate {
  id: string;
  value: number;
  narrative: string;
}

interface ActivityUpdate {
  id: string;
  status: string;
  progress: number;
  notes: string;
}

interface BudgetUpdate {
  activity_id: string;
  amount: number;
  year: number;
  category: string;
  description: string;
}

interface PreviewData {
  date: string;
  source: string;
  indicator_updates: IndicatorUpdate[];
  activity_updates: ActivityUpdate[];
  budget_updates: BudgetUpdate[];
}

interface CommitReport {
  indicators: { id: string; value: number; label: string }[];
  activities: { id: string; status: string; progress: number }[];
  budgets: { activity_id: string; amount: number; description: string }[];
  filesModified: string[];
  correctionsLearned: number;
}

export function SmartUploaderSection() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<PreviewData | null>(null);
  const [originalData, setOriginalData] = useState<PreviewData | null>(null);
  const [loading, setLoading] = useState(false);
  const [emptyExtraction, setEmptyExtraction] = useState(false);
  const [commitReport, setCommitReport] = useState<CommitReport | null>(null);
  const [expanded, setExpanded] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      setFile(e.target.files[0]);
      setPreview(null);
      setCommitReport(null);
      setEmptyExtraction(false);
    }
  };

  const handleAnalyze = async () => {
    if (!file) return;
    setLoading(true);
    setEmptyExtraction(false);
    setCommitReport(null);
    setPreview(null);
    setOriginalData(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('/api/analyze-report', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) throw new Error('Analysis failed');

      const data: PreviewData = await res.json();

      if (!data.budget_updates) data.budget_updates = [];

      const hasIndicators = data.indicator_updates && data.indicator_updates.length > 0;
      const hasActivities = data.activity_updates && data.activity_updates.length > 0;
      const hasBudgets = data.budget_updates && data.budget_updates.length > 0;

      if (!hasIndicators && !hasActivities && !hasBudgets) {
        setEmptyExtraction(true);
        return;
      }

      setPreview(data);
      setOriginalData(JSON.parse(JSON.stringify(data)));
    } catch {
      alert('Error reading file. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCommit = async () => {
    if (!preview || !originalData) return;

    try {
      setLoading(true);
      let correctionsCount = 0;

      const learningPromises = preview.indicator_updates.map(async (curr, idx) => {
        const orig = originalData.indicator_updates[idx];
        if (curr.value !== orig.value) {
          correctionsCount++;
          await fetch('/api/learn-mistake', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              original_text: `Report: ${preview.source}, Indicator ID: ${curr.id}`,
              ai_prediction: orig.value,
              user_correction: curr.value,
              comments: `User corrected value from ${orig.value} to ${curr.value}. narrative: ${curr.narrative}`,
            }),
          });
        }
      });

      await Promise.allSettled(learningPromises);

      const res = await fetch('/api/commit-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(preview),
      });

      if (!res.ok) throw new Error('Save failed');

      const filesModified: string[] = [];
      if (preview.indicator_updates.length > 0) {
        filesModified.push('performance_actuals', 'narratives');
      }
      if (preview.activity_updates.length > 0) {
        filesModified.push('activities');
      }
      if (preview.budget_updates && preview.budget_updates.length > 0) {
        filesModified.push('expenditures');
      }

      const report: CommitReport = {
        indicators: preview.indicator_updates.map((ind) => ({
          id: ind.id,
          value: ind.value,
          label: ind.narrative.substring(0, 50) + '...',
        })),
        activities: preview.activity_updates.map((act) => ({
          id: act.id,
          status: act.status,
          progress: act.progress,
        })),
        budgets: (preview.budget_updates || []).map((b) => ({
          activity_id: b.activity_id,
          amount: b.amount,
          description: b.description,
        })),
        filesModified,
        correctionsLearned: correctionsCount,
      };

      setCommitReport(report);
      setPreview(null);
      setFile(null);
    } catch {
      alert('Failed to save data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setFile(null);
    setPreview(null);
    setOriginalData(null);
    setCommitReport(null);
    setEmptyExtraction(false);
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="p-2 bg-dg-green-100 rounded-xl">
            <Brain className="w-5 h-5 text-dg-green-600" />
          </div>
          <div className="text-left">
            <h3 className="font-semibold text-gray-900">AI-Powered Data Upload</h3>
            <p className="text-sm text-gray-500">Upload reports to automatically extract M&E data</p>
          </div>
        </div>
        {expanded ? (
          <ChevronUp className="w-5 h-5 text-gray-400" />
        ) : (
          <ChevronDown className="w-5 h-5 text-gray-400" />
        )}
      </button>

      {/* Expandable Content */}
      {expanded && (
        <div className="px-6 pb-6 border-t border-gray-100">
          {/* Success Message */}
          {commitReport && (
            <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-xl">
              <div className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
                <div className="flex-1">
                  <h4 className="font-medium text-green-900">Data Saved Successfully!</h4>
                  <div className="mt-2 text-sm text-green-700">
                    <p>{commitReport.indicators.length} indicators updated</p>
                    <p>{commitReport.activities.length} activities updated</p>
                    <p>{commitReport.budgets.length} budget entries added</p>
                    {commitReport.correctionsLearned > 0 && (
                      <p className="mt-1 text-green-600">
                        AI learned from {commitReport.correctionsLearned} correction(s)
                      </p>
                    )}
                  </div>
                  <button
                    onClick={handleReset}
                    className="mt-3 text-sm text-green-700 hover:text-green-800 underline"
                  >
                    Upload another report
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Empty Extraction Warning */}
          {emptyExtraction && (
            <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-xl">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5" />
                <div>
                  <h4 className="font-medium text-amber-900">No Data Found</h4>
                  <p className="text-sm text-amber-700 mt-1">
                    The AI couldn't extract any M&E data from this document. Try a different report format.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* File Upload */}
          {!commitReport && !preview && (
            <div className="mt-4">
              <label className="block">
                <div className="border-2 border-dashed border-gray-200 rounded-xl p-8 text-center hover:border-dg-green-400 transition-colors cursor-pointer">
                  <Upload className="w-10 h-10 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-600 mb-1">
                    {file ? file.name : 'Drop your report here or click to browse'}
                  </p>
                  <p className="text-sm text-gray-400">Supports PDF, DOCX, XLSX, JSON</p>
                </div>
                <input
                  type="file"
                  className="hidden"
                  accept=".pdf,.docx,.xlsx,.json"
                  onChange={handleFileChange}
                />
              </label>

              {file && (
                <div className="mt-4 flex gap-3">
                  <button
                    onClick={handleAnalyze}
                    disabled={loading}
                    className="flex-1 px-4 py-2.5 bg-dg-green-600 text-white rounded-xl hover:bg-dg-green-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Analyzing...
                      </>
                    ) : (
                      <>
                        <Brain className="w-4 h-4" />
                        Analyze with AI
                      </>
                    )}
                  </button>
                  <button
                    onClick={handleReset}
                    className="px-4 py-2.5 text-gray-600 hover:text-gray-800 transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Preview Data */}
          {preview && (
            <div className="mt-4 space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-medium text-gray-900">Extracted Data Preview</h4>
                <span className="text-sm text-gray-500">{preview.source}</span>
              </div>

              {/* Indicators */}
              {preview.indicator_updates.length > 0 && (
                <div className="bg-gray-50 rounded-xl p-4">
                  <h5 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    Indicators ({preview.indicator_updates.length})
                  </h5>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {preview.indicator_updates.map((ind, idx) => (
                      <div key={idx} className="flex items-center justify-between text-sm bg-white p-2 rounded-lg">
                        <span className="text-gray-600">{ind.id}</span>
                        <input
                          type="number"
                          value={ind.value}
                          onChange={(e) => {
                            const updated = { ...preview };
                            updated.indicator_updates[idx].value = parseFloat(e.target.value) || 0;
                            setPreview(updated);
                          }}
                          className="w-24 px-2 py-1 border border-gray-200 rounded text-right"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Activities */}
              {preview.activity_updates.length > 0 && (
                <div className="bg-gray-50 rounded-xl p-4">
                  <h5 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
                    <CheckCircle className="w-4 h-4" />
                    Activities ({preview.activity_updates.length})
                  </h5>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {preview.activity_updates.map((act, idx) => (
                      <div key={idx} className="flex items-center justify-between text-sm bg-white p-2 rounded-lg">
                        <span className="text-gray-600">{act.id}</span>
                        <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs">
                          {act.status} ({act.progress}%)
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3 pt-2">
                <button
                  onClick={handleCommit}
                  disabled={loading}
                  className="flex-1 px-4 py-2.5 bg-dg-green-600 text-white rounded-xl hover:bg-dg-green-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      Save to Database
                    </>
                  )}
                </button>
                <button
                  onClick={handleReset}
                  className="px-4 py-2.5 text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
