import { clamp01, normalizeIdbInputs } from './normalize.js';

export function computeR({ d, c, e, h }) {
  const normalized = normalizeIdbInputs({ d, c, e, h });
  return normalized.d * normalized.c * normalized.e * normalized.h;
}

export function computeGate(r) {
  const score = clamp01(r);
  if (score >= 0.5) return 'PASS';
  if (score >= 0.15) return 'CONTAIN';
  return 'BLOCK';
}
