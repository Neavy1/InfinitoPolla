import { useEffect, useState } from 'react';
import { Layout } from '../components/Layout';
import { adminApi } from '../lib/api';

interface Match {
  id: string;
  phase: string;
  kickoffAt: string;
  homeTeam?: { name: string };
  awayTeam?: { name: string };
  homeScore: number | null;
  awayScore: number | null;
  bracketSlot?: string;
}

interface Audit {
  id: string;
  createdAt: string;
  category: string;
  field: string;
  oldValue: string | null;
  newValue: string | null;
  user: { username: string };
}

export function AdminPage() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [audits, setAudits] = useState<Audit[]>([]);
  const [message, setMessage] = useState('');
  const [scores, setScores] = useState<Record<string, { home: number; away: number }>>({});

  const load = () => {
    adminApi.matches().then((m) => {
      setMatches(m as Match[]);
      const map: Record<string, { home: number; away: number }> = {};
      (m as Match[]).forEach((match) => {
        map[match.id] = { home: match.homeScore ?? 0, away: match.awayScore ?? 0 };
      });
      setScores(map);
    }).catch(console.error);
    adminApi.audit().then((a) => setAudits(a as Audit[])).catch(console.error);
  };

  useEffect(() => { load(); }, []);

  const saveResult = async (matchId: string) => {
    const s = scores[matchId];
    if (!s) return;
    try {
      const result = await adminApi.updateMatchResult(matchId, { homeScore: s.home, awayScore: s.away }) as {
        ranking?: { message?: string; newlyCompletedPhases?: string[] };
      };
      const rankingMsg = result.ranking?.message;
      const phases = result.ranking?.newlyCompletedPhases?.join(', ');
      setMessage(phases ? `${rankingMsg} (${phases})` : rankingMsg ?? 'Resultado guardado');
      load();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Error');
    }
  };

  const recalculate = async () => {
    try {
      await adminApi.recalculate();
      setMessage('Puntajes recalculados');
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Error');
    }
  };

  return (
    <Layout>
      <h2 className="text-2xl font-bold text-infinito-navy mb-6">Panel Admin</h2>
      {message && <div className="bg-blue-50 text-blue-700 p-3 rounded-lg mb-4">{message}</div>}

      <button onClick={recalculate} className="btn-primary mb-6">Recalcular puntajes</button>

      <div className="card mb-8 overflow-x-auto">
        <h3 className="font-bold mb-4">Partidos</h3>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left">
              <th className="py-2">Fase</th>
              <th className="py-2">Partido</th>
              <th className="py-2">Resultado</th>
              <th className="py-2"></th>
            </tr>
          </thead>
          <tbody>
            {matches.slice(0, 50).map((m) => (
              <tr key={m.id} className="border-b border-gray-50">
                <td className="py-2">{m.phase}</td>
                <td className="py-2">
                  {m.homeTeam?.name ?? 'TBD'} vs {m.awayTeam?.name ?? 'TBD'}
                </td>
                <td className="py-2">
                  <div className="flex gap-1 items-center">
                    <input
                      type="number"
                      min={0}
                      className="w-12 border rounded px-1"
                      value={scores[m.id]?.home ?? 0}
                      onChange={(e) => setScores((prev) => ({
                        ...prev,
                        [m.id]: { ...prev[m.id], home: parseInt(e.target.value) || 0 },
                      }))}
                    />
                    <span>-</span>
                    <input
                      type="number"
                      min={0}
                      className="w-12 border rounded px-1"
                      value={scores[m.id]?.away ?? 0}
                      onChange={(e) => setScores((prev) => ({
                        ...prev,
                        [m.id]: { ...prev[m.id], away: parseInt(e.target.value) || 0 },
                      }))}
                    />
                  </div>
                </td>
                <td className="py-2">
                  <button onClick={() => saveResult(m.id)} className="text-xs btn-secondary py-1 px-2">Guardar</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="card overflow-x-auto">
        <h3 className="font-bold mb-4">Auditoría de pronósticos</h3>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left">
              <th className="py-2">Fecha</th>
              <th className="py-2">Usuario</th>
              <th className="py-2">Categoría</th>
              <th className="py-2">Campo</th>
              <th className="py-2">Cambio</th>
            </tr>
          </thead>
          <tbody>
            {audits.map((a) => (
              <tr key={a.id} className="border-b border-gray-50">
                <td className="py-2 whitespace-nowrap">{new Date(a.createdAt).toLocaleString('es')}</td>
                <td className="py-2">{a.user.username}</td>
                <td className="py-2">{a.category}</td>
                <td className="py-2">{a.field}</td>
                <td className="py-2 text-xs">{a.oldValue ?? '—'} → {a.newValue ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Layout>
  );
}
