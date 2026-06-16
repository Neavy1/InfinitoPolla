import { useEffect, useState } from 'react';
import { Layout } from '../components/Layout';
import { CountdownTimer } from '../components/CountdownTimer';
import { catalogApi, predictionsApi, Group, Deadline } from '../lib/api';

interface GroupPred {
  groupId: string;
  firstTeamId: string;
  secondTeamId: string;
}

interface ThirdPred {
  groupId: string;
  teamId: string;
}

export function GroupsPage() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [groupPreds, setGroupPreds] = useState<Record<string, GroupPred>>({});
  const [thirdPreds, setThirdPreds] = useState<Record<string, string>>({});
  const [deadline, setDeadline] = useState<Deadline | null>(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    Promise.all([
      catalogApi.groups(),
      predictionsApi.getGroups() as Promise<Array<GroupPred & { groupId: string }>>,
      predictionsApi.getThirds() as Promise<Array<ThirdPred>>,
      catalogApi.deadlines(),
    ]).then(([grps, gPreds, tPreds, deadlines]) => {
      setGroups(grps);
      const gMap: Record<string, GroupPred> = {};
      gPreds.forEach((p) => { gMap[p.groupId] = p; });
      setGroupPreds(gMap);
      const tMap: Record<string, string> = {};
      tPreds.forEach((p) => { tMap[p.groupId] = p.teamId; });
      setThirdPreds(tMap);
      setDeadline(deadlines.find((d) => d.phase === 'GROUPS') ?? null);
    }).catch(console.error);
  }, []);

  const isLocked = deadline?.isLocked ?? false;
  const thirdCount = Object.keys(thirdPreds).length;

  const updateGroup = (groupId: string, field: 'firstTeamId' | 'secondTeamId', teamId: string) => {
    setGroupPreds((prev) => ({
      ...prev,
      [groupId]: { groupId, firstTeamId: prev[groupId]?.firstTeamId ?? '', secondTeamId: prev[groupId]?.secondTeamId ?? '', [field]: teamId },
    }));
  };

  const toggleThird = (groupId: string, teamId: string) => {
    setThirdPreds((prev) => {
      const next = { ...prev };
      if (next[groupId]) {
        delete next[groupId];
      } else {
        if (Object.keys(next).length >= 8) return prev;
        next[groupId] = teamId;
      }
      return next;
    });
  };

  const getThirdTeam = (group: Group): string => {
    const pred = groupPreds[group.id];
    if (!pred?.firstTeamId || !pred?.secondTeamId) return '';
    const remaining = group.teams.find((t) => t.id !== pred.firstTeamId && t.id !== pred.secondTeamId);
    return remaining?.id ?? '';
  };

  const handleSave = async () => {
    setSaving(true);
    setError('');
    setMessage('');
    try {
      const predictions = Object.values(groupPreds).filter((p) => p.firstTeamId && p.secondTeamId);
      await predictionsApi.saveGroups(predictions);

      const thirds = Object.entries(thirdPreds).map(([groupId, teamId]) => ({ groupId, teamId }));
      if (thirds.length !== 8) {
        setError('Debes seleccionar exactamente 8 mejores terceros');
        setSaving(false);
        return;
      }
      await predictionsApi.saveThirds(thirds);
      setMessage('Pronósticos guardados correctamente');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Layout>
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
        <h2 className="text-2xl font-bold text-infinito-navy">Pronóstico de Grupos</h2>
        {deadline && <CountdownTimer lockAt={deadline.lockAt} phase="GROUPS" isLocked={deadline.isLocked} />}
      </div>

      {message && <div className="bg-green-50 text-green-700 p-3 rounded-lg mb-4">{message}</div>}
      {error && <div className="bg-red-50 text-red-700 p-3 rounded-lg mb-4">{error}</div>}

      <div className="mb-4 p-3 bg-infinito-navy/5 rounded-lg text-sm">
        <strong>Mejores terceros:</strong> {thirdCount}/8 seleccionados.
        Marca el grupo del cual crees que clasificará el tercero.
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
        <button onClick={handleSave} className="btn-primary" disabled={saving}>
          {saving ? 'Guardando...' : 'Guardar pronósticos'}
        </button>
      )}
    </Layout>
  );
}
