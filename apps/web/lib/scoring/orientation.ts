import { ORIENTATION_ITEMS, Scale } from "../questionnaires/orientation";

const reverse = (x: number) => 6 - x;

const to0_100 = (meanLikert: number) => Math.round(((meanLikert - 1) / 4) * 100);

type DimKey = "D1"|"D2"|"D3"|"D4"|"D5"|"D6a"|"D6b"|"D6c";

export type OrientationScores = {
  D1: number | null;
  D2: number | null;
  D3: number | null;
  D4: number | null;
  D5: number | null;
  motivation: {
    learning: number | null;
    result: number | null;
    relation: number | null;
    learning_pct?: number;
    result_pct?: number;
    relation_pct?: number;
  };
};

export function scoreOrientation(answers: Record<string, Scale | undefined>): OrientationScores {
  const dims: Record<DimKey, number[]> = {
    D1: [], D2: [], D3: [], D4: [], D5: [], D6a: [], D6b: [], D6c: []
  };

  for (const item of ORIENTATION_ITEMS) {
    const a = answers[item.id];
    if (!a) continue;
    const v = item.reversed ? reverse(a) : a;
    dims[item.dim].push(v);
  }

  const meanOrNull = (arr: number[], minRequired: number) => {
    if (arr.length < minRequired) return null;
    const m = arr.reduce((s, x) => s + x, 0) / arr.length;
    return to0_100(m);
  };

  // min required: D1,D2=3/5 ; D3,D4,D5=3/4 ; D6*=2/3
  const D1 = meanOrNull(dims.D1, 3);
  const D2 = meanOrNull(dims.D2, 3);
  const D3 = meanOrNull(dims.D3, 3);
  const D4 = meanOrNull(dims.D4, 3);
  const D5 = meanOrNull(dims.D5, 3);

  const learning = meanOrNull(dims.D6a, 2);
  const result = meanOrNull(dims.D6b, 2);
  const relation = meanOrNull(dims.D6c, 2);

  const out: OrientationScores = {
    D1, D2, D3, D4, D5,
    motivation: { learning, result, relation }
  };

  // percentuali motivazione (solo se tutte presenti)
  if (learning != null && result != null && relation != null) {
    const sum = learning + result + relation + 0.0001;
    out.motivation.learning_pct = learning / sum;
    out.motivation.result_pct = result / sum;
    out.motivation.relation_pct = relation / sum;
  }

  return out;
}
