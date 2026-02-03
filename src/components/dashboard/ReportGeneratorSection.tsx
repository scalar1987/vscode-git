import { useState } from 'react';
import { FileDown, Calendar, Loader2, ChevronDown, ChevronUp, FileText, BarChart3 } from 'lucide-react';
import { Document, Packer, Paragraph, Table, TableRow, TableCell, TextRun, HeadingLevel, WidthType, AlignmentType } from 'docx';
import { saveAs } from 'file-saver';

interface ReportData {
  month: string;
  year: number;
  projectProgress: { elapsed: number; total: number; percentage: number };
  outcomes: { id: string; name: string; baseline: number; target: number; actual: number; status: string }[];
  outputs: { id: string; name: string; progress: number; status: string }[];
  narratives: { id: string; status: string; narrative: string }[];
  activities: { id: string; name: string; status: string; progress: number; notes: string }[];
}

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const OUTPUT_CONFIG = [
  { id: '1.1', parentId: 'Output 1.1', name: 'DigiGreen Centers Infrastructure' },
  { id: '1.2', parentId: 'Output 1.2', name: 'Basic ICT Skills Training' },
  { id: '1.3', parentId: 'Output 1.3', name: 'Higher-level ICT Training' },
  { id: '2.1', parentId: 'Output 2.1', name: 'Incubation Program Development' },
  { id: '2.2', parentId: 'Output 2.2', name: 'Incubation Program Implementation' },
  { id: '3.1', parentId: 'Output 3.1', name: 'Conducive Environment' },
  { id: '3.2', parentId: 'Output 3.2', name: 'Government Capacity Building' },
];

const OUTCOME_CONFIG = [
  { id: '1', name: 'Youth with ICT Skills', indicatorIds: ['1.2.6.2', '1.3.4.1'] },
  { id: '2', name: 'Technology Start-ups Created', indicatorIds: ['2.2.2.1'] },
  { id: '2.1', name: 'Green Jobs Created', indicatorIds: ['2.1'] },
  { id: '3', name: 'Mobilized Investment (USD)', indicatorIds: ['3.1.2'] },
];

const parseNumber = (value: string | number): number => {
  if (typeof value === 'number') return value;
  const cleaned = String(value).replace(/[$,%]/g, '').replace(/,/g, '');
  return parseFloat(cleaned) || 0;
};

const getStatus = (percentage: number): string => {
  if (percentage >= 80) return 'On Track';
  if (percentage >= 50) return 'Moderate';
  if (percentage > 0) return 'Behind';
  return 'Not Started';
};

