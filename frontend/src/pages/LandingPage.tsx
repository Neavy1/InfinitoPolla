import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { leaderboardApi, LeaderboardEntry } from '../lib/api';
import { useAuth } from '../context/AuthContext';

export function LandingPage() {
  const { user } = useAuth();
  const [leader, setLeader] = useState<LeaderboardEntry | null>(null);

  useEffect(() => {
    leaderboardApi.summary().then((s) => setLeader(s.leader)).catch(() => {});
  }, []);

  return (
    <Layout>
      <section className="text-center py-12">
        <img src="/logo.jpg" alt="Tiendas Infinito" className="h-24 mx-auto mb-6 rounded-lg shadow" />
        <h1 className="text-4xl md:text-5xl font-bold text-infinito-navy mb-4">
          Polla Infinito 2026
        </h1>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto mb-8">
          Pronostica el Mundial 2026 con 48 equipos. Clasificados de grupos, mejores terceros,
          llave completa y posiciones finales. Los pronósticos se bloquean 1 minuto antes de cada fase.
        </p>
        {user ? (
          <Link to="/dashboard" className="btn-primary text-lg px-8 py-3 inline-block">
            Ir al Dashboard
          </Link>
        ) : (
          <div className="flex gap-4 justify-center">
            <Link to="/register" className="btn-primary text-lg px-8 py-3">Registrarse</Link>
            <Link to="/login" className="btn-secondary text-lg px-8 py-3">Iniciar Sesión</Link>
          </div>
        )}
      </section>

      {leader && (
        <section className="card max-w-md mx-auto text-center mb-8 border-2 border-infinito-orange">
          <p className="text-sm text-gray-500">Líder de la polla</p>
          <p className="text-2xl font-bold text-infinito-navy">🏆 {leader.username}</p>
          <p className="text-infinito-orange font-bold text-xl">{leader.totalPoints} puntos</p>
        </section>
      )}

      <section className="grid md:grid-cols-3 gap-6 mt-8">
        {[
          { title: 'Fase de Grupos', desc: 'Predice 1ro y 2do de cada grupo + 8 mejores terceros', pts: '3 pts orden / 2 pts desorden' },
          { title: 'Eliminatorias', desc: 'Dieciseisavos, octavos y cuartos con el formato FIFA 2026', pts: '3 pts orden / 2 pts desorden' },
          { title: 'Posiciones Finales', desc: 'Campeón, subcampeón, tercero y cuarto', pts: '10 / 5 / 3 / 3 pts' },
        ].map((item) => (
          <div key={item.title} className="card text-center">
            <h3 className="font-bold text-infinito-navy text-lg mb-2">{item.title}</h3>
            <p className="text-gray-600 text-sm mb-3">{item.desc}</p>
            <span className="inline-block bg-infinito-green/20 text-infinito-navy text-xs font-semibold px-3 py-1 rounded-full">
              {item.pts}
            </span>
          </div>
        ))}
      </section>
    </Layout>
  );
}
