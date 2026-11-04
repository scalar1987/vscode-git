// Reads the filled training template (.xlsx) into TrainingRecords, with row-level validation.
import ExcelJS from 'exceljs';
import type { TotTrainee, StudentRecord, TrainingRecords } from './outcome1';

export const UNASSIGNED_LABEL = '미지정';

export interface ImportError {
  sheet: string;
  row: number;
  message: string;
}

export interface ImportResult {
  records: TrainingRecords;
  errors: ImportError[];
}

function text(cell: ExcelJS.Cell): string {
  const v = cell.value;
  if (v === null || v === undefined) return '';
  if (typeof v === 'object' && 'text' in v) return String((v as { text: unknown }).text).trim();
  return String(v).trim();
}

// '' → null (blank), 'Y'/'N' → boolean, anything else → undefined (invalid, reported by caller)
function yn(value: string): boolean | null | undefined {
  if (value === '') return null;
  if (value.toUpperCase() === 'Y') return true;
  if (value.toUpperCase() === 'N') return false;
  return undefined;
}

function readTotSheet(
  ws: ExcelJS.Worksheet,
  centerIds: Set<string>,
  errors: ImportError[],
): TotTrainee[] {
  const out: TotTrainee[] = [];
  ws.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;
    const id = text(row.getCell(1));
    const name = text(row.getCell(2));
    if (!id && !name) return;
    const centerRaw = text(row.getCell(3));
    const inPersonRaw = text(row.getCell(4));
    const lmsRaw = text(row.getCell(5));
    const inPerson = yn(inPersonRaw);
    const lms = yn(lmsRaw);
    if (inPerson === undefined) errors.push({ sheet: ws.name, row: rowNumber, message: '대면 완료는 Y/N이어야 합니다' });
    if (lms === undefined) errors.push({ sheet: ws.name, row: rowNumber, message: 'LMS 완료는 Y/N이어야 합니다' });
    const center = centerRaw === '' || centerRaw === UNASSIGNED_LABEL ? null : centerRaw;
    if (center !== null && !centerIds.has(center)) {
      errors.push({ sheet: ws.name, row: rowNumber, message: `알 수 없는 센터 ID: ${centerRaw}` });
    }
    out.push({
      id: id || `${ws.name}-${rowNumber}`,
      name,
      center_id: center,
      in_person_completed: inPerson ?? null,
      lms_completed: lms ?? null,
    });
  });
  return out;
}

function readStudentSheet(
  ws: ExcelJS.Worksheet,
  centerIds: Set<string>,
  errors: ImportError[],
): StudentRecord[] {
  const out: StudentRecord[] = [];
  ws.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;
    const id = text(row.getCell(1));
    const programRaw = text(row.getCell(2));
    const centerRaw = text(row.getCell(3));
    const enrolledRaw = text(row.getCell(4));
    const passedRaw = text(row.getCell(5));
    if (!id && !programRaw && !centerRaw && !enrolledRaw && !passedRaw) return;

    const program = programRaw === '기초' ? 'basic' : programRaw === '고급' ? 'advanced' : null;
    if (program === null) errors.push({ sheet: ws.name, row: rowNumber, message: '프로그램은 기초 또는 고급이어야 합니다' });

    const center = centerRaw === '' || centerRaw === UNASSIGNED_LABEL ? null : centerRaw;
    if (center !== null && !centerIds.has(center)) {
      errors.push({ sheet: ws.name, row: rowNumber, message: `알 수 없는 센터 ID: ${centerRaw}` });
    }

    const enrolled = yn(enrolledRaw);
    const passed = yn(passedRaw);
    if (enrolled === undefined) errors.push({ sheet: ws.name, row: rowNumber, message: '등록은 Y/N이어야 합니다' });
    if (passed === undefined) errors.push({ sheet: ws.name, row: rowNumber, message: '수료는 Y/N이어야 합니다' });
    if (passed === true && enrolled !== true) {
      errors.push({ sheet: ws.name, row: rowNumber, message: '등록이 Y가 아니면 수료를 Y로 할 수 없습니다' });
    }
    if (program === null) return;

    out.push({
      id: id || `${ws.name}-${rowNumber}`,
      program,
      center_id: center,
      enrolled: enrolled === true,
      passed: passed === true,
    });
  });
  return out;
}

export async function importTrainingTemplate(
  data: ArrayBuffer,
  centerIds: string[],
): Promise<ImportResult> {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(data);
  const ids = new Set(centerIds);
  const errors: ImportError[] = [];

  const basicSheet = wb.getWorksheet('교원_기초ToT');
  const advSheet = wb.getWorksheet('교원_고급ToT');
  const studentSheet = wb.getWorksheet('학생');
  if (!basicSheet || !advSheet || !studentSheet) {
    throw new Error('템플릿 시트(교원_기초ToT, 교원_고급ToT, 학생)가 없습니다.');
  }

  return {
    records: {
      tot_basic: readTotSheet(basicSheet, ids, errors),
      tot_advanced: readTotSheet(advSheet, ids, errors),
      student_records: readStudentSheet(studentSheet, ids, errors),
    },
    errors,
  };
}
