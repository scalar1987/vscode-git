// Generates public/templates/training_template.xlsx from public/centers.json and public/training_records.json.
// Run: node scripts/make-training-template.mjs
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import ExcelJS from 'exceljs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const centers = JSON.parse(fs.readFileSync(path.join(root, 'public/centers.json'), 'utf8'));
const records = JSON.parse(fs.readFileSync(path.join(root, 'public/training_records.json'), 'utf8'));

const UNASSIGNED = '미지정';
const YN = '"Y,N"';

const wb = new ExcelJS.Workbook();
wb.created = new Date();

// --- 센터목록 (reference for dropdowns) ---
const centerSheet = wb.addWorksheet('센터목록');
centerSheet.columns = [
  { header: '센터 ID', key: 'id', width: 28 },
  { header: '센터 이름', key: 'name', width: 48 },
];
for (const c of centers) centerSheet.addRow({ id: c.id, name: c.name });
centerSheet.addRow({ id: UNASSIGNED, name: '센터 미지정 (자가등록)' });
centerSheet.getRow(1).font = { bold: true };
const centerCount = centers.length + 1;
const centerRange = `'센터목록'!$A$2:$A$${centerCount + 1}`;

const styleHeader = (row) => {
  row.font = { bold: true };
  row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9E1F2' } };
};

// --- 교원_기초ToT (pre-filled with 105 trainees, TBD placeholder excluded) ---
const totBasic = wb.addWorksheet('교원_기초ToT');
totBasic.columns = [
  { header: '교원 ID', key: 'id', width: 26 },
  { header: '교원 이름', key: 'name', width: 30 },
  { header: '센터 ID', key: 'center_id', width: 28 },
  { header: '대면 완료 (Y/N)', key: 'in_person', width: 18 },
  { header: 'LMS 완료 (Y/N)', key: 'lms', width: 18 },
];
styleHeader(totBasic.getRow(1));
for (const t of records.tot_basic.filter(x => !x.placeholder)) {
  totBasic.addRow({
    id: t.id,
    name: t.name,
    center_id: t.center_id,
    in_person: t.in_person_completed === null ? '' : t.in_person_completed ? 'Y' : 'N',
    lms: t.lms_completed === null ? '' : t.lms_completed ? 'Y' : 'N',
  });
}
const totBasicLast = totBasic.rowCount;
for (let r = 2; r <= totBasicLast; r++) {
  totBasic.getCell(`D${r}`).dataValidation = { type: 'list', allowBlank: true, formulae: [YN] };
  totBasic.getCell(`E${r}`).dataValidation = { type: 'list', allowBlank: true, formulae: [YN] };
}

// --- 교원_고급ToT (19 DigiFemme trainees; center assignment pending) ---
const totAdv = wb.addWorksheet('교원_고급ToT');
totAdv.columns = [
  { header: '교원 ID', key: 'id', width: 26 },
  { header: '교원 이름', key: 'name', width: 30 },
  { header: '센터 ID', key: 'center_id', width: 28 },
  { header: '대면 완료 (Y/N)', key: 'in_person', width: 18 },
  { header: 'LMS 완료 (Y/N)', key: 'lms', width: 18 },
];
styleHeader(totAdv.getRow(1));
for (let r = 2; r <= 20; r++) {
  totAdv.getCell(`C${r}`).dataValidation = { type: 'list', allowBlank: true, formulae: [centerRange] };
  totAdv.getCell(`D${r}`).dataValidation = { type: 'list', allowBlank: true, formulae: [YN] };
  totAdv.getCell(`E${r}`).dataValidation = { type: 'list', allowBlank: true, formulae: [YN] };
}

// --- 학생 (one row per student; 등록/수료 Y/N) ---
const students = wb.addWorksheet('학생');
students.columns = [
  { header: '학생 ID', key: 'id', width: 22 },
  { header: '프로그램 (기초/고급)', key: 'program', width: 20 },
  { header: '센터 ID', key: 'center_id', width: 28 },
  { header: '등록 (Y/N)', key: 'enrolled', width: 14 },
  { header: '수료 (Y/N)', key: 'passed', width: 14 },
];
styleHeader(students.getRow(1));
const STUDENT_ROWS = 2000;
for (let r = 2; r <= STUDENT_ROWS; r++) {
  students.getCell(`B${r}`).dataValidation = { type: 'list', allowBlank: true, formulae: ['"기초,고급"'] };
  students.getCell(`C${r}`).dataValidation = { type: 'list', allowBlank: true, formulae: [centerRange] };
  students.getCell(`D${r}`).dataValidation = { type: 'list', allowBlank: true, formulae: [YN] };
  students.getCell(`E${r}`).dataValidation = { type: 'list', allowBlank: true, formulae: [YN] };
}

// --- 안내 ---
const guide = wb.addWorksheet('작성방법', { views: [{ state: 'normal' }] });
guide.getColumn(1).width = 110;
const lines = [
  '작성 방법',
  '1. 교원_기초ToT: 대면 완료와 LMS 완료를 각각 Y/N으로 입력합니다. 둘 다 Y여야 완료로 집계됩니다.',
  '2. 교원_고급ToT: 19명(DigiFemme)의 이름, 센터 ID, 대면/LMS 완료 여부를 입력합니다. 센터 배정은 확인 후 채웁니다.',
  '3. 학생: 한 행이 한 명입니다. 프로그램(기초/고급), 센터 ID, 등록 Y/N, 수료 Y/N을 입력합니다.',
  '4. 자가등록 학생은 센터 ID를 "미지정"으로 고릅니다. 수료하면 전체 합계(Outcome 1)에 포함됩니다.',
  '5. 센터 ID는 "센터목록" 시트에서 고르세요. 직접 입력하면 업로드 시 오류가 납니다.',
  '6. 수료는 등록보다 먼저 Y가 될 수 없습니다. 등록이 N이면 수료도 N이어야 합니다.',
];
lines.forEach((text, i) => {
  const cell = guide.getCell(i + 1, 1);
  cell.value = text;
  if (i === 0) cell.font = { bold: true, size: 13 };
});

const outDir = path.join(root, 'public/templates');
fs.mkdirSync(outDir, { recursive: true });
const outPath = path.join(outDir, 'training_template.xlsx');
await wb.xlsx.writeFile(outPath);
console.log('wrote', outPath, '| 기초 교원:', totBasicLast - 1, '| 센터:', centers.length);
