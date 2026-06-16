import { Phase, Role } from '@prisma/client';
import argon2 from 'argon2';
import { PrismaClient } from '@prisma/client';
import { DEFAULT_SCORING, FIRST_VS_THIRD_GROUPS, FIRST_VS_SECOND_GROUPS } from '../src/constants.js';
import { config } from '../src/config.js';

const prisma = new PrismaClient();

const GROUPS_DATA: Record<string, string[]> = {
  A: ['México', 'Sudáfrica', 'Corea del Sur', 'Europa D'],
  B: ['Canadá', 'Catar', 'Suiza', 'Europa A'],
  C: ['Brasil', 'Marruecos', 'Haití', 'Escocia'],
  D: ['Estados Unidos', 'Paraguay', 'Australia', 'Europa C'],
  E: ['Alemania', 'Curazao', 'Costa de Marfil', 'Ecuador'],
  F: ['Países Bajos', 'Japón', 'Europa B', 'Túnez'],
  G: ['Bélgica', 'Egipto', 'Irán', 'Nueva Zelanda'],
  H: ['España', 'Cabo Verde', 'Arabia Saudita', 'Uruguay'],
  I: ['Francia', 'Senegal', 'Noruega', 'Europa E'],
  J: ['Argentina', 'Argelia', 'Austria', 'Jordania'],
  K: ['Portugal', 'Europa F', 'Uzbekistán', 'Colombia'],
  L: ['Inglaterra', 'Croacia', 'Ghana', 'Panamá'],
};

const TEAM_CODES: Record<string, string> = {
  'México': 'MEX', 'Sudáfrica': 'RSA', 'Corea del Sur': 'KOR', 'Europa D': 'EURD',
  'Canadá': 'CAN', 'Catar': 'QAT', 'Suiza': 'SUI', 'Europa A': 'EURA',
  'Brasil': 'BRA', 'Marruecos': 'MAR', 'Haití': 'HAI', 'Escocia': 'SCO',
  'Estados Unidos': 'USA', 'Paraguay': 'PAR', 'Australia': 'AUS', 'Europa C': 'EURC',
  'Alemania': 'GER', 'Curazao': 'CUW', 'Costa de Marfil': 'CIV', 'Ecuador': 'ECU',
  'Países Bajos': 'NED', 'Japón': 'JPN', 'Europa B': 'EURB', 'Túnez': 'TUN',
  'Bélgica': 'BEL', 'Egipto': 'EGY', 'Irán': 'IRN', 'Nueva Zelanda': 'NZL',
  'España': 'ESP', 'Cabo Verde': 'CPV', 'Arabia Saudita': 'KSA', 'Uruguay': 'URU',
  'Francia': 'FRA', 'Senegal': 'SEN', 'Noruega': 'NOR', 'Europa E': 'EURE',
  'Argentina': 'ARG', 'Argelia': 'ALG', 'Austria': 'AUT', 'Jordania': 'JOR',
  'Portugal': 'POR', 'Europa F': 'EURF', 'Uzbekistán': 'UZB', 'Colombia': 'COL',
  'Inglaterra': 'ENG', 'Croacia': 'CRO', 'Ghana': 'GHA', 'Panamá': 'PAN',
};

function flagUrl(code: string): string {
  const lower = code.toLowerCase().replace('eur', 'un');
  return `https://flagcdn.com/w40/${lower === 'eurd' || lower === 'eura' || lower === 'eurc' || lower === 'eurb' || lower === 'eure' || lower === 'eurf' ? 'un' : lower.slice(0, 2)}.png`;
}

function date(year: number, month: number, day: number, hour = 12): Date {
  return new Date(Date.UTC(year, month - 1, day, hour + 5, 0, 0));
}

const R32_BRACKET = [
  { slot: 'M1', home: '2A', away: '2B', desc: '2do A vs 2do B' },
  { slot: 'M2', home: '1E', away: '3rd', desc: '1ro E vs mejor 3ro' },
  { slot: 'M3', home: '1F', away: '2C', desc: '1ro F vs 2do C' },
  { slot: 'M4', home: '1C', away: '2F', desc: '1ro C vs 2do F' },
  { slot: 'M5', home: '1I', away: '3rd', desc: '1ro I vs mejor 3ro' },
  { slot: 'M6', home: '2E', away: '2I', desc: '2do E vs 2do I' },
  { slot: 'M7', home: '1A', away: '3rd', desc: '1ro A vs mejor 3ro' },
  { slot: 'M8', home: '1L', away: '3rd', desc: '1ro L vs mejor 3ro' },
  { slot: 'M9', home: '1D', away: '3rd', desc: '1ro D vs mejor 3ro' },
  { slot: 'M10', home: '1G', away: '3rd', desc: '1ro G vs mejor 3ro' },
  { slot: 'M11', home: '2K', away: '2L', desc: '2do K vs 2do L' },
  { slot: 'M12', home: '1H', away: '2J', desc: '1ro H vs 2do J' },
  { slot: 'M13', home: '1B', away: '3rd', desc: '1ro B vs mejor 3ro' },
  { slot: 'M14', home: '1J', away: '2H', desc: '1ro J vs 2do H' },
  { slot: 'M15', home: '1K', away: '3rd', desc: '1ro K vs mejor 3ro' },
  { slot: 'M16', home: '2D', away: '2G', desc: '2do D vs 2do G' },
];

