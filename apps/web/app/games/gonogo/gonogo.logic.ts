// app/games/gng/gng.logic.ts
export type StimulusType = 'go' | 'nogo'

export type TrialDef = {
  trialIndex: number
  block: number // 0=practice, 1..N=main blocks
  stimulusType: StimulusType
  stimulusLabel: string
  fixationMs: number
  stimulusMs: number
  responseWindowMs: number
  itiMs: number
}

export type TrialResult = {
  trialIndex: number
  block: number
  stimulusType: StimulusType
  responded: boolean
  reactionTimeMs: number | null
  correct: boolean
}

function randInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function shuffle<T>(arr: T[]) {
  const a = arr.slice()
  for (let i = a.length - 1; i > 0; i--) {
    const j = randInt(0, i)
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function buildBlockSequence(opts: {
  blockSize: number
  goCount: number
  nogoCount: number
  noNogoFirstK?: number
  maxConsecutiveNogo?: number
  minGoBetweenNogos?: number
  maxRetries?: number
}) {
  const {
    blockSize,
    goCount,
    nogoCount,
    noNogoFirstK = 3,
    maxConsecutiveNogo = 2,
    minGoBetweenNogos = 2,
    maxRetries = 2000,
  } = opts

  if (goCount + nogoCount !== blockSize) {
    throw new Error('goCount + nogoCount must equal blockSize')
  }

  const base: StimulusType[] = [
    ...Array(goCount).fill('go'),
    ...Array(nogoCount).fill('nogo'),
  ]

  // Pass 1: hard + soft
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const seq = shuffle(base)

    // Hard: no NO-GO in first K
    for (let i = 0; i < Math.min(noNogoFirstK, seq.length); i++) {
      if (seq[i] === 'nogo') continue
    }
    let ok = true
    for (let i = 0; i < Math.min(noNogoFirstK, seq.length); i++) {
      if (seq[i] === 'nogo') {
        ok = false
        break
      }
    }
    if (!ok) continue

    // Hard: max consecutive NO-GO
    let consecutive = 0
    for (let i = 0; i < seq.length; i++) {
      consecutive = seq[i] === 'nogo' ? consecutive + 1 : 0
      if (consecutive > maxConsecutiveNogo) {
        ok = false
        break
      }
    }
    if (!ok) continue

    // Soft: prefer >= minGoBetweenNogos
    let violations = 0
    let lastNogo: number | null = null
    for (let i = 0; i < seq.length; i++) {
      if (seq[i] !== 'nogo') continue
      if (lastNogo != null) {
        const goBetween = i - lastNogo - 1
        if (goBetween < minGoBetweenNogos) violations++
      }
      lastNogo = i
    }

    if (violations === 0) return { seq, violations }
  }

  // Pass 2: relax soft, keep hard
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const seq = shuffle(base)

    let ok = true
    for (let i = 0; i < Math.min(noNogoFirstK, seq.length); i++) {
      if (seq[i] === 'nogo') {
        ok = false
        break
      }
    }
    if (!ok) continue

    let consecutive = 0
    for (let i = 0; i < seq.length; i++) {
      consecutive = seq[i] === 'nogo' ? consecutive + 1 : 0
      if (consecutive > maxConsecutiveNogo) {
        ok = false
        break
      }
    }
    if (!ok) continue

    return { seq, violations: null as number | null }
  }

  throw new Error('Failed to generate a valid block sequence.')
}

