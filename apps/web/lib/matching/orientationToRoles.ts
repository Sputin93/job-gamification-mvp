type Profile = {
  D1: number | null;
  D2: number | null;
  D3: number | null;
  D4: number | null;
  D5: number | null;
  motivation: {
    learning: number | null;
    result: number | null;
    relation: number | null;
  };
};

type RoleKey = "developer" | "sales_ops" | "receptionist";

type Target = Record<string, number>;
type Weights = Record<string, number>;

const TARGETS: Record<RoleKey, Target> = {
  developer: {
    D1: 80, D2: 35, D3: 55, D4: 40, D5: 65,
    Mlearn: 70, Mresult: 55, Mrelation: 25
  },
  sales_ops: {
    D1: 55, D2: 55, D3: 75, D4: 70, D5: 60,
    Mlearn: 40, Mresult: 75, Mrelation: 45
  },
  receptionist: {
    D1: 45, D2: 80, D3: 80, D4: 55, D5: 55,
    Mlearn: 35, Mresult: 55, Mrelation: 80
  },
};

const WEIGHTS: Record<RoleKey, Weights> = {
  developer: { D1:3, D2:1, D3:2, D4:1, D5:2, Mlearn:2, Mresult:1, Mrelation:0.5 },
  sales_ops: { D1:1, D2:2, D3:3, D4:3, D5:2, Mlearn:0.5, Mresult:2, Mrelation:1 },
  receptionist: { D1:0.5, D2:3, D3:3, D4:1.5, D5:1.5, Mlearn:0.5, Mresult:1, Mrelation:2.5 },
};

function compatScore(profile: Record<string, number | null>, role: RoleKey) {
  const target = TARGETS[role];
  const w = WEIGHTS[role];

  let dist = 0;
  let wsum = 0;

  for (const k of Object.keys(target)) {
    const pv = profile[k];
    if (pv == null) continue;        // se manca, non penalizzare
    const wk = w[k] ?? 1;
    dist += wk * (Math.abs(pv - target[k]) / 100);
    wsum += wk;
  }

  if (wsum === 0) return 0;
  const score = 100 * (1 - dist / wsum);
  return Math.max(0, Math.min(100, Math.round(score)));
}

export function mapOrientationToRoles(scores: Profile) {
  const flat: Record<string, number | null> = {
    D1: scores.D1, D2: scores.D2, D3: scores.D3, D4: scores.D4, D5: scores.D5,
    Mlearn: scores.motivation.learning,
    Mresult: scores.motivation.result,
    Mrelation: scores.motivation.relation,
  };

  const roleScores: Record<RoleKey, number> = {
    developer: compatScore(flat, "developer"),
    sales_ops: compatScore(flat, "sales_ops"),
    receptionist: compatScore(flat, "receptionist"),
  };

  const ranking = (Object.keys(roleScores) as RoleKey[]).sort((a,b)=>roleScores[b]-roleScores[a]);
  const top1 = ranking[0];
  const top2 = ranking[1];
  const confidence = roleScores[top1] - roleScores[top2];

  return { roleScores, ranking, suggestedRole: top1, confidence };
}