async function main() {
  console.log('Sembrando base de datos...');

  for (const item of DEFAULT_SCORING) {
    await prisma.scoringConfig.upsert({
      where: { key: item.key },
      create: item,
      update: { points: item.points, label: item.label },
    });
  }

  const groupMap = new Map<string, string>();

  for (const [groupName, teams] of Object.entries(GROUPS_DATA)) {
    const group = await prisma.group.upsert({
      where: { name: groupName },
      create: { name: groupName },
      update: {},
    });
    groupMap.set(groupName, group.id);

    for (const teamName of teams) {
      const code = TEAM_CODES[teamName] ?? teamName.slice(0, 3).toUpperCase();
      await prisma.team.upsert({
        where: { code },
        create: {
          name: teamName,
          code,
          flagUrl: flagUrl(code),
          groupId: group.id,
        },
        update: { name: teamName, groupId: group.id },
      });
    }
  }

  const allTeams = await prisma.team.findMany({ include: { group: true } });
  const teamByGroupPos = new Map<string, string>();
  for (const t of allTeams) {
    teamByGroupPos.set(`${t.group.name}`, t.id);
  }

  const groupStart = date(2026, 6, 11, 12);
  let matchDay = 0;
  for (const [groupName, teams] of Object.entries(GROUPS_DATA)) {
    const groupTeams = allTeams.filter((t) => t.group.name === groupName);
    const kickoff = new Date(groupStart);
    kickoff.setDate(kickoff.getDate() + Math.floor(matchDay / 2));

    const pairings = [
      [groupTeams[0], groupTeams[1]],
      [groupTeams[2], groupTeams[3]],
      [groupTeams[0], groupTeams[2]],
      [groupTeams[1], groupTeams[3]],
      [groupTeams[0], groupTeams[3]],
      [groupTeams[1], groupTeams[2]],
    ];

    for (let i = 0; i < pairings.length; i++) {
      const ko = new Date(kickoff);
      ko.setDate(ko.getDate() + Math.floor(i / 2));
      await prisma.match.upsert({
        where: { id: `group-${groupName}-m${i + 1}` },
        create: {
          id: `group-${groupName}-m${i + 1}`,
          phase: Phase.GROUPS,
          kickoffAt: ko,
          homeTeamId: pairings[i][0].id,
          awayTeamId: pairings[i][1].id,
          groupName,
          bracketSlot: `${groupName}${i + 1}`,
        },
        update: { kickoffAt: ko },
      });
    }
    matchDay++;
  }

  const r32Start = date(2026, 6, 28, 14);
  for (let i = 0; i < R32_BRACKET.length; i++) {
    const b = R32_BRACKET[i];
    const ko = new Date(r32Start);
    ko.setDate(ko.getDate() + Math.floor(i / 2));
    await prisma.match.upsert({
      where: { id: `r32-${b.slot}` },
      create: {
        id: `r32-${b.slot}`,
        phase: Phase.R32,
        kickoffAt: ko,
        bracketSlot: b.slot,
      },
      update: { kickoffAt: ko },
    });

    await prisma.bracketTemplate.upsert({
      where: { phase_slot: { phase: Phase.R32, slot: b.slot } },
      create: {
        phase: Phase.R32,
        slot: b.slot,
        homeSource: b.home,
        awaySource: b.away,
        description: b.desc,
      },
      update: { homeSource: b.home, awaySource: b.away, description: b.desc },
    });
  }

  const knockoutPhases: Array<{ phase: Phase; count: number; start: Date }> = [
    { phase: Phase.R16, count: 8, start: date(2026, 7, 4, 14) },
    { phase: Phase.QF, count: 4, start: date(2026, 7, 9, 14) },
    { phase: Phase.SF, count: 2, start: date(2026, 7, 14, 14) },
    { phase: Phase.THIRD_PLACE, count: 1, start: date(2026, 7, 18, 14) },
    { phase: Phase.FINAL, count: 1, start: date(2026, 7, 19, 14) },
  ];

  for (const kp of knockoutPhases) {
    for (let i = 0; i < kp.count; i++) {
      const ko = new Date(kp.start);
      ko.setDate(ko.getDate() + i);
      const slot = `${kp.phase}-${i + 1}`;
      await prisma.match.upsert({
        where: { id: slot },
        create: { id: slot, phase: kp.phase, kickoffAt: ko, bracketSlot: `${i + 1}` },
        update: { kickoffAt: ko },
      });
    }
  }

  const adminHash = await argon2.hash(config.adminPassword);
  await prisma.user.upsert({
    where: { username: config.adminUsername },
    create: {
      username: config.adminUsername,
      passwordHash: adminHash,
      role: Role.ADMIN,
      score: { create: {} },
    },
    update: { passwordHash: adminHash, role: Role.ADMIN },
  });

  console.log('Seed completado.');
  console.log(`Admin: ${config.adminUsername}`);
  console.log(`Grupos 1ro vs 3ro: ${FIRST_VS_THIRD_GROUPS.join(', ')}`);
  console.log(`Grupos 1ro vs 2do: ${FIRST_VS_SECOND_GROUPS.join(', ')}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