export function generateGngTrials({
  practice = { total: 16, go: 12, nogo: 4 },
  main = { total: 60, blocks: 1, goRatio: 0.75 },
  // Constraints
  noNogoFirstK = 3,
  maxConsecutiveNogo = 2,
  minGoBetweenNogos = 2,
  // Timing (ms)
  fixationMs = 250,
  stimulusMs = 300,
  responseWindowMs = 700,
  itiMinMs = 450,
  itiMaxMs = 850,
  // Labels
  labels = { go: '●', nogo: '⊗' },
} = {}) {
  // Practice
  const practiceSeq = buildBlockSequence({
    blockSize: practice.total,
    goCount: practice.go,
    nogoCount: practice.nogo,
    noNogoFirstK: 1,
    maxConsecutiveNogo: 2,
    minGoBetweenNogos: 1,
  }).seq

  const practiceTrials: TrialDef[] = practiceSeq.map((t, i) => ({
    trialIndex: i,
    block: 0,
    stimulusType: t,
    stimulusLabel: t === 'go' ? labels.go : labels.nogo,
    fixationMs,
    stimulusMs,
    responseWindowMs,
    itiMs: randInt(itiMinMs, itiMaxMs),
  }))

  // Main
  const blockSize = Math.floor(main.total / main.blocks)
  if (blockSize * main.blocks !== main.total) {
    throw new Error('main.total must be divisible by main.blocks')
  }

  const totalGo = Math.round(main.total * main.goRatio)
  const totalNogo = main.total - totalGo

  const goBase = Math.floor(totalGo / main.blocks)
  const goRem = totalGo - goBase * main.blocks
  const nogoBase = Math.floor(totalNogo / main.blocks)
  const nogoRem = totalNogo - nogoBase * main.blocks

  const goPerBlock = Array(main.blocks)
    .fill(goBase)
    .map((v, idx) => v + (idx < goRem ? 1 : 0))
  const nogoPerBlock = Array(main.blocks)
    .fill(nogoBase)
    .map((v, idx) => v + (idx < nogoRem ? 1 : 0))

  const mainTrials: TrialDef[] = []
  let globalIndex = 0

  for (let b = 0; b < main.blocks; b++) {
    const { seq } = buildBlockSequence({
      blockSize,
      goCount: goPerBlock[b],
      nogoCount: nogoPerBlock[b],
      noNogoFirstK,
      maxConsecutiveNogo,
      minGoBetweenNogos,
    })

    for (let i = 0; i < seq.length; i++) {
      const t = seq[i]
      mainTrials.push({
        trialIndex: globalIndex++,
        block: b + 1,
        stimulusType: t,
        stimulusLabel: t === 'go' ? labels.go : labels.nogo,
        fixationMs,
        stimulusMs,
        responseWindowMs,
        itiMs: randInt(itiMinMs, itiMaxMs),
      })
    }
  }

  return {
    practiceTrials,
    mainTrials,
    meta: {
      fixationMs,
      stimulusMs,
      responseWindowMs,
      itiMinMs,
      itiMaxMs,
      practice,
      main: { ...main, totalGo, totalNogo, blockSize },
    },
  }
}

function mean(nums: number[]) {
  if (!nums.length) return null
  return nums.reduce((a, b) => a + b, 0) / nums.length
}

function std(nums: number[]) {
  if (nums.length < 2) return 0
  const m = mean(nums) as number
  const v = nums.reduce((acc, x) => acc + (x - m) ** 2, 0) / (nums.length - 1)
  return Math.sqrt(v)
}

function clamp01(x: number) {
  return Math.max(0, Math.min(1, x))
}