export function ReportGeneratorSection() {
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const generateReport = async () => {
    setLoading(true);
    try {
      const [indicators, actualsData, narrativesData, activitiesData] = await Promise.all([
        fetch('/logframe_structured.json').then(r => r.json()),
        fetch('/performance_actuals.json').then(r => r.json()),
        fetch('/narratives.json').then(r => r.json()),
        fetch('/activities.json').then(r => r.json())
      ]);

      const actuals = actualsData[0];
      const latestNarratives = narrativesData[0];

      const projectStart = new Date(2024, 4, 1);
      const reportDate = new Date(selectedYear, selectedMonth, 1);
      const totalMonths = 43;
      const elapsedMonths = Math.max(0, Math.min(totalMonths,
        (reportDate.getFullYear() - projectStart.getFullYear()) * 12 +
        (reportDate.getMonth() - projectStart.getMonth()) + 1
      ));

      const outcomes = OUTCOME_CONFIG.map(outcome => {
        let totalTarget = 0;
        let totalActual = 0;
        outcome.indicatorIds.forEach(indId => {
          const ind = indicators.find((i: { id: string; targets: { total: string | number } }) => i.id === indId);
          if (ind) {
            totalTarget += parseNumber(ind.targets.total);
            totalActual += actuals.values[indId] || 0;
          }
        });
        const progress = totalTarget > 0 ? (totalActual / totalTarget) * 100 : 0;
        return {
          id: outcome.id,
          name: outcome.name,
          baseline: 0,
          target: totalTarget,
          actual: totalActual,
          status: getStatus(progress)
        };
      });

      const outputs = OUTPUT_CONFIG.map(config => {
        const outputIndicators = indicators.filter((ind: { parent_id: string }) => ind.parent_id === config.parentId);
        if (outputIndicators.length === 0) {
          return { id: config.id, name: config.name, progress: 0, status: 'Not Started' };
        }
        const validIndicators = outputIndicators.filter((ind: { targets: { total: string | number } }) => parseNumber(ind.targets.total) > 0);
        if (validIndicators.length === 0) {
          return { id: config.id, name: config.name, progress: 0, status: 'Not Started' };
        }
        const totalProgress = validIndicators.reduce((sum: number, ind: { id: string; targets: { total: string | number } }) => {
          const target = parseNumber(ind.targets.total);
          const actual = actuals.values[ind.id] || 0;
          return sum + Math.min(100, (actual / target) * 100);
        }, 0);
        const avgProgress = Math.round(totalProgress / validIndicators.length);
        return { id: config.id, name: config.name, progress: avgProgress, status: getStatus(avgProgress) };
      });

      const keyNarrativeIds = ['1', '1.1.4', '1.2.6.2', '2', '2.1', '2.2.2.1', '3', 'OVERALL'];
      const narratives = keyNarrativeIds
        .filter(id => latestNarratives.stories[id])
        .map(id => ({
          id,
          status: latestNarratives.stories[id].status || 'Unknown',
          narrative: latestNarratives.stories[id].narrative
        }));

      const activities = activitiesData.activities
        .filter((a: { status: string }) => a.status === 'Delayed' || a.status === 'Completed' || a.status === 'Critical')
        .slice(0, 10)
        .map((a: { id: string; name: string; status: string; progress: number; notes: string }) => ({
          id: a.id,
          name: a.name,
          status: a.status,
          progress: a.progress,
          notes: a.notes
        }));

      setReportData({
        month: MONTHS[selectedMonth],
        year: selectedYear,
        projectProgress: {
          elapsed: elapsedMonths,
          total: totalMonths,
          percentage: Math.round((elapsedMonths / totalMonths) * 100)
        },
        outcomes,
        outputs,
        narratives,
        activities
      });
    } catch {
      alert('Failed to generate report. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const downloadWord = async () => {
    if (!reportData) return;

    const doc = new Document({
      sections: [{
        children: [
          new Paragraph({
            text: 'GENIE DigiGreen Youth Project',
            heading: HeadingLevel.HEADING_1,
            alignment: AlignmentType.CENTER,
          }),
          new Paragraph({
            text: `M&E Progress Report - ${reportData.month} ${reportData.year}`,
            heading: HeadingLevel.HEADING_2,
            alignment: AlignmentType.CENTER,
          }),
          new Paragraph({ text: '' }),
          new Paragraph({
            text: `Project Progress: ${reportData.projectProgress.percentage}% (Month ${reportData.projectProgress.elapsed} of ${reportData.projectProgress.total})`,
          }),
          new Paragraph({ text: '' }),
          new Paragraph({
            text: 'KEY OUTCOMES',
            heading: HeadingLevel.HEADING_3,
          }),
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              new TableRow({
                children: ['Outcome', 'Target', 'Actual', 'Status'].map(text =>
                  new TableCell({
                    children: [new Paragraph({ children: [new TextRun({ text, bold: true })] })],
                  })
                ),
              }),
              ...reportData.outcomes.map(o =>
                new TableRow({
                  children: [o.name, o.target.toLocaleString(), o.actual.toLocaleString(), o.status].map(text =>
                    new TableCell({
                      children: [new Paragraph({ text: String(text) })],
                    })
                  ),
                })
              ),
            ],
          }),
          new Paragraph({ text: '' }),
          new Paragraph({
            text: 'OUTPUT PROGRESS',
            heading: HeadingLevel.HEADING_3,
          }),
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              new TableRow({
                children: ['Output', 'Progress', 'Status'].map(text =>
                  new TableCell({
                    children: [new Paragraph({ children: [new TextRun({ text, bold: true })] })],
                  })
                ),
              }),
              ...reportData.outputs.map(o =>
                new TableRow({
                  children: [o.name, `${o.progress}%`, o.status].map(text =>
                    new TableCell({
                      children: [new Paragraph({ text: String(text) })],
                    })
                  ),
                })
              ),
            ],
          }),
        ],
      }],
    });

    const blob = await Packer.toBlob(doc);
    saveAs(blob, `DigiGreen_Report_${reportData.month}_${reportData.year}.docx`);
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-100 rounded-xl">
            <FileText className="w-5 h-5 text-blue-600" />
          </div>
          <div className="text-left">
            <h3 className="font-semibold text-gray-900">Report Generator</h3>
            <p className="text-sm text-gray-500">Generate monthly M&E progress reports</p>
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
          {/* Period Selection */}
          <div className="mt-4 flex gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">Month</label>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-dg-green-500"
              >
                {MONTHS.map((month, idx) => (
                  <option key={month} value={idx}>{month}</option>
                ))}
              </select>
            </div>
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">Year</label>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-dg-green-500"
              >
                {[2024, 2025, 2026, 2027].map(year => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Generate Button */}
          <button
            onClick={generateReport}
            disabled={loading}
            className="mt-4 w-full px-4 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <BarChart3 className="w-4 h-4" />
                Generate Report Preview
              </>
            )}
          </button>

          {/* Report Preview */}
          {reportData && (
            <div className="mt-4 space-y-4">
              <div className="bg-gray-50 rounded-xl p-4">
                <h4 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  {reportData.month} {reportData.year} Report
                </h4>

                <div className="text-sm text-gray-600 mb-3">
                  Project Progress: {reportData.projectProgress.percentage}% (Month {reportData.projectProgress.elapsed}/{reportData.projectProgress.total})
                </div>

                {/* Outcomes Summary */}
                <div className="mb-3">
                  <h5 className="text-xs font-medium text-gray-500 uppercase mb-2">Key Outcomes</h5>
                  <div className="space-y-1">
                    {reportData.outcomes.slice(0, 3).map(o => (
                      <div key={o.id} className="flex items-center justify-between text-sm">
                        <span className="text-gray-700">{o.name}</span>
                        <span className={`px-2 py-0.5 rounded text-xs ${
                          o.status === 'On Track' ? 'bg-green-100 text-green-700' :
                          o.status === 'Moderate' ? 'bg-blue-100 text-blue-700' :
                          o.status === 'Behind' ? 'bg-amber-100 text-amber-700' :
                          'bg-gray-100 text-gray-600'
                        }`}>
                          {o.status}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Outputs Summary */}
                <div>
                  <h5 className="text-xs font-medium text-gray-500 uppercase mb-2">Output Progress</h5>
                  <div className="space-y-1">
                    {reportData.outputs.slice(0, 4).map(o => (
                      <div key={o.id} className="flex items-center justify-between text-sm">
                        <span className="text-gray-700 truncate flex-1">{o.name}</span>
                        <span className="text-gray-600 ml-2">{o.progress}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Download Button */}
              <button
                onClick={downloadWord}
                className="w-full px-4 py-2.5 bg-dg-green-600 text-white rounded-xl hover:bg-dg-green-700 transition-colors flex items-center justify-center gap-2"
              >
                <FileDown className="w-4 h-4" />
                Download Word Document
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
