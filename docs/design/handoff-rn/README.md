# Projetos compartilhados — pacote de implementação

Para quem vai escrever o código (Claude Code) no repositório
`ideias-organize-task`. Este pacote é **visual + escopo**; as decisões de
domínio e arquitetura estão em `projeto-compartilhado.md` e
`ui-projeto-compartilhado.md` na raiz do projeto de design.

## Estado real do repositório (conferido)

A **fase 1 já está em código**. Não reimplemente:

| Peça                             | Arquivo                                                                    |
| -------------------------------- | -------------------------------------------------------------------------- |
| Tipos, `isShared`, `canEdit`, `canShare`, `withMember`, `sanitizeShare` | `src/features/tasks/domain/TaskList.ts` |
| Erros de compartilhamento        | `src/features/tasks/domain/ShareError.ts`                                  |
| Eventos `list.shared` / `list.unshared` / membros | `src/features/tasks/domain/TaskEvent.ts`                   |
| Porta                            | `src/features/tasks/application/ports/ShareGateway.ts`                      |
| Casos de uso (inclui `leaveSharedList`, `acceptInvite`) | `src/features/tasks/application/useCases/shareTaskList.ts` |
| Adaptador + mock                 | `src/features/tasks/infrastructure/sharing/`                                |
| Push depois de mudança local     | `src/features/tasks/infrastructure/events/createSharePushSubscriber.ts`      |
| Ficha e pilha de iniciais        | `presentation/views/MemberChip.tsx`, `MemberStack.tsx`                       |
| Folha de compartilhar            | `presentation/views/ShareSheet.tsx`                                         |
| Entrar por convite               | `presentation/views/JoinInviteSheet.tsx`                                    |
| Linha do projeto, menu, estados  | `presentation/screens/ListsScreen.tsx`                                      |
| Copy nos dois idiomas            | `presentation/localization/taskCopy.ts`                                     |
| Testes                           | `__tests__/shareTaskList.test.ts`, `__tests__/taskListShare.test.ts`         |

**O que falta é a fase 2 — a faixa "Hoje, no combinado".** Nada de
`sharedDay.ts` nem de `SharedDayBand.tsx` existe hoje.

## Imagens

Fonte editável: `Projetos compartilhados - spec visual.dc.html` (todos os
quadros em escala 1:1, 390 pt, com as anotações de token ao lado).

| Imagem                                          | O que mostra                                                     |
| ----------------------------------------------- | ---------------------------------------------------------------- |
| `6a-faixa-em-contexto.png`                      | **A implementar.** A faixa no topo do projeto aberto, com os quatro estados de linha e o botão. |
| `6b-estados-de-linha.png`                       | **A implementar.** Cada estado isolado, com o glifo e a cor de cada um, na ordem que `sharedDay` devolve. |
| `6c-faixa-vazia-fechada-offline.png`            | **A implementar.** Vazio, todos fecharam (sequência do grupo) e sem rede. |
| `6d-linha-do-projeto.png`                       | Referência (em código): pilha de fichas, `+N`, ficha tracejada, menu com _Compartilhar_. |
| `6e-sharesheet-compartilhado.png`               | Referência (em código): folha completa — link, papéis, membros, rodapé. |
| `6f-sharesheet-sem-link-erro-leitor.png`        | Referência (em código): sem link, erro de rede com _Tentar de novo_, e a folha vista por um `viewer`. |

Use `6d`–`6f` para **conferir** o que já está implementado (geometria, ordem
dos elementos, quem aparece e quem não aparece em cada papel). Se a tela
divergir da imagem, a imagem é a intenção — corrija a tela ou registre a
divergência.

## Código React Native pronto — `handoff/rn/`

O caminho mais curto: os arquivos abaixo já estão no estilo do repositório
(`styled-components/native`, tokens de `theme`, glifos existentes) e cada um
diz no topo o seu destino. Copie, rode `npm run validate`, ajuste.

| Arquivo                    | Destino                                                        |
| -------------------------- | -------------------------------------------------------------- |
| `rn/SharedDay.ts`          | `src/features/tasks/domain/SharedDay.ts`                        |
| `rn/sharedDay.ts`          | `src/features/tasks/presentation/models/sharedDay.ts`           |
| `rn/sharedDay.test.ts`     | `__tests__/sharedDay.test.ts`                                   |
| `rn/SharedDayBand.tsx`     | `src/features/tasks/presentation/views/SharedDayBand.tsx`       |
| `rn/diffs.md`              | Mudanças em arquivos que já existem: tema, `MemberChip`, copy, `ShareGateway`, _view-model_, `ListsScreen`. |

Um achado ao escrever isso: **"o que a pessoa levou para hoje" é o trio dela**
(`domain/Trio.ts`), que vive no _workspace_ de cada um e não no projeto. Então
a faixa precisa de um dado novo publicado por membro e por dia
(`SharedMemberDay`) — não dá para derivar das tarefas sincronizadas. É a única
correção de escopo em relação a `projeto-compartilhado.md`.

As seções abaixo são o porquê de cada decisão; o código acima é o como.

## Fase 2 — o que implementar

### 1. `src/app/theme/theme.ts` — dois tokens

A faixa é a primeira superfície com texto secundário e linha sobre Sol:

```ts
/** Texto de apoio sobre um preenchimento accent. Tinta a 78%. */
onAccentSubtle: 'rgba(27, 23, 16, 0.78)',
/** Separador dentro de uma faixa accent. Tinta a 18%. */
onAccentLine: 'rgba(27, 23, 16, 0.18)',
```

No tema escuro os dois valores são os mesmos: `accent` não muda entre modos,
então o que está escrito sobre ele também não muda. Atualize `ThemeColors` e
`__tests__/brand.test.ts` se ele contar tokens.