export function computeGngOutcomes(results: TrialResult[]) {
  const main = results.filter((t) => t.block >= 1)
  const go = main.filter((t) => t.stimulusType === 'go')
  const nogo = main.filter((t) => t.stimulusType === 'nogo')

  const goAccuracy = go.length ? go.filter((t) => t.correct).length / go.length : null
  const nogoAccuracy = nogo.length ? nogo.filter((t) => t.correct).length / nogo.length : null

  const falseAlarms = nogo.filter((t) => t.responded).length
  const misses = go.filter((t) => !t.responded).length

  const falseAlarmRate = nogo.length ? falseAlarms / nogo.length : null
  const missRate = go.length ? misses / go.length : null

  const goRTs = go
    .filter((t) => t.responded && t.correct && typeof t.reactionTimeMs === 'number')
    .map((t) => t.reactionTimeMs as number)
    .filter((rt) => rt >= 150 && rt <= 900)

  const meanRtGo = mean(goRTs)
  const rtVariability = std(goRTs)

  // Post-error slowing
  const ordered = main.slice().sort((a, b) => a.trialIndex - b.trialIndex)
  const errors = new Set(ordered.filter((t) => !t.correct).map((t) => t.trialIndex))
  const byIndex = new Map(ordered.map((t) => [t.trialIndex, t]))

  const postErrorRTs: number[] = []
  const baselineRTs: number[] = []

  for (const t of ordered) {
    if (t.stimulusType !== 'go') continue
    if (!t.responded || !t.correct || typeof t.reactionTimeMs !== 'number') continue
    const rt = t.reactionTimeMs
    if (rt < 150 || rt > 900) continue

    const prev = byIndex.get(t.trialIndex - 1)
    if (prev && errors.has(prev.trialIndex)) postErrorRTs.push(rt)
    else baselineRTs.push(rt)
  }

  const postErrorSlowing =
    mean(postErrorRTs) != null && mean(baselineRTs) != null
      ? (mean(postErrorRTs) as number) - (mean(baselineRTs) as number)
      : null

  // Fatigue/trend in 3 segments
  const n = ordered.length
  const segN = Math.floor(n / 3)
  const segA = ordered.slice(0, segN)
  const segC = ordered.slice(2 * segN)

  const errRate = (seg: TrialResult[]) =>
    seg.length ? seg.filter((t) => !t.correct).length / seg.length : null

  const segMeanGoRT = (seg: TrialResult[]) => {
    const rts = seg
      .filter((t) => t.stimulusType === 'go' && t.responded && t.correct && typeof t.reactionTimeMs === 'number')
      .map((t) => t.reactionTimeMs as number)
      .filter((rt) => rt >= 150 && rt <= 900)
    return mean(rts)
  }

  const errA = errRate(segA)
  const errC = errRate(segC)
  const rtA = segMeanGoRT(segA)
  const rtC = segMeanGoRT(segC)

  const fatigueDrop = errA != null && errC != null ? (errC as number) - (errA as number) : null
  const rtTrend = rtA != null && rtC != null ? (rtC as number) - (rtA as number) : null

  // MVP normalized indices 0..1 (poi in analisi li z-scori sul campione)
  const inhibition01 =
    nogoAccuracy == null || falseAlarmRate == null || rtVariability == null
      ? null
      : clamp01(
          0.55 * (nogoAccuracy as number) +
            0.25 * (1 - (falseAlarmRate as number)) +
            0.2 * (1 - clamp01((rtVariability as number) / 250))
        )

  const impulsivity01 =
    falseAlarmRate == null || meanRtGo == null
      ? null
      : clamp01(
          0.65 * (falseAlarmRate as number) +
            0.35 * (1 - clamp01(((meanRtGo as number) - 150) / 450))
        )

  const stability01 = (() => {
    const parts: number[] = []
    if (fatigueDrop != null) parts.push(1 - clamp01(((fatigueDrop as number) + 0.02) / 0.25))
    if (rtTrend != null) parts.push(1 - clamp01(((rtTrend as number) + 10) / 250))
    if (!parts.length) return null
    return clamp01((mean(parts) as number) ?? 0)
  })()

  const rtControl01 =
    meanRtGo == null || rtVariability == null
      ? null
      : clamp01(
          0.6 * (1 - clamp01(((meanRtGo as number) - 200) / 600)) +
            0.4 * (1 - clamp01((rtVariability as number) / 250))
        )

  const final01 = (() => {
    const parts: { w: number; v: number }[] = []
    if (inhibition01 != null) parts.push({ w: 0.4, v: inhibition01 })
    if (stability01 != null) parts.push({ w: 0.2, v: stability01 })
    if (rtControl01 != null) parts.push({ w: 0.2, v: rtControl01 })
    if (impulsivity01 != null) parts.push({ w: 0.2, v: 1 - impulsivity01 })

    if (!parts.length) return null
    const wSum = parts.reduce((a, p) => a + p.w, 0)
    const vSum = parts.reduce((a, p) => a + p.w * p.v, 0)
    return clamp01(vSum / wSum)
  })()

  const dataQuality = (() => {
    if (goAccuracy == null || nogoAccuracy == null || meanRtGo == null) return 'warn'
    if ((goAccuracy as number) < 0.6) return 'bad'
    if ((meanRtGo as number) < 150 || (meanRtGo as number) > 900) return 'warn'
    if ((nogoAccuracy as number) < 0.3 && (goAccuracy as number) > 0.85) return 'warn'
    return 'ok'
  })()

  return {
    go_accuracy: goAccuracy,
    nogo_accuracy: nogoAccuracy,
    false_alarm_rate: falseAlarmRate,
    miss_rate: missRate,
    mean_rt_go: meanRtGo,
    rt_variability: rtVariability,
    post_error_slowing: postErrorSlowing,
    fatigue_drop: fatigueDrop,
    rt_trend: rtTrend,
    inhibition_index_01: inhibition01,
    impulsivity_index_01: impulsivity01,
    final_score: final01 == null ? null : Math.round(final01 * 100),
    data_quality: dataQuality,
  }
}