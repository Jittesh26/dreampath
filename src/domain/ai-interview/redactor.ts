/**
 * Sensitive Secrets & PII Redactor
 *
 * Enforces privacy rules before persistent transcript storage and LLM transmission.
 * Redacts:
 * - Malaysian NRIC / MyKad numbers (e.g. 050615-10-1234 or 050615101234)
 * - Passport numbers (e.g. A12345678)
 * - Credit cards & CVV
 * - Passwords
 * - API keys & auth tokens
 *
 * Preserves normal resume information:
 * - Name
 * - Email
 * - Phone numbers (Malaysian +60..., 01...)
 * - LinkedIn / GitHub URLs
 * - Location
 */

export interface RedactionResult {
  text: string;
  hasRedactions: boolean;
  redactedTypes: string[];
}

// Malaysian NRIC format: YYMMDD-PB-###G (with or without hyphen)
const NRIC_REGEX = /\b\d{2}(?:0[1-9]|1[0-2])(?:0[1-9]|[12]\d|3[01])[- ]?\d{2}[- ]?\d{4}\b/g;

// Passport numbers: typically 1 letter followed by 7-9 digits
const PASSPORT_REGEX = /\b[A-PR-WY][0-9]{7,9}\b/gi;

// Credit card numbers (13-19 digits, optionally spaced/hyphenated)
const CREDIT_CARD_REGEX = /\b(?:\d{4}[- ]?){3}\d{4}\b|\b\d{15,16}\b/g;

// CVV (3-4 digits in card/security context)
const CVV_REGEX = /(?<=\b(?:cvv|cvc|security code|cid)\s*[:=]?\s*)\b\d{3,4}\b/gi;

// Passwords
const PASSWORD_REGEX = /(?<=\b(?:password|passwd|pwd|secret)\s*[:=]\s*)[^\s,]+/gi;

// API keys & tokens
const API_KEY_REGEX = /\b(?:sk-[a-zA-Z0-9_\-]{20,}|AIza[0-9A-Za-z\-_]{35}|ghp_[a-zA-Z0-9]{36}|Bearer\s+[A-Za-z0-9\-\._~\+\/]+=*)\b/g;

export function redactSensitiveData(input: string): RedactionResult {
  if (!input) {
    return { text: '', hasRedactions: false, redactedTypes: [] };
  }

  let text = input;
  const redactedTypes: string[] = [];

  if (NRIC_REGEX.test(text)) {
    text = text.replace(NRIC_REGEX, '[REDACTED_NRIC]');
    redactedTypes.push('NRIC');
  }

  if (CREDIT_CARD_REGEX.test(text)) {
    text = text.replace(CREDIT_CARD_REGEX, '[REDACTED_CREDIT_CARD]');
    redactedTypes.push('CREDIT_CARD');
  }

  if (CVV_REGEX.test(text)) {
    text = text.replace(CVV_REGEX, '[REDACTED_CVV]');
    redactedTypes.push('CVV');
  }

  if (PASSWORD_REGEX.test(text)) {
    text = text.replace(PASSWORD_REGEX, '[REDACTED_PASSWORD]');
    redactedTypes.push('PASSWORD');
  }

  if (API_KEY_REGEX.test(text)) {
    text = text.replace(API_KEY_REGEX, '[REDACTED_API_KEY]');
    redactedTypes.push('API_KEY');
  }

  // Check passport without falsely matching general words
  if (PASSPORT_REGEX.test(text)) {
    text = text.replace(PASSPORT_REGEX, (match) => {
      // Avoid redacting common year strings like A2025
      if (/^[A-Z]\d{4}$/i.test(match)) return match;
      redactedTypes.push('PASSPORT');
      return '[REDACTED_PASSPORT]';
    });
  }

  return {
    text,
    hasRedactions: redactedTypes.length > 0,
    redactedTypes: Array.from(new Set(redactedTypes)),
  };
}
