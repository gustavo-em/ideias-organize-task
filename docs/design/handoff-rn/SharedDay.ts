// Destino: src/features/tasks/domain/SharedDay.ts
//
// O dia que cada pessoa publicou para o grupo. Não é o trio inteiro dela: é
// só a parte do trio que pertence a ESTE projeto, mais em qual tarefa ela
// está em foco. O trio completo continua privado — o grupo não precisa saber
// que você também levou "pagar o IPVA" da sua Caixa.

export interface SharedMemberDay {
  personId: string;
  /** Meia-noite do dia a que pertence. Um dia não atravessa a noite:
   * amanhã tem o seu. Mesmo formato de `TrioSelection.dayMs`. */
  dayMs: number;
  /** Ids das tarefas deste projeto que a pessoa levou para esse dia. */
  taskIds: readonly string[];
  /** Em qual delas ela está em foco agora, se o grupo sabe. Null quando
   * ninguém publicou foco — nunca "provavelmente nenhuma". */
  focusTaskId: string | null;
}

export function sanitizeSharedMemberDay(
  value: unknown,
): SharedMemberDay | null {
  if (typeof value !== 'object' || value == null) return null;

  const candidate = value as Partial<Record<keyof SharedMemberDay, unknown>>;
  const personId = candidate.personId;
  const dayMs = candidate.dayMs;

  if (typeof personId !== 'string' || personId.length === 0) return null;
  if (typeof dayMs !== 'number' || !Number.isFinite(dayMs)) return null;

  const taskIds = Array.isArray(candidate.taskIds)
    ? candidate.taskIds.filter(
        (id): id is string => typeof id === 'string' && id.length > 0,
      )
    : [];

  return {
    personId,
    dayMs,
    taskIds,
    focusTaskId:
      typeof candidate.focusTaskId === 'string' &&
      taskIds.includes(candidate.focusTaskId)
        ? candidate.focusTaskId
        : null,
  };
}
