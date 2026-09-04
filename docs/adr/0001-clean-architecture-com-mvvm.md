# 0001 — Clean Architecture por feature, com MVVM na apresentação

**Estado:** aceita · **Data:** 2026-08-28 · **Revisada:** 2026-09-04

## Contexto

O app precisa sobreviver a trocas previsíveis: armazenamento local vira nuvem,
telemetria de console vira cliente de verdade, uma tela é redesenhada inteira.
Nenhuma dessas trocas deveria tocar na regra de que o dia tem três vagas ou de
que fechar uma tarefa vale o peso dela.

React Native empurra na direção contrária. O caminho de menor esforço é um
componente que chama `AsyncStorage`, formata data, decide a regra e desenha —
tudo no mesmo arquivo. Funciona até a segunda tela precisar da mesma regra, e a
partir daí a regra existe em dois lugares que discordam.

Há também um custo de teste. Um componente React que toca em storage só é
testável com `@testing-library/react-native`, mocks de módulo nativo e ciclo de
renderização. Uma função pura é testável com `expect`.

## Decisão

Camadas por feature, com dependência apontando para dentro, e MVVM apenas
dentro da apresentação. MVVM organiza a tela; Clean Architecture controla quem
pode importar quem. As duas coisas não competem — respondem perguntas
diferentes.

```text
presentation ────────┐
                     ├──> application ───> domain
infrastructure ──────┘
```

O estado inteiro da feature vive em um valor imutável, o `Workspace`, e cada
caso de uso é uma função pura `(workspace, entrada, agora) => { workspace, events }`.

### O que MVVM significa aqui

| Peça           | Responsabilidade                                                              | Nunca faz                                      |
| -------------- | ----------------------------------------------------------------------------- | ---------------------------------------------- |
| **View**       | Desenha as props que recebe e emite intenção (`onToggle`, `onSubmit`)         | Chamar caso de uso, storage, háptico ou SDK    |
| **View-model** | Guarda o estado da tela, roda efeito, chama o caso de uso, publica os eventos | Desenhar, importar componente, conhecer estilo |
| **Screen**     | Amarra os dois e nada mais                                                    | Ter regra própria                              |

O view-model é um hook (`useTasksViewModel`, `useDeleteAccountViewModel`), não
uma classe. Em React Native o hook é a única unidade que participa do ciclo de
vida do componente; uma classe de view-model exigiria um adaptador para virar
estado de render, e o adaptador seria o hook de qualquer jeito.

A regra que mantém a separação honesta: **o view-model não importa nada de
`react-native` além de tipos.** Se um view-model precisa de `Dimensions`,
`Keyboard` ou `Platform`, isso é uma porta com adaptador em `infrastructure`,
ou é uma decisão de desenho que pertence à view.

### O que **não** justifica um view-model

Um view-model existe para estado que sobrevive a um render e para intenção que
chega a um caso de uso. Fora disso, é indireção sem retorno:

- Estado puramente visual — `isPressed`, `isExpanded`, altura medida — fica na
  própria view, em `useState` ou em _shared value_.
- Formatação — "há 3 dias", "2 grupos · 6 tarefas" — fica em
  `presentation/models`, funções puras testáveis sem React.
- Uma tela que só lê e desenha, sem estado nem ação, não ganha view-model.

## Alternativas consideradas

- **Componente gordo (o padrão de RN).** Mais rápido na primeira tela e mais
  caro em todas as seguintes: a regra do trio acabaria colada em `TodayScreen`,
  e a segunda tela que precisasse dela copiaria em vez de importar.
- **Redux / Zustand / MobX como espinha dorsal.** Resolvem estado global, que
  não é o problema aqui — o problema é onde a regra mora. Um _store_ global
  ainda deixaria `toggleTask` decidindo o que é um trio. Além disso, `Workspace`
  já é um valor imutável com transições puras: é o núcleo do Redux, sem a
  biblioteca, sem o vocabulário e sem o custo de aprendizado.
- **MVI / Elm (uma união de intenções por tela).** Disciplina maior que MVVM,
  e o preço aparece em cada campo de texto: um `IntentTypedTitle` para cada
  tecla é cerimônia sem ganho no tamanho deste app.
- **MVP.** O _presenter_ empurra estado para uma view passiva, o que assume uma
  view imperativa. A view do React já é uma função do estado; MVVM descreve o
  que o React faz, MVP descreve o que ele não faz.

## Consequências

**A favor**

- O domínio é testável sem `AsyncStorage`, sem relógio e sem React. As 491
  asserções do projeto rodam em cerca de 21 segundos, e as de domínio em
  milissegundos.
- Trocar um adaptador é mudar imports em `src/app/App.tsx`. Foi literalmente
  isso quando o `consoleUsageReporter` virou `firebaseUsageReporter`: uma linha,
  zero casos de uso tocados.
- Uma tela redesenhada não arrasta regra junto. A revisão visual das telas de
  tarefas não tocou em nenhum arquivo de `domain` nem de `application`.
- Revisão de código fica objetiva: um import de `firebase` dentro de `domain` é
  errado sem depender de gosto.

**Contra — e aceito**

- **Uma tela nova custa mais arquivos.** Porta, adaptador, caso de uso,
  view-model e view, quando uma chamada direta resolveria. É o preço, e ele é
  pago por antecipação: a segunda tela que precisa da mesma regra não paga nada.
- **Ler um fluxo inteiro exige abrir quatro arquivos.** Saltar da view até o
  domínio é navegação, não leitura linear.
- **A fronteira só existe porque é respeitada.** Não há ferramenta neste
  projeto proibindo `presentation` de importar `infrastructure`; hoje isso é
  disciplina e revisão. Um `eslint-plugin-boundaries` resolveria e ainda não
  foi adicionado — é dívida conhecida.
- **Overhead visível em features pequenas.** `AppPreferences` (tema e idioma)
  atravessa as mesmas camadas que a captura de tarefas, para umas poucas linhas
  de regra. Consistência ganhou de economia local, de propósito: uma exceção
  aberta é uma exceção que se repete.

## Relacionados

- [0002](0002-barramento-de-eventos.md) — como o efeito colateral sai do caso de
  uso sem voltar para dentro da tela.
