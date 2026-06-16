import { useEffect, useState } from 'react';
import { Layout } from '../components/Layout';
import { catalogApi, predictionsApi, Group } from '../lib/api';

interface GroupPred {
  groupId: string;
  firstTeamId: string;
  secondTeamId: string;
}

interface LiveMatch {
  id: string;
  groupName: string | null;
  status: string;
  homeTeam: { name: string } | null;
  awayTeam: { name: string } | null;
  homeScore: number | null;
  awayScore: number | null;
}

export function GroupsPage() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [groupPreds, setGroupPreds] = useState<Record<string, GroupPred>>({});
  const [thirdPreds, setThirdPreds] = useState<Record<string, string>>({});
  const [isLocked, setIsLocked] = useState(false);
  const [lockedAt, setLockedAt] = useState<string | null>(null);
  const [liveMatches, setLiveMatches] = useState<LiveMatch[]>([]);
  const [liveSource, setLiveSource] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const loadLive = () => {
    catalogApi.liveMatches('GROUPS').then((data) => {
      setLiveMatches(data.matches.filter((m) => m.phase === 'GROUPS' || m.groupName));
      setLiveSource(data.apiConfigured ? data.source : 'base de datos local');
    }).catch(console.error);
  };

  useEffect(() => {
    Promise.all([
      catalogApi.groups(),
      predictionsApi.getGroups(),
      predictionsApi.getThirds() as Promise<Array<{ groupId: string; teamId: string }>>,
    ]).then(([grps, gData, tPreds]) => {
      setGroups(grps);
      setIsLocked(gData.locked);
      const lock = gData.locks.find((l) => l.category === 'GROUPS');
      setLockedAt(lock?.lockedAt ?? null);

      const gMap: Record<string, GroupPred> = {};
      (gData.predictions as GroupPred[]).forEach((p) => { gMap[p.groupId] = p; });
      setGroupPreds(gMap);

      const tMap: Record<string, string> = {};
      tPreds.forEach((p) => { tMap[p.groupId] = p.teamId; });
      setThirdPreds(tMap);
    }).catch(console.error);

    loadLive();
    const interval = setInterval(loadLive, 60_000);
    return () => clearInterval(interval);
  }, []);

  const thirdCount = Object.keys(thirdPreds).length;
  const groupsComplete = groups.every((g) => {
    const p = groupPreds[g.id];
    return p?.firstTeamId && p?.secondTeamId;
  });

  const updateGroup = (groupId: string, field: 'firstTeamId' | 'secondTeamId', teamId: string) => {
    setGroupPreds((prev) => ({
      ...prev,
      [groupId]: {
        groupId,
        firstTeamId: prev[groupId]?.firstTeamId ?? '',
        secondTeamId: prev[groupId]?.secondTeamId ?? '',
        [field]: teamId,
      },
    }));
  };

  const toggleThird = (groupId: string, teamId: string) => {
    setThirdPreds((prev) => {
      const next = { ...prev };
      if (next[groupId]) delete next[groupId];
      else {
        if (Object.keys(next).length >= 8) return prev;
        next[groupId] = teamId;
      }
      return next;
    });
  };

  const getThirdTeam = (group: Group): string => {
    const pred = groupPreds[group.id];
    if (!pred?.firstTeamId || !pred?.secondTeamId) return '';
    return group.teams.find((t) => t.id !== pred.firstTeamId && t.id !== pred.secondTeamId)?.id ?? '';
  };

  const handleSave = async () => {
    if (!groupsComplete) {
      setError('Completa el 1ro y 2do lugar de los 12 grupos antes de enviar');
      return;
    }
    if (thirdCount !== 8) {
      setError('Debes seleccionar exactamente 8 mejores terceros');
      return;
    }

    const confirmed = window.confirm(
      '¿Confirmas tu pronóstico de grupos?\n\nSolo puedes enviarlo UNA vez. Después quedará bloqueado y no podrás modificarlo.',
    );
    if (!confirmed) return;

    setSaving(true);
    setError('');
    setMessage('');
    try {
      const groupsPayload = groups.map((g) => ({
        groupId: g.id,
        firstTeamId: groupPreds[g.id].firstTeamId,
        secondTeamId: groupPreds[g.id].secondTeamId,
      }));
      const thirds = Object.entries(thirdPreds).map(([groupId, teamId]) => ({ groupId, teamId }));

      const result = await predictionsApi.submitGroups({ groups: groupsPayload, thirds }) as {
        message: string;
        locked: boolean;
      };

      setIsLocked(true);
      setLockedAt(new Date().toISOString());
      setMessage(result.message ?? 'Pronóstico enviado y bloqueado correctamente');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  const statusLabel = (status: string) => {
    if (status === 'LIVE') return '🔴 En vivo';
    if (status === 'FINISHED') return 'Finalizado';
    return 'Programado';
  };

  return (
    <Layout>
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
        <h2 className="text-2xl font-bold text-infinito-navy">Pronóstico de Grupos</h2>
        {isLocked ? (
          <span className="badge-locked">
            Enviado y bloqueado
            {lockedAt && ` · ${new Date(lockedAt).toLocaleString('es')}`}
          </span>
        ) : (
          <span className="badge-open">Abierto — puedes enviar una sola vez</span>
        )}
      </div>

      {message && <div className="bg-green-50 text-green-700 p-3 rounded-lg mb-4">{message}</div>}
      {error && <div className="bg-red-50 text-red-700 p-3 rounded-lg mb-4">{error}</div>}

      {!isLocked && (
        <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-900">
          <strong>Importante:</strong> Marca todos los grupos y los 8 mejores terceros, luego pulsa
          &quot;Enviar pronóstico definitivo&quot;. Solo tendrás <strong>un intento</strong>.
        </div>
      )}

      <div className="mb-4 p-3 bg-infinito-navy/5 rounded-lg text-sm">
        <strong>Mejores terceros:</strong> {thirdCount}/8 seleccionados.
        {!groupsComplete && <span className="text-amber-700 ml-2">· Faltan grupos por completar</span>}
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        {groups.map((group) => (
          <div key={group.id} className="card">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-infinito-navy text-lg">Grupo {group.name}</h3>
              {thirdPreds[group.id] && (
                <span className="text-xs bg-infinito-green/30 text-infinito-navy px-2 py-0.5 rounded-full">3ro</span>
              )}
            </div>
            <div className="space-y-2">
              <div>
                <label className="text-xs text-gray-500">1er lugar</label>
                <select
                  className="input text-sm"
                  value={groupPreds[group.id]?.firstTeamId ?? ''}
                  onChange={(e) => updateGroup(group.id, 'firstTeamId', e.target.value)}
                  disabled={isLocked}
                >
                  <option value="">Seleccionar...</option>
                  {group.teams.map((t) => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-500">2do lugar</label>
                <select
                  className="input text-sm"
                  value={groupPreds[group.id]?.secondTeamId ?? ''}
                  onChange={(e) => updateGroup(group.id, 'secondTeamId', e.target.value)}
                  disabled={isLocked}
                >
                  <option value="">Seleccionar...</option>
                  {group.teams.map((t) => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>
              <button
                type="button"
                onClick={() => {
                  const thirdId = getThirdTeam(group);
                  if (thirdId) toggleThird(group.id, thirdId);
                }}
                disabled={isLocked || !getThirdTeam(group)}
                className={`w-full text-xs py-1.5 rounded-lg border transition-colors ${
                  thirdPreds[group.id]
                    ? 'bg-infinito-green text-white border-infinito-green'
                    : 'border-gray-300 hover:border-infinito-green'
                }`}
              >
                {thirdPreds[group.id] ? '✓ Tercero seleccionado' : 'Marcar tercero de este grupo'}
              </button>
            </div>
          </div>
        ))}
      </div>

      {!isLocked && (
        <button
          onClick={handleSave}
          className="btn-primary"
          disabled={saving || !groupsComplete || thirdCount !== 8}
        >
          {saving ? 'Enviando...' : 'Enviar pronóstico definitivo (1 solo intento)'}
        </button>
      )}

      <div className="card mt-8">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-bold text-infinito-navy">Resultados en tiempo real</h3>
          <button type="button" onClick={loadLive} className="text-sm text-infinito-orange hover:underline">
            Actualizar
          </button>
        </div>
        <p className="text-xs text-gray-500 mb-3">
          Fuente: {liveSource || 'consultando...'} · Se actualiza al consultar y cada 60 segundos
        </p>
        <div className="space-y-2 max-h-80 overflow-y-auto">
          {liveMatches.length === 0 ? (
            <p className="text-sm text-gray-500">No hay partidos de grupos disponibles aún.</p>
          ) : (
            liveMatches.map((m) => (
              <div key={m.id} className="flex justify-between items-center py-2 border-b border-gray-100 text-sm">
                <span className="text-gray-500 w-16">Gr. {m.groupName ?? '—'}</span>
                <span className="flex-1 text-center">
                  {m.homeTeam?.name} <strong>{m.homeScore ?? '-'} : {m.awayScore ?? '-'}</strong> {m.awayTeam?.name}
                </span>
                <span className="text-xs w-24 text-right">{statusLabel(m.status)}</span>
              </div>
            ))
          )}
        </div>
      </div>
    </Layout>
  );
}