### 2. `presentation/models/sharedDay.ts` + teste

```ts
export type SharedDayState = 'focusing' | 'done' | 'open' | 'absent';

export interface SharedDayEntry {
  member: ListMember;
  /** O que a pessoa levou para hoje. Null quando `absent`. */
  task: Task | null;
  state: SharedDayState;
}

export function sharedDay(
  members: readonly ListMember[],
  tasks: readonly Task[],
  nowMs: number,
): readonly SharedDayEntry[];
```

Regras que o teste tem que fixar:

1. Ordem: `focusing`, `open`, `done`, `absent` — nessa sequência, e dentro de
   cada grupo na ordem em que os membros vêm de `share.members`.
2. `absent` = membro sem nenhuma tarefa no dia de `nowMs`. `task` é `null`.
3. Membro cujo dado remoto não chegou **não entra no array** — não é `absent`.
   Silêncio de rede nunca é convertido em estado.
4. Membro com mais de uma tarefa no dia: a que estiver em foco; senão a
   primeira aberta; senão a última fechada.
5. Convite pendente (`joined: false`) não aparece na faixa: quem não entrou não
   combinou nada.
6. Função pura — sem `Date.now()`, sem React, sem rede.

### 3. `presentation/views/SharedDayBand.tsx`

Geometria completa em `ui-projeto-compartilhado.md` §4 e nas imagens `6a`/`6b`.
Resumo do que não pode variar:

- Fundo `accent`; padding `spacing.large - 4` / `spacing.large`.
- Sangra até a borda da tela de dentro do `Expanded` do `ListsScreen`:
  `margin: medium -(large) 0 -(large + small)` — `Expanded` tem
  `padding-left: spacing.small`. **Nunca** use largura de tela.
- Eyebrow: `type.caption`, peso 800, `letter-spacing: 1.8`, maiúscula, `onAccent`.
- Ficha `large` (30) **invertida**: fundo `onAccent`, letra `accent`. A ficha
  tonal do `MemberChip` desapareceria no amarelo — passe a inversão como prop
  nova (`inverted`) em vez de duplicar o componente.
- Nome `type.body`/700 em `onAccent`; tarefa `type.label` em `onAccentSubtle`.
- Estado à direita: `FocusGlyph` 20 (`focusing`), `CheckGlyph` 16 (`done`),
  nada (`open`), ficha tracejada + linha em `onAccentSubtle` (`absent`).
- Separador entre linhas: `1.5px solid onAccentLine`, nunca na primeira.
- Botão: fundo `text`, texto `accent`, `radii.medium`, padding 15.
  Abre a mesma folha de escolher tarefa que o `AgoraCard` já usa.
- Entrada das linhas: `FadeInDown.delay(index * STAGGER_MS).duration(280)`;
  a faixa inteira, `FadeIn.duration(180)`. Nada novo em `motion.ts`.

### 4. Copy — `presentation/localization/taskCopy.ts`

Novas chaves em `lists`, nos dois idiomas (o teste de paridade já cobre):

```
dayBandTitle          'Hoje, no combinado'            / 'Today, together'
dayBandEmpty          'Ninguém levou nada para hoje ainda.'
dayBandTakeOne        'Levar uma para hoje'
dayBandAllDone        'Os três fecharam hoje'          (conjuga por contagem)
dayBandStreak(n)      '4 dias seguidos em que todo mundo fechou o que levou.'
dayBandOffline        'Sem conexão agora — mostrando o que já estava no aparelho.'
dayBandAbsent         'Ainda não levou nada'
```

`dayBandAllDone` conjuga como `sharedWith` já faz. Não escreva número em
literal de string.

### 5. `presentation/screens/ListsScreen.tsx`

A faixa entra como **primeiro filho** do `Expanded`, só quando
`isShared(list)`. Antes do banner `AllDoneBanner` e das tarefas. Um projeto não
compartilhado não renderiza nada ali — nem espaço reservado.

### 6. `focusing` é opcional

O estado `focusing` exige publicar `focus.started` / `focus.finished` para o
grupo — a única parte da feature perto de tempo real. Se isso for caro nesta
fatia, **entregue a fase 2 sem `focusing`**: o modelo continua devolvendo o
estado, a faixa só nunca o recebe. Não invente presença ao vivo para acender o
glifo.

## Linha que não se cruza

> **O projeto é compartilhado. O placar não.**

Nenhuma tela da fase 2 mostra peso, pontos, nível ou sequência individual de
outra pessoa — só o que ela levou e se fechou. `ProgressState` não sai do
aparelho. A "sequência do grupo" é derivada (dias em que **todos** fecharam o
que levaram) e, se o dado de alguém não chegou, o dia não conta.

## Ordem de trabalho

| #   | Onde                                        | Entrega verificável                                   |
| --- | ------------------------------------------- | ----------------------------------------------------- |
| 1   | `app/theme/theme.ts`                        | `onAccentSubtle` e `onAccentLine` nos dois modos.      |
| 2   | `presentation/models/sharedDay.ts` + teste  | As seis regras acima, verdes.                          |
| 3   | `presentation/views/MemberChip.tsx`         | Prop `inverted`, sem quebrar os usos atuais.            |
| 4   | `presentation/views/SharedDayBand.tsx`      | Os quatro estados de `6b` e os três casos de `6c`.      |
| 5   | `presentation/localization/taskCopy.ts`     | Chaves novas, paridade pt-BR / en-US.                   |
| 6   | `presentation/screens/ListsScreen.tsx`      | Faixa no topo do projeto compartilhado aberto.           |
| 7   | `docs/adr/`                                 | ADR curta: por que o placar não é do grupo.              |
| 8   | `npm run validate`                          | Formatação, lint, tipos, testes.                         |
