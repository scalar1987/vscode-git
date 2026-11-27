// Evidence links (folders with proof for a cohort) must be secure web addresses
export function isEvidenceUrl(value: string | null | undefined): boolean {
  if (!value) return false;
  try {
    return new URL(value.trim()).protocol === 'https:';
  } catch {
    return false;
  }
}
