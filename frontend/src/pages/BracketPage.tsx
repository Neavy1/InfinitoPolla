import { useEffect, useState } from 'react';
import { Layout } from '../components/Layout';
import { catalogApi, predictionsApi, Team } from '../lib/api';

const PHASES = [
  { key: 'R32', label: 'Dieciseisavos', slots: 16 },
  { key: 'R16', label: 'Octavos', slots: 8 },
  { key: 'QF', label: 'Cuartos', slots: 4 },
];

export function BracketPage() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [activePhase, setActivePhase] = useState('R32');
  const [predictions, setPredictions] = useState<Record<string, string>>({});
  const [finalPred, setFinalPred] = useState({ championId: '', runnerUpId: '', thirdId: '', fourthId: '' });
  const [phaseLocked, setPhaseLocked] = useState(false);
  const [finalLocked, setFinalLocked] = useState(false);
  const [templates, setTemplates] = useState<Array<{ slot: string; description?: string }>>([]);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    catalogApi.teams().then(setTeams).catch(console.error);
    predictionsApi.getFinal().then((f) => {
      setFinalLocked(f.locked);
      const data = f.prediction as Record<string, string> | null;
      if (data) {
        setFinalPred({
          championId: data.championId ?? '',
          runnerUpId: data.runnerUpId ?? '',
          thirdId: data.thirdId ?? '',
          fourthId: data.fourthId ?? '',
        });
      }
    }).catch(console.error);
  }, []);

  useEffect(() => {
    if (activePhase === 'FINAL_POS') return;

    predictionsApi.getBracket(activePhase).then((data) => {
      setPhaseLocked(data.locked);
      const map: Record<string, string> = {};
      (data.predictions as Array<{ slot: string; teamId: string }>).forEach((p) => {
        map[p.slot] = p.teamId;
      });
      setPredictions(map);
    }).catch(console.error);

    if (activePhase === 'R32') {
      catalogApi.bracketTemplate('R32').then(setTemplates).catch(console.error);
    } else {
      setTemplates([]);
    }
  }, [activePhase]);

  const phaseConfig = PHASES.find((p) => p.key === activePhase);
  const slots = phaseConfig
    ? Array.from({ length: phaseConfig.slots }, (_, i) => {
        const slot = activePhase === 'R32' ? `M${i + 1}` : `${i + 1}`;
        const tmpl = templates.find((t) => t.slot === slot);
        return { slot, description: tmpl?.description ?? `Clasificado ${i + 1}` };
      })
    : [];

  const handleSaveBracket = async () => {
    const confirmed = window.confirm(
      `¿Enviar pronóstico de ${phaseConfig?.label}?\n\nSolo puedes hacerlo UNA vez. Después quedará bloqueado.`,
    );
    if (!confirmed) return;

    setSaving(true);
    setError('');
    setMessage('');
    try {
      const preds = Object.entries(predictions)
        .filter(([, teamId]) => teamId)
        .map(([slot, teamId]) => ({ slot, teamId }));
      const result = await predictionsApi.saveBracket(activePhase, preds) as { message: string };
      setPhaseLocked(true);
      setMessage(result.message ?? 'Pronóstico enviado y bloqueado');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveFinal = async () => {
    const confirmed = window.confirm(
      '¿Enviar posiciones finales?\n\nSolo puedes hacerlo UNA vez. Después quedará bloqueado.',
    );
    if (!confirmed) return;

    setSaving(true);
    setError('');
    setMessage('');
    try {
      const result = await predictionsApi.saveFinal(finalPred) as { message: string };
      setFinalLocked(true);
      setMessage(result.message ?? 'Posiciones finales bloqueadas');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Layout>
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
        <h2 className="text-2xl font-bold text-infinito-navy">Pronóstico de Llave</h2>
        {activePhase !== 'FINAL_POS' && (
          phaseLocked ? (
            <span className="badge-locked">Enviado y bloqueado</span>
          ) : (
            <span className="badge-open">Abierto — un solo intento</span>
          )
        )}
      </div>

      {message && <div className="bg-green-50 text-green-700 p-3 rounded-lg mb-4">{message}</div>}
      {error && <div className="bg-red-50 text-red-700 p-3 rounded-lg mb-4">{error}</div>}

      <div className="flex gap-2 mb-6 overflow-x-auto">
        {PHASES.map((p) => (
          <button
            key={p.key}
            onClick={() => setActivePhase(p.key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap ${
              activePhase === p.key ? 'bg-infinito-orange text-white' : 'bg-white border border-gray-200'
            }`}
          >
            {p.label}
          </button>
        ))}
        <button
          onClick={() => setActivePhase('FINAL_POS')}
          className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap ${
            activePhase === 'FINAL_POS' ? 'bg-infinito-orange text-white' : 'bg-white border border-gray-200'
          }`}
        >
          Posiciones Finales
        </button>
      </div>

      {activePhase !== 'FINAL_POS' ? (
        <>
          {activePhase === 'R32' && (
            <div className="mb-4 p-3 bg-infinito-navy/5 rounded-lg text-sm">
              <strong>Formato FIFA 2026:</strong> Los 1ros de A, B, D, E, I, G, K y L enfrentan a un tercero.
              Los 1ros de C, F, H y J enfrentan a un segundo. Hay 4 cruces entre segundos.
            </div>
          )}
          <div className="grid md:grid-cols-2 gap-3 mb-6">
            {slots.map(({ slot, description }) => (
              <div key={slot} className="card py-3">
                <label className="text-xs text-gray-500 block mb-1">{description}</label>
                <select
                  className="input text-sm"
                  value={predictions[slot] ?? ''}
                  onChange={(e) => setPredictions((prev) => ({ ...prev, [slot]: e.target.value }))}
                  disabled={phaseLocked}
                >
                  <option value="">Seleccionar equipo...</option>
                  {teams.map((t) => (
                    <option key={t.id} value={t.id}>{t.name} (Grupo {t.group?.name})</option>
                  ))}
                </select>
              </div>
            ))}
          </div>
          {!phaseLocked && (
            <button onClick={handleSaveBracket} className="btn-primary" disabled={saving}>
              {saving ? 'Enviando...' : `Enviar ${phaseConfig?.label} (1 solo intento)`}
            </button>
          )}
        </>
      ) : (
        <>
          <div className="mb-4 p-3 bg-infinito-navy/5 rounded-lg text-sm">
            Predice campeón (10 pts), subcampeón (5 pts), tercero (3 pts) y cuarto (3 pts).
          </div>
          {finalLocked ? (
            <span className="badge-locked mb-4 inline-block">Posiciones finales enviadas y bloqueadas</span>
          ) : (
            <span className="badge-open mb-4 inline-block">Abierto — un solo intento</span>
          )}
          <div className="grid md:grid-cols-2 gap-4 mb-6">
            {([
              ['championId', 'Campeón', 10],
              ['runnerUpId', 'Subcampeón', 5],
              ['thirdId', 'Tercer puesto', 3],
              ['fourthId', 'Cuarto puesto', 3],
            ] as const).map(([field, label, pts]) => (
              <div key={field} className="card py-3">
                <label className="text-sm font-medium text-infinito-navy">{label} ({pts} pts)</label>
                <select
                  className="input text-sm mt-1"
                  value={finalPred[field]}
                  onChange={(e) => setFinalPred((prev) => ({ ...prev, [field]: e.target.value }))}
                  disabled={finalLocked}
                >
                  <option value="">Seleccionar...</option>
                  {teams.map((t) => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>
            ))}
          </div>
          {!finalLocked && (
            <button onClick={handleSaveFinal} className="btn-primary" disabled={saving}>
              {saving ? 'Enviando...' : 'Enviar posiciones finales (1 solo intento)'}
            </button>
          )}
        </>
      )}
    </Layout>
  );
}
