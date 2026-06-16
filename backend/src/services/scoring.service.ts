import { Phase } from '@prisma/client';
import { prisma } from '../prisma.js';

interface ScoringRules {
  groupOrder: number;
  groupUnordered: number;
  thirdPlace: number;
  r32Order: number;
  r32Unordered: number;
  r16Order: number;
  r16Unordered: number;
  qfOrder: number;
  qfUnordered: number;
  champion: number;
  runnerUp: number;
  third: number;
  fourth: number;
}

async function getScoringRules(): Promise<ScoringRules> {
  const configs = await prisma.scoringConfig.findMany();
  const map = Object.fromEntries(configs.map((c) => [c.key, c.points]));

  return {
    groupOrder: map.group_order ?? 3,
    groupUnordered: map.group_unordered ?? 2,
    thirdPlace: map.third_place ?? 2,
    r32Order: map.r32_order ?? 3,
    r32Unordered: map.r32_unordered ?? 2,
    r16Order: map.r16_order ?? 3,
    r16Unordered: map.r16_unordered ?? 2,
    qfOrder: map.qf_order ?? 3,
    qfUnordered: map.qf_unordered ?? 2,
    champion: map.champion ?? 10,
    runnerUp: map.runner_up ?? 5,
    third: map.third ?? 3,
    fourth: map.fourth ?? 3,
  };
}

function scoreOrderedPair(
  predictedFirst: string,
  predictedSecond: string,
  actualFirst: string,
  actualSecond: string,
  orderPts: number,
  unorderedPts: number,
): number {
  if (predictedFirst === actualFirst && predictedSecond === actualSecond) return orderPts;
  const predicted = new Set([predictedFirst, predictedSecond]);
  const actual = new Set([actualFirst, actualSecond]);
  if (predictedFirst === predictedSecond) return 0;
  if (predicted.size === 2 && actual.size === 2 && [...predicted].every((t) => actual.has(t))) {
    return unorderedPts;
  }
  return 0;
}

function scorePositionList(
  predicted: string[],
  actual: string[],
  orderPts: number,
  unorderedPts: number,
): number {
  let points = 0;
  const actualSet = new Set(actual);
  for (let i = 0; i < predicted.length; i++) {
    if (predicted[i] === actual[i]) {
      points += orderPts;
    } else if (actualSet.has(predicted[i])) {
      points += unorderedPts;
    }
  }
  return points;
}

export async function recalculateAllScores(): Promise<void> {
  const rules = await getScoringRules();
  const users = await prisma.user.findMany({ select: { id: true } });

  const standings = await prisma.groupStanding.findMany({
    include: { group: true },
    orderBy: [{ groupId: 'asc' }, { position: 'asc' }],
  });

  const standingsByGroup = new Map<string, { first: string; second: string; third: string }>();
  for (const s of standings) {
    if (!standingsByGroup.has(s.groupId)) {
      standingsByGroup.set(s.groupId, { first: '', second: '', third: '' });
    }
    const entry = standingsByGroup.get(s.groupId)!;
    if (s.position === 1) entry.first = s.teamId;
    if (s.position === 2) entry.second = s.teamId;
    if (s.position === 3) entry.third = s.teamId;
  }

  const qualifiedThirds = new Set(
    (await prisma.thirdsTable.findMany({ where: { qualified: true } })).map((t) => t.teamId),
  );

  const bracketResults = await getBracketResultsByPhase();

  for (const user of users) {
    const breakdown: Record<string, number> = {};
    let groupPoints = 0;
    let thirdPoints = 0;
    let r32Points = 0;
    let r16Points = 0;
    let qfPoints = 0;
    let finalPosPoints = 0;

    const groupPreds = await prisma.groupPrediction.findMany({ where: { userId: user.id } });
    for (const pred of groupPreds) {
      const actual = standingsByGroup.get(pred.groupId);
      if (!actual?.first || !actual?.second) continue;
      const pts = scoreOrderedPair(
        pred.firstTeamId,
        pred.secondTeamId,
        actual.first,
        actual.second,
        rules.groupOrder,
        rules.groupUnordered,
      );
      groupPoints += pts;
    }

    const thirdPreds = await prisma.thirdPrediction.findMany({ where: { userId: user.id } });
    for (const pred of thirdPreds) {
      if (qualifiedThirds.has(pred.teamId)) {
        thirdPoints += rules.thirdPlace;
      }
    }

    const bracketPreds = await prisma.bracketPrediction.findMany({ where: { userId: user.id } });

    for (const phase of [Phase.R32, Phase.R16, Phase.QF] as Phase[]) {
      const phasePreds = bracketPreds
        .filter((p) => p.phase === phase)
        .sort((a, b) => a.slot.localeCompare(b.slot, undefined, { numeric: true }));
      const actual = bracketResults.get(phase) ?? [];
      if (phasePreds.length === 0 || actual.length === 0) continue;

      const predicted = phasePreds.map((p) => p.teamId);
      const orderPts =
        phase === Phase.R32 ? rules.r32Order : phase === Phase.R16 ? rules.r16Order : rules.qfOrder;
      const unorderedPts =
        phase === Phase.R32 ? rules.r32Unordered : phase === Phase.R16 ? rules.r16Unordered : rules.qfUnordered;
      const pts = scorePositionList(predicted, actual, orderPts, unorderedPts);

      if (phase === Phase.R32) r32Points = pts;
      else if (phase === Phase.R16) r16Points = pts;
      else qfPoints = pts;
    }

    const finalPred = await prisma.finalPrediction.findUnique({ where: { userId: user.id } });
    if (finalPred) {
      const actualChampion = bracketResults.get(Phase.FINAL)?.[0];
      const actualRunnerUp = bracketResults.get(Phase.FINAL)?.[1];
      const actualThird = bracketResults.get(Phase.THIRD_PLACE)?.[0];
      const actualFourth = bracketResults.get(Phase.THIRD_PLACE)?.[1];

      if (actualChampion && finalPred.championId === actualChampion) finalPosPoints += rules.champion;
      if (actualRunnerUp && finalPred.runnerUpId === actualRunnerUp) finalPosPoints += rules.runnerUp;
      if (actualThird && finalPred.thirdId === actualThird) finalPosPoints += rules.third;
      if (actualFourth && finalPred.fourthId === actualFourth) finalPosPoints += rules.fourth;
    }

    breakdown.group = groupPoints;
    breakdown.thirds = thirdPoints;
    breakdown.r32 = r32Points;
    breakdown.r16 = r16Points;
    breakdown.qf = qfPoints;
    breakdown.finalPositions = finalPosPoints;

    const totalPoints = groupPoints + thirdPoints + r32Points + r16Points + qfPoints + finalPosPoints;

    await prisma.score.upsert({
      where: { userId: user.id },
      create: {
        userId: user.id,
        totalPoints,
        groupPoints,
        thirdPoints,
        r32Points,
        r16Points,
        qfPoints,
        finalPosPoints,
        breakdown,
      },
      update: {
        totalPoints,
        groupPoints,
        thirdPoints,
        r32Points,
        r16Points,
        qfPoints,
        finalPosPoints,
        breakdown,
      },
    });
  }
}

