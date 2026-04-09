// PII validation — flags text that may contain prohibited identifiers
// Used in bio editor to warn caseworkers before saving

const FORBIDDEN_PATTERNS: Array<{ pattern: RegExp; label: string }> = [
  { pattern: /\b(school|elementary|middle|high school|academy|charter)\b/i, label: 'school name reference' },
  { pattern: /\b(street|avenue|drive|road|blvd|lane|court|place)\b/i, label: 'location/address reference' },
  { pattern: /\b\d{5}(-\d{4})?\b/, label: 'ZIP code' },
  { pattern: /\b(city|town|village|county|district)\s+of\b/i, label: 'location reference' },
  { pattern: /\b(case\s*(number|#)|case\s*id|docket)\b/i, label: 'case identifier' },
  { pattern: /\b(last\s*name|surname)\b/i, label: 'last name reference' },
];

export interface PiiWarning {
  label: string;
  match: string;
}

export function checkForPii(text: string): PiiWarning[] {
  const warnings: PiiWarning[] = [];
  for (const { pattern, label } of FORBIDDEN_PATTERNS) {
    const match = text.match(pattern);
    if (match) {
      warnings.push({ label, match: match[0] });
    }
  }
  return warnings;
}
