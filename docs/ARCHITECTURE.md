# Arquitetura

## Objetivo

Clean Architecture orientada a feature, com MVVM dentro da apresentação e um
barramento de eventos no meio. A meta é manter as regras do produto —
o que é um trio, quanto vale fechar uma tarefa, o que uma linha de texto
significa — livres de React Native, AsyncStorage e de qualquer SDK.

A primeira fatia é a feature `tasks`: capturar, montar o dia, concluir, focar e
medir.

## Regra de dependência

```text
presentation ────────┐
                     ├──> application ───> domain
infrastructure ──────┘

app ──> presentation + application + infrastructure
shared <── qualquer camada (só primitivas genéricas)
```

- `domain` não importa framework, plataforma nem infraestrutura.
- `application` depende só de `domain` e declara as portas que os casos de uso
  precisam.
- `infrastructure` implementa essas portas com bibliotecas e APIs de plataforma.
- `presentation` usa MVVM: o _view-model_ chama o caso de uso e expõe estado
  pronto para a tela; a _view_ desenha esse estado e avisa a intenção. Nenhum
  dos dois chama storage, háptico ou telemetria diretamente.
- `app` é a raiz de composição. Cria os adaptadores concretos e injeta.
- `shared` guarda primitiva genérica de verdade. O barramento mora lá porque é
  mecanismo; a união de eventos do produto mora no domínio da feature.

## Mapa

```text
src/
  app/                              Casca: tema, navegação, splash, composição
    application/ports/              PreferencesStore
    domain/                         AppPreferences
    infrastructure/                 AsyncStorage, idioma do aparelho
    components/                     AppMark, AppSplash, OnboardingScreen
    view-models/                    useAppViewModel
  features/
    tasks/
      domain/                       Task, TaskList, Trio, Progress, QuickCapture,
                                    FocusSession, Workspace, TaskEvent
      application/
        ports/                      TaskStore, ListStore, ProgressStore,
                                    TrioStore, Clock, Haptics, UsageReporter
        useCases/                   captureTask, toggleTask, planDay, deleteTask
      infrastructure/
        storage/                    Adaptadores AsyncStorage
        clock/ haptics/ usage/      Relógio, vibração, telemetria
        events/                     Assinantes: persistência, retorno, telemetria
      presentation/
        screens/                    Composição fina de tela
        views/                      UI declarativa, sem SDK
        view-models/                Estado, efeitos e ações
        models/                     Formatação para a tela
        animation/                  Vocabulário de movimento
        localization/               Textos pt-BR e en-US
  shared/
    events/                         EventBus genérico
    identity/                       createId
```

Pasta nova só quando aparece o primeiro tipo real daquela categoria. Sem pasta
especulativa e sem arquivo de barril.

## Domínio

Conceitos que continuam válidos se a interface inteira mudar:

- **Task** — título, lista, prioridade, prazo, estimativa, conclusão.
  O **peso** vem da prioridade e é a única moeda do app.
- **Trio** — as três vagas do dia, com a regra de urgência que as preenche.
- **Progress** — pontos, nível, sequência e o histórico por dia.
- **QuickCapture** — o leitor de uma linha de texto.
- **FocusSession** — a máquina do cronômetro.
- **Workspace** — o estado inteiro da feature em um valor imutável.

## Aplicação

Um caso de uso é uma função pura:

```ts
captureTask(workspace, 'ligar pro contador sexta 9h !alta', deps)
  => { workspace, events }
```

Ele não salva, não vibra, não anima e não fala com SDK. Quem faz isso são os
assinantes registrados na casca — por isso o teste de um caso de uso não precisa
de `AsyncStorage`, de relógio nem de React.

## Eventos

Todo caso de uso termina publicando `workspace.committed` com o resultado. A
persistência é assinante desse evento, com debounce de 400 ms, e escreve só as
partes que mudaram de referência. Isso é o que torna salvar uma reação e não uma
obrigação que cada caso de uso precisa lembrar.

Os demais eventos nomeiam fatos: `task.completed` carrega o peso, `trio.completed`
carrega a sequência, `level.reached` carrega o nível. Háptico, comemoração e
telemetria se inscrevem no que interessa a eles.

Um assinante que falha nunca derruba os outros: o barramento isola cada chamada
e reporta o erro por `onListenerError`.

## Apresentação

- **View** desenha props e emite ação.
- **View-model** guarda estado, roda efeito, chama caso de uso e publica evento.
- **Screen** amarra os dois.

O movimento é declarado uma vez em `src/app/animation/motion.ts` e reusado.
Toda curva traz `ReduceMotion.System`, então um aparelho configurado para menos
movimento é atendido sem que nenhuma tela precise verificar isso.

Valor que muda a cada quadro — o anel do cronômetro, a escala de um toque, o
desenho do tique — vive em _shared value_ e nunca passa pela árvore React.

## Onde a plataforma entra

Só em `infrastructure` e na raiz de composição:

- `@react-native-async-storage/async-storage` nos quatro _stores_;
- `Vibration` do React Native no adaptador de háptico;
- `NativeModules` na leitura do idioma do aparelho;
- `react-native-reanimated` e `react-native-svg` na apresentação.

Trocar armazenamento local por servidor é implementar as mesmas quatro portas e
mudar os imports de `src/app/App.tsx`.