async function getBracketResultsByPhase(): Promise<Map<Phase, string[]>> {
  const result = new Map<Phase, string[]>();
  const phases: Phase[] = [Phase.R32, Phase.R16, Phase.QF, Phase.SF, Phase.THIRD_PLACE, Phase.FINAL];

  for (const phase of phases) {
    const matches = await prisma.match.findMany({
      where: { phase, status: 'FINISHED', homeScore: { not: null } },
      orderBy: { bracketSlot: 'asc' },
    });

    const teams: string[] = [];
    for (const match of matches) {
      if (match.homeScore === null || match.awayScore === null) continue;
      const winner =
        match.homeScore > match.awayScore
          ? match.homeTeamId
          : match.awayScore > match.homeScore
            ? match.awayTeamId
            : match.homeTeamId;
      if (winner) teams.push(winner);
    }

    if (phase === Phase.FINAL && matches.length > 0) {
      const final = matches[0];
      if (final.homeScore !== null && final.awayScore !== null) {
        const winner =
          final.homeScore > final.awayScore ? final.homeTeamId : final.awayTeamId;
        const loser =
          final.homeScore > final.awayScore ? final.awayTeamId : final.homeTeamId;
        result.set(Phase.FINAL, [winner, loser].filter(Boolean) as string[]);
        continue;
      }
    }

    if (phase === Phase.THIRD_PLACE && matches.length > 0) {
      const tp = matches[0];
      if (tp.homeScore !== null && tp.awayScore !== null) {
        const winner = tp.homeScore > tp.awayScore ? tp.homeTeamId : tp.awayTeamId;
        const loser = tp.homeScore > tp.awayScore ? tp.awayTeamId : tp.homeTeamId;
        result.set(Phase.THIRD_PLACE, [winner, loser].filter(Boolean) as string[]);
        continue;
      }
    }

    result.set(phase, teams);
  }

  return result;
}

export async function recalculateThirdsTable(): Promise<void> {
  const standings = await prisma.groupStanding.findMany({
    where: { position: 3 },
    include: { team: { include: { group: true } } },
  });

  const sorted = standings
    .map((s) => ({
      teamId: s.teamId,
      groupName: s.team.group.name,
      points: s.points,
      goalDiff: s.goalDiff,
      goalsFor: s.goalsFor,
      fairPlayScore: s.fairPlayScore,
      goalsAgainst: s.goalsAgainst,
      yellowCards: s.yellowCards,
      redCards: s.redCards,
    }))
    .sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      if (b.goalDiff !== a.goalDiff) return b.goalDiff - a.goalDiff;
      if (b.goalsFor !== a.goalsFor) return b.goalsFor - a.goalsFor;
      return a.fairPlayScore - b.fairPlayScore;
    });

  await prisma.thirdsTable.deleteMany();

  for (let i = 0; i < sorted.length; i++) {
    const t = sorted[i];
    await prisma.thirdsTable.create({
      data: {
        teamId: t.teamId,
        groupName: t.groupName,
        rank: i + 1,
        qualified: i < 8,
        points: t.points,
        goalsFor: t.goalsFor,
        goalsAgainst: t.goalsAgainst,
        goalDiff: t.goalDiff,
        yellowCards: t.yellowCards,
        redCards: t.redCards,
        fairPlayScore: t.fairPlayScore,
      },
    });
  }
}
