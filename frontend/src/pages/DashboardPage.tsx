import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { CountdownTimer } from '../components/CountdownTimer';
import { catalogApi, leaderboardApi, Deadline, LeaderboardEntry } from '../lib/api';
import { useAuth } from '../context/AuthContext';

export function DashboardPage() {
  const { user } = useAuth();
  const [deadlines, setDeadlines] = useState<Deadline[]>([]);
  const [myScore, setMyScore] = useState<{ totalPoints: number; rank: number } | null>(null);
  const [leader, setLeader] = useState<LeaderboardEntry | null>(null);

  useEffect(() => {
    catalogApi.deadlines().then(setDeadlines).catch(console.error);
    leaderboardApi.me().then((s) => {
      setMyScore({ totalPoints: s.totalPoints, rank: s.rank });
      setLeader(s.leader);
    }).catch(console.error);
  }, []);

  return (
    <Layout>
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-infinito-navy">Hola, {user?.username}</h2>
        <p className="text-gray-600">Bienvenido a la Polla Infinito Mundial 2026</p>
      </div>

      {myScore && (
        <div className="grid md:grid-cols-3 gap-4 mb-8">
          <div className="card bg-gradient-to-br from-infinito-navy to-blue-900 text-white">
            <p className="text-sm opacity-80">Mis puntos</p>
            <p className="text-4xl font-bold">{myScore.totalPoints}</p>
          </div>
          <div className="card bg-gradient-to-br from-infinito-orange to-orange-600 text-white">
            <p className="text-sm opacity-80">Mi posición</p>
            <p className="text-4xl font-bold">#{myScore.rank}</p>
          </div>
          {leader && (
            <div className="card bg-gradient-to-br from-yellow-400 to-amber-500 text-infinito-navy">
              <p className="text-sm opacity-80">🏆 Líder actual</p>
              <p className="text-xl font-bold truncate">{leader.username}</p>
              <p className="text-2xl font-bold">{leader.totalPoints} pts</p>
            </div>
          )}
        </div>
      )}

      <div className="card mb-8">
        <h3 className="font-bold text-lg text-infinito-navy mb-4">Plazos por fase</h3>
        <p className="text-sm text-gray-500 mb-4">
          Los pronósticos se bloquean 1 minuto antes del primer partido de cada fase.
        </p>
        <div className="space-y-3">
          {deadlines.map((d) => (
            <CountdownTimer key={d.phase} lockAt={d.lockAt} phase={d.phase} isLocked={d.isLocked} />
          ))}
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        <Link to="/groups" className="card hover:shadow-lg transition-shadow border-l-4 border-infinito-orange">
          <h3 className="font-bold text-infinito-navy">Pronosticar Grupos</h3>
          <p className="text-sm text-gray-600 mt-1">1ro, 2do y mejores terceros</p>
        </Link>
        <Link to="/bracket" className="card hover:shadow-lg transition-shadow border-l-4 border-infinito-green">
          <h3 className="font-bold text-infinito-navy">Pronosticar Llave</h3>
          <p className="text-sm text-gray-600 mt-1">Dieciseisavos hasta la final</p>
        </Link>
        <Link to="/leaderboard" className="card hover:shadow-lg transition-shadow border-l-4 border-infinito-navy">
          <h3 className="font-bold text-infinito-navy">Ver Ranking</h3>
          <p className="text-sm text-gray-600 mt-1">Tabla de posiciones</p>
        </Link>
      </div>
    </Layout>
  );
}
