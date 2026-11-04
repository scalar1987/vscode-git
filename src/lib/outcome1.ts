// Outcome 1 roll-up computed from granular training records (public/training_records.json).
// Completion rule: a ToT trainee is completed only when BOTH in-person and LMS parts are completed.
// Students count toward totals whether registered through a center or self-registered (center_id null);
// a student counts as passed only when the course is completed.

export interface TotTrainee {
  id: string;
  name: string;
  center_id: string | null;
  placeholder?: boolean;
  in_person_completed: boolean | null;
  lms_completed: boolean | null;
  completed?: boolean;
}

export interface StudentRecord {
  id: string;
  program: 'basic' | 'advanced';
  center_id: string | null;
  enrolled: boolean;
  passed: boolean;
}

export interface TrainingRecords {
  tot_basic: TotTrainee[];
  tot_advanced: TotTrainee[];
  student_records: StudentRecord[];
}

export interface Outcome1Breakdown {
  // Logframe indicators
  tot_basic_completed: number; // 1.2.5
  tot_advanced_completed: number; // 1.3.3
  basic_students_enrolled: number; // 1.2.6
  basic_students_passed: number; // 1.2.7.1
  advanced_students_enrolled: number; // 1.3.4.1
  advanced_students_passed: number; // 1.3.4.2
  // Outcome 1 formula: 1.2.5 + 1.2.7.1 + 1.3.4.2
  outcome1_value: number;
  // Self-registered students with no center (센터 미지정), already included above
  unassigned_students_enrolled: number;
  unassigned_students_passed: number;
}

export function isTotCompleted(t: TotTrainee): boolean {
  return t.in_person_completed === true && t.lms_completed === true;
}

export function computeOutcome1(records: TrainingRecords): Outcome1Breakdown {
  const totBasic = records.tot_basic.filter(t => !t.placeholder);
  const tot_basic_completed = totBasic.filter(isTotCompleted).length;
  const tot_advanced_completed = records.tot_advanced.filter(isTotCompleted).length;

  const basic = records.student_records.filter(s => s.program === 'basic');
  const advanced = records.student_records.filter(s => s.program === 'advanced');
  const unassigned = records.student_records.filter(s => s.center_id === null);

  const basic_students_enrolled = basic.filter(s => s.enrolled).length;
  const basic_students_passed = basic.filter(s => s.passed).length;
  const advanced_students_enrolled = advanced.filter(s => s.enrolled).length;
  const advanced_students_passed = advanced.filter(s => s.passed).length;

  return {
    tot_basic_completed,
    tot_advanced_completed,
    basic_students_enrolled,
    basic_students_passed,
    advanced_students_enrolled,
    advanced_students_passed,
    outcome1_value: tot_basic_completed + basic_students_passed + advanced_students_passed,
    unassigned_students_enrolled: unassigned.filter(s => s.enrolled).length,
    unassigned_students_passed: unassigned.filter(s => s.passed).length,
  };
}
