import { useEffect, useState } from 'react';

const PHASE_LABELS: Record<string, string> = {
  GROUPS: 'Fase de Grupos',
  R32: 'Dieciseisavos',
  R16: 'Octavos',
  QF: 'Cuartos',
  SF: 'Semifinales',
  THIRD_PLACE: 'Tercer Puesto',
  FINAL: 'Final',
};

interface Props {
  lockAt: string | null;
  phase: string;
  isLocked?: boolean;
}

export function CountdownTimer({ lockAt, phase, isLocked }: Props) {
  const [remaining, setRemaining] = useState('');

  useEffect(() => {
    if (!lockAt) return;

    const update = () => {
      const diff = new Date(lockAt).getTime() - Date.now();
      if (diff <= 0) {
        setRemaining('Bloqueado');
        return;
      }
      const days = Math.floor(diff / 86400000);
      const hours = Math.floor((diff % 86400000) / 3600000);
      const mins = Math.floor((diff % 3600000) / 60000);
      const secs = Math.floor((diff % 60000) / 1000);
      setRemaining(`${days}d ${hours}h ${mins}m ${secs}s`);
    };

    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [lockAt]);

  const locked = isLocked || remaining === 'Bloqueado';

  return (
    <div className="flex items-center gap-3">
      <span className="text-sm font-medium text-gray-600">{PHASE_LABELS[phase] ?? phase}</span>
      {locked ? (
        <span className="badge-locked">Cerrado</span>
      ) : (
        <>
          <span className="badge-open">Abierto</span>
          <span className="text-sm font-mono text-infinito-navy">{remaining}</span>
        </>
      )}
    </div>
  );
}
