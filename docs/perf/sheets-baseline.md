# Abertura dos sheets: medição antes e depois

Protocolo: `__tests__/sheetOpenPerf.test.tsx`, 3 execuções, mediana. Cenário
fixo: 8 projetos, 6 tarefas por projeto (48 tarefas), um projeto aberto na tela
de Projetos; na tela de Tarefas, 47 linhas na tela. Contadores em `__DEV__`
(`src/app/perf/sheetPerf.ts`) contam renders por componente; `ms` é o tempo do
`act()` do toque (renderizador de teste, não device — serve para comparar antes
e depois no mesmo ambiente, não como número absoluto de frame).

Coleta:

```
PERF_OUT=/tmp/perf.jsonl npx jest __tests__/sheetOpenPerf.test.tsx --runInBand
```

## Antes

| Abertura                     | Renders da tela | Cards/linhas de tarefa | ms  |
| ---------------------------- | --------------- | ---------------------- | --- |
| ShareSheet (Projetos)        | 2               | 12 TaskCard            | 155 |
| JoinInviteSheet (Projetos)   | 1               | 6 TaskCard             | 45  |
| QuickCaptureSheet (Projetos) | 1               | 6 TaskCard             | 40  |
| QuickCaptureSheet (Tarefas)  | 1               | 47 TaskRow             | 139 |

## Depois

| Abertura                     | Renders da tela | Cards/linhas de tarefa | ms  |
| ---------------------------- | --------------- | ---------------------- | --- |
| ShareSheet (Projetos)        | 2               | 0                      | 84  |
| JoinInviteSheet (Projetos)   | 1               | 0                      | 5   |
| QuickCaptureSheet (Projetos) | 1               | 0                      | 6   |
| QuickCaptureSheet (Tarefas)  | 1               | 0                      | 27  |

## O que cada correção corrigiu, e a medição que a pediu

1. **`ProjectBlock` memoizado em `ListsScreen`** — o toque em "Entrar com
   convite" custava 6 renders de `TaskCard` e 45 ms sem tocar em projeto
   nenhum: o estado do sheet vive na tela e re-renderizava a lista inteira.
   Depois: 0 cards, 5 ms.
2. **`ProjectTask` memoizado (envolve `TaskCard`)** — com o `ProjectBlock` já
   memoizado, abrir o ShareSheet ainda custava 12 renders de `TaskCard`, porque
   o projeto aberto legitimamente re-renderiza duas vezes (abre o menu, fecha o
   menu) e reconstruía `action`, `onEdit`, `onDelete` e `onToggle` a cada vez.
   Depois: 0 cards, 155 ms → 84 ms.
3. **`HomeTaskRow` memoizado em `TodayScreen`** — "Nova tarefa" re-renderizava
   as 47 linhas do dia (139 ms) pelo mesmo motivo: handlers novos por render.
   Depois: 0 linhas, 27 ms.
4. **`tasksByList` com `useMemo`** — a tela filtrava a lista inteira de tarefas
   uma vez por projeto em cada render; agora agrupa uma vez por mudança de
   tarefas.

## O que foi medido e **não** corrigido

- **Renders internos dos sheets na abertura: 1 em cada um** (ShareSheet,
  JoinInviteSheet, QuickCaptureSheet). Não há cascata dentro do sheet, então
  memoizar a linha de membro do ShareSheet não tinha medição que a justificasse
  e não foi feito.
- **Custo de montagem do primeiro sheet do processo (~85 ms)**: medido em
  isolamento, o JoinInviteSheet sozinho também custa ~86 ms, ou seja, é
  aquecimento de módulo/tema do primeiro sheet montado, não peso do ShareSheet.
  Nenhuma montagem foi adiada para depois da animação: isso mudaria a altura do
  sheet durante o slide, e a medição não pedia.
- Nenhuma leitura de Firestore ou AsyncStorage foi encontrada no caminho de
  abertura de qualquer sheet; nada a adiar com `InteractionManager`.
- As animações de entrada e saída já eram Reanimated (`SlideInDown`,
  `FadeIn`), rodando na thread de UI. Nada mudou nelas.

## Instrumentação

`src/app/perf/sheetPerf.ts` é inteiramente `__DEV__`: em release cada função
retorna sem gravar nem logar. `useSheetOpenTrace` está no root dos cinco sheets
e imprime `renders` e `settle` do toque até o primeiro layout;
`markSheetPress` marca o `onPress`. O teste de perf usa os mesmos contadores e
falha se as regressões voltarem.

## Pendente: número de campo (device)

As tabelas acima são do renderizador de teste. O tempo real de assentamento no
device ainda não está colado aqui. Como fechar, em uma passagem com aparelho
conectado (3 aberturas por sheet, mediana; ShareSheet e QuickCaptureSheet no
mínimo):

```
npx react-native log-android | grep "\[sheet-perf\]"
```

Cada abertura imprime `[sheet-perf] <Sheet> renders=<n> settle=<n>ms`, do toque
até o primeiro layout do sheet. Alvo do brief: primeiro frame em menos de
100 ms. Enquanto essa linha não for colada, o critério "melhora demonstrada nos
números" está provado por renders e pelo tempo do renderizador de teste, não
por medição de campo.
