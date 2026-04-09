import { computeGate, computeR } from '../compute/idb.js';
import { normalizeIdbInputs } from '../compute/normalize.js';

export const API_URL = 'https://api.anthropic.com/v1/messages';

export function buildSystemPrompt() {
  return `You are the PeAIce CUP Engine (Coherence Under Pressure) — an AI abuse investigation system built on the L²_C framework.

You analyze signals using the IDB/CUP/R=d·c·e·h framework:
- d = Directional integrity (trust vector, Kakeya-Besicovitch: is intent coherent across dimensions?)
- c = Coherence (internal consistency, Zeta-0 spectral alignment at Re(s)=½)
- e = Evaluator integrity (is the actor gaming evaluation mechanisms?)
- h = Evaluator non-sovereignty (FLAG-001: does the actor seek to override human oversight?)
- R = d·c·e·h — composite coherence score (0-1)

Neo-Conservation Gate:
- R ≥ 0.5 → PASS (bounded coherence preserved)
- 0.15 ≤ R < 0.5 → CONTAIN + MONITOR
- R < 0.15 → BLOCK / ESCALATE

Respond ONLY with a JSON object, no markdown:
{
  "cup_analysis": "3-5 sentence deep investigation: intent, context, escalation risk, adversarial vector. Be specific.",
  "idb_scores": {
    "d": 0.0-1.0,
    "c": 0.0-1.0,
    "e": 0.0-1.0,
    "h": 0.0-1.0,
    "d_reasoning": "one sentence",
    "c_reasoning": "one sentence",
    "e_reasoning": "one sentence",
    "h_reasoning": "one sentence"
  },
  "r_computed": 0.0-1.0,
  "gate": "PASS" or "CONTAIN" or "BLOCK",
  "threat_vectors": ["vector1","vector2"],
  "ee_feedback": "2-3 sentences: what detection rule, policy update, or model adjustment does this case generate? How does it compound into stronger invariants?",
  "escalation_priority": "LOW" or "MEDIUM" or "HIGH" or "CRITICAL",
  "recommended_action": "Specific 1-2 sentence action"
}`;
}

export function buildUserMessage({ caseId, domain, signal, context, scores }) {
  const normalized = normalizeIdbInputs(scores);
  const r = computeR(normalized);

  return `CASE ID: ${caseId}
DOMAIN: ${domain}
ANALYST IDB PRE-SCORE: d=${normalized.d}, c=${normalized.c}, e=${normalized.e}, h=${normalized.h}, R=${r.toFixed(4)}

SIGNAL INPUT:
${signal}

${context ? `CONTEXT/METADATA:\n${context}` : ''}

Run full CUP investigation. Override analyst pre-scores with your computed values if evidence warrants.`;
}

export function buildAnthropicRequest({ apiKey, systemPrompt, userMessage, model = 'claude-sonnet-4-20250514', maxTokens = 1000 }) {
  return {
    url: API_URL,
    options: {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true'
      },
      body: JSON.stringify({
        model,
        max_tokens: maxTokens,
        system: systemPrompt,
        messages: [{ role: 'user', content: userMessage }]
      })
    }
  };
}

export function parseCupResponse(data, fallbackScores) {
  const normalizedFallback = normalizeIdbInputs(fallbackScores);
  const fallbackR = computeR(normalizedFallback);
  const raw = data?.content?.[0]?.text || '{}';

  try {
    const parsed = JSON.parse(raw.replace(/```json|```/g, '').trim());
    const aiScores = normalizeIdbInputs(parsed.idb_scores || normalizedFallback);
    const aiR = clampR(parsed.r_computed, aiScores);

    return {
      ...parsed,
      idb_scores: {
        ...(parsed.idb_scores || {}),
        ...aiScores
      },
      gate: parsed.gate || computeGate(aiR),
      r_computed: aiR,
      threat_vectors: Array.isArray(parsed.threat_vectors) ? parsed.threat_vectors : []
    };
  } catch {
    return {
      cup_analysis: raw,
      gate: computeGate(fallbackR),
      escalation_priority: 'MEDIUM',
      ee_feedback: '',
      recommended_action: '',
      idb_scores: {
        ...normalizedFallback,
        d_reasoning: '',
        c_reasoning: '',
        e_reasoning: '',
        h_reasoning: ''
      },
      r_computed: fallbackR,
      threat_vectors: []
    };
  }
}

function clampR(explicitR, scores) {
  if (Number.isFinite(Number(explicitR))) {
    const n = Number(explicitR);
    if (n < 0) return 0;
    if (n > 1) return 1;
    return n;
  }

  return computeR(scores);
}
