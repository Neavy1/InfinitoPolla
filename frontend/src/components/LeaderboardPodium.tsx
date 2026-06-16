import { LeaderboardEntry } from '../lib/api';

const PODIUM_STYLES = [
  { order: 'order-2 md:order-1', height: 'h-28', bg: 'bg-gray-300', medal: '🥈', label: '2do lugar' },
  { order: 'order-1 md:order-2', height: 'h-36', bg: 'bg-infinito-orange', medal: '🥇', label: 'Líder / Ganador' },
  { order: 'order-3', height: 'h-24', bg: 'bg-amber-600', medal: '🥉', label: '3er lugar' },
];

interface Props {
  podium: LeaderboardEntry[];
  leader: LeaderboardEntry | null;
}

export function LeaderboardPodium({ podium, leader }: Props) {
  if (podium.length === 0) {
    return (
      <div className="card text-center text-gray-500 py-8">
        Aún no hay puntajes. El ranking se actualizará cuando termine la primera fase.
      </div>
    );
  }

  const display = [podium[1], podium[0], podium[2]].filter(Boolean);

  return (
    <div className="card mb-6">
      <div className="text-center mb-6">
        <h3 className="text-xl font-bold text-infinito-navy">Tabla de posiciones</h3>
        {leader && (
          <p className="text-sm text-infinito-orange font-semibold mt-1">
            Líder actual: {leader.username} — {leader.totalPoints} pts
          </p>
        )}
      </div>

      <div className="flex items-end justify-center gap-3 md:gap-6 mb-4">
        {display.map((entry, i) => {
          if (!entry) return <div key={i} className="w-24" />;
          const style = PODIUM_STYLES[i];
          return (
            <div key={entry.userId} className={`flex flex-col items-center w-24 md:w-32 ${style.order}`}>
              <span className="text-2xl mb-1">{style.medal}</span>
              <div className="text-center mb-2">
                <p className="font-bold text-sm text-infinito-navy truncate max-w-[8rem]">{entry.username}</p>
                <p className="text-lg font-bold text-infinito-orange">{entry.totalPoints}</p>
                <p className="text-xs text-gray-500">pts</p>
              </div>
              <div className={`w-full ${style.height} ${style.bg} rounded-t-lg flex items-end justify-center pb-2`}>
                <span className="text-white font-bold text-xl">#{entry.rank}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
