import { MatchStatus, Phase } from '@prisma/client';
import { config } from '../config.js';
import { prisma } from '../prisma.js';

interface ApiFixtureResponse {
  response: Array<{
    fixture: { id: number; date: string; status: { short: string; elapsed: number | null } };
    teams: {
      home: { name: string; id: number };
      away: { name: string; id: number };
    };
    goals: { home: number | null; away: number | null };
    league: { round?: string };
  }>;
}

const STATUS_MAP: Record<string, MatchStatus> = {
  NS: MatchStatus.SCHEDULED,
  TBD: MatchStatus.SCHEDULED,
  '1H': MatchStatus.LIVE,
  HT: MatchStatus.LIVE,
  '2H': MatchStatus.LIVE,
  ET: MatchStatus.LIVE,
  BT: MatchStatus.LIVE,
  P: MatchStatus.LIVE,
  LIVE: MatchStatus.LIVE,
  FT: MatchStatus.FINISHED,
  AET: MatchStatus.FINISHED,
  PEN: MatchStatus.FINISHED,
};

function normalizeName(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

const NAME_ALIASES: Record<string, string[]> = {
  usa: ['estadosunidos', 'unitedstates'],
  ksa: ['arabiasaudita', 'saudiarabia'],
  kor: ['coreadelsur', 'southkorea'],
  ger: ['alemania', 'germany'],
  ned: ['paisesbajos', 'netherlands'],
  eng: ['inglaterra', 'england'],
  civ: ['costadeivory', 'ivorycoast'],
  cuw: ['curazao', 'curacao'],
  cpv: ['caboverde', 'capeverde'],
};

function teamNamesMatch(dbName: string, apiName: string): boolean {
  const a = normalizeName(dbName);
  const b = normalizeName(apiName);
  if (a === b || a.includes(b) || b.includes(a)) return true;
  for (const aliases of Object.values(NAME_ALIASES)) {
    if (aliases.includes(a) && aliases.includes(b)) return true;
  }
  return false;
}

async function findTeamId(apiName: string): Promise<string | null> {
  const teams = await prisma.team.findMany({ select: { id: true, name: true, code: true } });
  const match = teams.find(
    (t) => teamNamesMatch(t.name, apiName) || teamNamesMatch(t.code, apiName),
  );
  return match?.id ?? null;
}

async function fetchFixturesFromApi(): Promise<ApiFixtureResponse['response']> {
  if (!config.footballApiKey) return [];

  const url = new URL(`${config.footballApiUrl}/fixtures`);
  url.searchParams.set('league', String(config.footballLeagueId));
  url.searchParams.set('season', String(config.footballSeason));

  const res = await fetch(url.toString(), {
    headers: { 'x-apisports-key': config.footballApiKey },
  });

  if (!res.ok) {
    console.warn('API-Football error:', res.status, await res.text());
    return [];
  }

  const data = (await res.json()) as ApiFixtureResponse;
  return data.response ?? [];
}

export interface LiveMatchView {
  id: string;
  phase: Phase;
  groupName: string | null;
  kickoffAt: string;
  status: MatchStatus;
  homeTeam: { id: string; name: string; code: string } | null;
  awayTeam: { id: string; name: string; code: string } | null;
  homeScore: number | null;
  awayScore: number | null;
  liveMinute: number | null;
  source: 'api' | 'database';
}

export async function syncLiveResults(): Promise<{ synced: number; source: string }> {
  const fixtures = await fetchFixturesFromApi();
  let synced = 0;

  for (const fx of fixtures) {
    const homeTeamId = await findTeamId(fx.teams.home.name);
    const awayTeamId = await findTeamId(fx.teams.away.name);
    if (!homeTeamId || !awayTeamId) continue;

    const status = STATUS_MAP[fx.fixture.status.short] ?? MatchStatus.SCHEDULED;
    const homeScore = fx.goals.home;
    const awayScore = fx.goals.away;

    const existing = await prisma.match.findFirst({
      where: {
        OR: [
          { homeTeamId, awayTeamId },
          { homeTeamId: awayTeamId, awayTeamId: homeTeamId },
        ],
      },
    });

    if (existing) {
      await prisma.match.update({
        where: { id: existing.id },
        data: {
          homeScore: homeScore ?? existing.homeScore,
          awayScore: awayScore ?? existing.awayScore,
          status,
          kickoffAt: new Date(fx.fixture.date),
        },
      });
      synced++;
    }
  }

  return { synced, source: fixtures.length > 0 ? 'api-football' : 'none' };
}

export async function getLiveMatches(phase?: Phase): Promise<{
  matches: LiveMatchView[];
  synced: number;
  source: string;
  apiConfigured: boolean;
}> {
  const sync = await syncLiveResults();

  const matches = await prisma.match.findMany({
    where: phase ? { phase } : undefined,
    include: {
      homeTeam: { select: { id: true, name: true, code: true } },
      awayTeam: { select: { id: true, name: true, code: true } },
    },
    orderBy: { kickoffAt: 'asc' },
  });

  return {
    matches: matches.map((m) => ({
      id: m.id,
      phase: m.phase,
      groupName: m.groupName,
      kickoffAt: m.kickoffAt.toISOString(),
      status: m.status,
      homeTeam: m.homeTeam,
      awayTeam: m.awayTeam,
      homeScore: m.homeScore,
      awayScore: m.awayScore,
      liveMinute: null,
      source: sync.source === 'api-football' ? 'api' : 'database',
    })),
    synced: sync.synced,
    source: sync.source,
    apiConfigured: Boolean(config.footballApiKey),
  };
}
