import { useCallback, useEffect, useState } from 'react';
import { Layout } from '../components/Layout';
import { LeaderboardPodium } from '../components/LeaderboardPodium';
import { catalogApi, leaderboardApi, LeaderboardEntry, LeaderboardSummary } from '../lib/api';
import { useAuth } from '../context/AuthContext';

const REFRESH_MS = 60_000;

export function LeaderboardPage() {
  const { user } = useAuth();
  const [summary, setSummary] = useState<LeaderboardSummary | null>(null);
  const [myScore, setMyScore] = useState<LeaderboardEntry | null>(null);
  const [scoring, setScoring] = useState<Array<{ key: string; label: string; points: number }>>([]);

  const load = useCallback(() => {
    leaderboardApi.get().then(setSummary).catch(console.error);
    leaderboardApi.me().then(setMyScore).catch(console.error);
    catalogApi.scoringConfig().then(setScoring).catch(console.error);
  }, []);

  useEffect(() => {
    load();
    const interval = setInterval(load, REFRESH_MS);
    return () => clearInterval(interval);
  }, [load]);

  const entries = summary?.entries ?? [];
  const completedPhases = summary?.completedPhases.filter((p) => p.completed) ?? [];

  return (
    <Layout>
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-2">
        <h2 className="text-2xl font-bold text-infinito-navy">Ranking</h2>
        {summary?.lastUpdatedAt && (
          <p className="text-sm text-gray-500">
            Última actualización: {new Date(summary.lastUpdatedAt).toLocaleString('es')}
          </p>
        )}
      </div>

      {summary && (
        <LeaderboardPodium podium={summary.podium} leader={summary.leader} />
      )}

      {completedPhases.length > 0 && (
        <div className="card mb-6">
          <h3 className="font-bold text-infinito-navy mb-3">Fases procesadas en el ranking</h3>
          <div className="flex flex-wrap gap-2">
            {completedPhases.map((p) => (
              <span
                key={p.phase}
                className="inline-flex items-center gap-1 bg-infinito-green/20 text-infinito-navy text-xs font-medium px-3 py-1 rounded-full"
              >
                ✓ {p.label}
                {p.rankingUpdatedAt && (
                  <span className="text-gray-500 font-normal">
                    ({new Date(p.rankingUpdatedAt).toLocaleDateString('es')})
                  </span>
                )}
              </span>
            ))}
          </div>
          <p className="text-xs text-gray-500 mt-2">
            El ranking se recalcula automáticamente al terminar cada fase del Mundial.
          </p>
        </div>
      )}

      {myScore && (
        <div className="card mb-6 border-l-4 border-infinito-orange">
          <h3 className="font-bold text-infinito-navy mb-3">Mi posición: #{myScore.rank} de {summary?.totalPlayers ?? '—'}</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
            <div><span className="text-gray-500">Grupos:</span> <strong>{myScore.groupPoints}</strong></div>
            <div><span className="text-gray-500">Terceros:</span> <strong>{myScore.thirdPoints}</strong></div>
            <div><span className="text-gray-500">Dieciseisavos:</span> <strong>{myScore.r32Points}</strong></div>
            <div><span className="text-gray-500">Octavos:</span> <strong>{myScore.r16Points}</strong></div>
            <div><span className="text-gray-500">Cuartos:</span> <strong>{myScore.qfPoints}</strong></div>
            <div><span className="text-gray-500">Posiciones finales:</span> <strong>{myScore.finalPosPoints}</strong></div>
            <div className="col-span-2"><span className="text-gray-500">Total:</span> <strong className="text-infinito-orange text-lg">{myScore.totalPoints}</strong></div>
          </div>
        </div>
      )}

      <div className="card mb-6">
        <h3 className="font-bold text-infinito-navy mb-3">Sistema de puntos</h3>
        <div className="grid md:grid-cols-2 gap-2 text-sm">
          {scoring.map((s) => (
            <div key={s.key} className="flex justify-between py-1 border-b border-gray-100">
              <span className="text-gray-600">{s.label}</span>
              <span className="font-semibold text-infinito-navy">{s.points} pts</span>
            </div>
          ))}
        </div>
      </div>

      <div className="card overflow-x-auto">
        <div className="flex justify-between items-center mb-3">
          <h3 className="font-bold text-infinito-navy">Todos los participantes ({entries.length})</h3>
          <button type="button" onClick={load} className="text-sm text-infinito-orange hover:underline">
            Actualizar
          </button>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 text-left">
              <th className="py-2 px-2">#</th>
              <th className="py-2 px-2">Usuario</th>
              <th className="py-2 px-2 text-right">Total</th>
              <th className="py-2 px-2 text-right hidden md:table-cell">Grupos</th>
              <th className="py-2 px-2 text-right hidden md:table-cell">3ros</th>
              <th className="py-2 px-2 text-right hidden lg:table-cell">R32</th>
              <th className="py-2 px-2 text-right hidden lg:table-cell">R16</th>
              <th className="py-2 px-2 text-right hidden lg:table-cell">QF</th>
              <th className="py-2 px-2 text-right hidden lg:table-cell">Final</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((e) => (
              <tr
                key={e.userId}
                className={`border-b border-gray-50 ${
                  e.rank === 1 ? 'bg-yellow-50 font-semibold' : ''
                } ${e.userId === user?.id ? 'bg-infinito-orange/10' : ''}`}
              >
                <td className="py-2 px-2 font-bold">
                  {e.rank === 1 ? '🏆 ' : ''}{e.rank}
                </td>
                <td className="py-2 px-2">
                  {e.username}
                  {e.rank === 1 && <span className="ml-2 text-xs text-infinito-orange">Líder</span>}
                </td>
                <td className="py-2 px-2 text-right font-bold text-infinito-navy">{e.totalPoints}</td>
                <td className="py-2 px-2 text-right hidden md:table-cell">{e.groupPoints}</td>
                <td className="py-2 px-2 text-right hidden md:table-cell">{e.thirdPoints}</td>
                <td className="py-2 px-2 text-right hidden lg:table-cell">{e.r32Points}</td>
                <td className="py-2 px-2 text-right hidden lg:table-cell">{e.r16Points}</td>
                <td className="py-2 px-2 text-right hidden lg:table-cell">{e.qfPoints}</td>
                <td className="py-2 px-2 text-right hidden lg:table-cell">{e.finalPosPoints}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Layout>
  );
}
