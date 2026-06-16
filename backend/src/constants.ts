import { Phase } from '@prisma/client';

export const PHASE_ORDER: Phase[] = [
  Phase.GROUPS,
  Phase.R32,
  Phase.R16,
  Phase.QF,
  Phase.SF,
  Phase.THIRD_PLACE,
  Phase.FINAL,
];

export const PHASE_LABELS: Record<Phase, string> = {
  GROUPS: 'Fase de Grupos',
  R32: 'Dieciseisavos de Final',
  R16: 'Octavos de Final',
  QF: 'Cuartos de Final',
  SF: 'Semifinales',
  THIRD_PLACE: 'Tercer Puesto',
  FINAL: 'Final',
};

export const PREDICTION_PHASE_MAP: Record<string, Phase> = {
  groups: Phase.GROUPS,
  thirds: Phase.GROUPS,
  r32: Phase.R32,
  r16: Phase.R16,
  qf: Phase.QF,
  sf: Phase.SF,
  final: Phase.FINAL,
};

export const DEFAULT_SCORING = [
  { key: 'group_order', label: 'Grupos - acierto en orden', points: 3 },
  { key: 'group_unordered', label: 'Grupos - acierto en desorden', points: 2 },
  { key: 'third_place', label: 'Mejores terceros', points: 2 },
  { key: 'r32_order', label: 'Dieciseisavos - acierto en orden', points: 3 },
  { key: 'r32_unordered', label: 'Dieciseisavos - acierto en desorden', points: 2 },
  { key: 'r16_order', label: 'Octavos - acierto en orden', points: 3 },
  { key: 'r16_unordered', label: 'Octavos - acierto en desorden', points: 2 },
  { key: 'qf_order', label: 'Cuartos - acierto en orden', points: 3 },
  { key: 'qf_unordered', label: 'Cuartos - acierto en desorden', points: 2 },
  { key: 'champion', label: 'Campeón', points: 10 },
  { key: 'runner_up', label: 'Subcampeón', points: 5 },
  { key: 'third', label: 'Tercer puesto', points: 3 },
  { key: 'fourth', label: 'Cuarto puesto', points: 3 },
];

// Grupos cuyo 1ro enfrenta a un tercero en R32 (formato FIFA 2026)
export const FIRST_VS_THIRD_GROUPS = ['A', 'B', 'D', 'E', 'I', 'G', 'K', 'L'];
export const FIRST_VS_SECOND_GROUPS = ['C', 'F', 'H', 'J'];
