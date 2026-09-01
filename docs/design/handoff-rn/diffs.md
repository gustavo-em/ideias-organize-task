# Diffs de apoio — fase 2

Os quatro arquivos ao lado (`SharedDay.ts`, `sharedDay.ts`, `sharedDay.test.ts`,
`SharedDayBand.tsx`) entram como estão, nos destinos escritos no topo de cada
um. O que falta são estas mudanças em arquivos que já existem.

## 1. `src/app/theme/theme.ts`

```diff
   onAccent: string;
+  /** Texto de apoio sobre um preenchimento accent. Tinta a 78%: o nome do
+   * membro fica em onAccent, a tarefa dele aqui. */
+  onAccentSubtle: string;
+  /** Separador dentro de uma faixa accent. Tinta a 18%. */
+  onAccentLine: string;
```

Nos **dois** temas o valor é o mesmo — `accent` não muda entre claro e escuro,
então o que está escrito sobre ele também não muda:

```ts
onAccentSubtle: 'rgba(27, 23, 16, 0.78)',
onAccentLine: 'rgba(27, 23, 16, 0.18)',
```

## 2. `src/features/tasks/presentation/views/MemberChip.tsx`

A ficha precisa de um modo invertido: dentro do amarelo, a ficha tonal
desaparece. Uma prop, não um componente novo.

```diff
   /** Convite ainda não aceito: contorno tracejado, sem preenchimento. */
   pending?: boolean;
+  /** Dentro de uma faixa accent: fundo onAccent e letra accent, porque a cor
+   * tonal do membro sumiria no amarelo. */
+  inverted?: boolean;
```

```diff
-      $tone={pending ? 'transparent' : tone}
+      $tone={pending ? 'transparent' : inverted ? theme.colors.onAccent : tone}
```

```diff
           $color={
             pending
               ? theme.colors.mutedStrong
+              : inverted
+              ? theme.colors.accent
               : onSun
               ? theme.colors.onAccent
               : theme.colors.card
           }
```

E, no `Chip`, a borda de quem está `stacked` ou `pending` passa a vir de
`accent` quando `inverted` (é a cor do fundo atrás dela):

```diff
   border-color: ${({ theme, $pending, $inverted }) =>
-    $pending ? theme.colors.border : theme.colors.card};
+    $inverted
+      ? theme.colors.accent
+      : $pending
+      ? theme.colors.border
+      : theme.colors.card};
```

Nenhum uso atual passa `inverted`, então nada muda na pilha da linha do
projeto nem na folha.

## 3. `src/features/tasks/presentation/localization/taskCopy.ts`

No tipo, dentro de `lists`:

```ts
dayBandTitle: string;
dayBandEmpty: string;
dayBandTakeOne: string;
dayBandAbsent: string;
dayBandAllDone: (count: number) => string;
dayBandStreak: (days: number) => string;
dayBandOffline: string;
```

pt-BR:

```ts
dayBandTitle: 'Hoje, no combinado',
dayBandEmpty: 'Ninguém levou nada para hoje ainda.',
dayBandTakeOne: 'Levar uma para hoje',
dayBandAbsent: 'Ainda não levou nada',
dayBandAllDone: count =>
  count === 1 ? 'Você fechou hoje' : `Os ${count} fecharam hoje`,
dayBandStreak: days =>
  days === 1
    ? '1 dia em que todo mundo fechou o que levou.'
    : `${days} dias seguidos em que todo mundo fechou o que levou.`,
dayBandOffline: 'Sem conexão agora — mostrando o que já estava no aparelho.',
```

en-US:

```ts
dayBandTitle: 'Today, together',
dayBandEmpty: 'Nobody has taken anything for today yet.',
dayBandTakeOne: 'Take one for today',
dayBandAbsent: "Hasn't taken anything yet",
dayBandAllDone: count =>
  count === 1 ? 'You closed yours today' : `All ${count} closed today`,
dayBandStreak: days =>
  days === 1
    ? '1 day where everyone closed what they took.'
    : `${days} days in a row where everyone closed what they took.`,
dayBandOffline: 'No connection right now — showing what was on the device.',
```

O teste de paridade (`__tests__/taskCopy.test.ts`) já cobre as duas listas.

## 4. `src/features/tasks/application/ports/ShareGateway.ts`

O dia de cada pessoa não cabe no `pull`/`push` da lista: ele é por membro e por
dia, e expira. Dois métodos novos:

```diff
+  /** O dia que cada membro publicou para este projeto. Só o dia de `dayMs`. */
+  pullDay(
+    share: ListShare,
+    dayMs: number,
+  ): Promise<readonly SharedMemberDay[]>;
+  /** Publica o meu. Chamado quando o trio muda e quando o foco começa ou
+   * termina — nunca em intervalo fixo. */
+  pushDay(share: ListShare, day: SharedMemberDay): Promise<void>;
```

No `firestoreShareGateway`, `sharedLists/<token>/days/<dayMs>_<personId>`. No
`inMemoryShareGateway` (`__mocks__`), um `Map` — os testes precisam dos dois.

Publicar é o único lugar que precisa de algo perto de tempo real. Se sair caro
nesta fatia: **entregue sem `focusTaskId`** (sempre `null`). A faixa continua
correta, só nunca acende o `FocusGlyph`; nada mais muda.

## 5. `src/features/tasks/presentation/view-models/useTasksViewModel.ts`

- Guardar `sharedDays: Record<string, readonly SharedMemberDay[]>` por
  `listId`, preenchido no mesmo `refreshAllSharedLists` que já existe.
- Publicar o meu dia (`pushDay`) quando o trio muda: assine `day.planned` /
  `task.completed` / `focus.started` / `focus.finished` no subscriber que já
  faz o push da lista (`createSharePushSubscriber`), em vez de um novo.
- Expor `sharedDayFor(listId)` chamando `sharedDay(members, days, tasks, nowMs)`
  e `groupStreak(listId)`.

## 6. `src/features/tasks/presentation/screens/ListsScreen.tsx`

Primeiro filho do `Expanded`, antes do `AllDoneBanner` e das tarefas:

```diff
   {isOpenList ? (
     <Expanded entering={FadeIn.duration(200)}>
+      {shared ? (
+        <SharedDayBand
+          copy={copy}
+          entries={viewModel.sharedDayFor(list.id)}
+          offline={viewModel.shareErrorKind === 'network'}
+          onTakeOne={isViewer ? undefined : () => setCapturingForList(list)}
+          streakDays={viewModel.groupStreak(list.id)}
+        />
+      ) : null}
       {tasks.length === 0 ? (
```

Projeto não compartilhado não renderiza nada ali — nem espaço reservado.

## 7. Sequência do grupo

`groupStreak` conta dias em que **todos** que entraram no dia fecharam o que
levaram, derivado dos `SharedMemberDay` guardados. Se o dado de alguém não
chegou, **o dia não conta** — nunca chute um dia fechado. E nada disso encosta
em `ProgressState`: sequência individual, nível e peso continuam no aparelho de
cada um.
