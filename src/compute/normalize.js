export function coerceFiniteNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

export function clamp01(value, fallback = 0) {
  const n = coerceFiniteNumber(value, fallback);
  if (n <= 0) return 0;
  if (n >= 1) return 1;
  return n;
}

export function normalizeIdbInputs(inputs = {}) {
  return {
    d: clamp01(inputs.d),
    c: clamp01(inputs.c),
    e: clamp01(inputs.e),
    h: clamp01(inputs.h)
  };
}
