# Ideias — Lista de tarefas

Um gerenciador de tarefas que **captura sem limite e compromete com pouco**.

A caixa aceita tudo o que passa pela cabeça. A tela de hoje mostra três. É a
resposta direta ao que a pesquisa de mercado mostrou sobre o nicho: 40% das
pessoas abandonam um app de tarefas em duas semanas, e o que as expulsa não é
falta de recurso — é abrir o app e levar uma lista de quarenta e sete itens
atrasados na cara.

- **Ideia** — uma linha, em linguagem natural: `ligar pro contador sexta 9h !alta #financeiro`.
- **Organize** — o app separa três tarefas por dia, por prazo, peso e tempo parado.
- **Task** — fechar tem peso. Pontos vêm do tamanho do que foi feito, nunca da quantidade.

Marca, pesquisa, telas, especificação de movimento e desenho das camadas:
[`docs/design/identidade-e-telas.html`](docs/design/identidade-e-telas.html).

## Como rodar

```bash
npm install
npm start
```

Em outro terminal:

```bash
npm run android
```

Para iOS, instale os pods uma vez antes:

```bash
cd ios && bundle install && bundle exec pod install && cd ..
npm run ios
```

## Qualidade

```bash
npm run validate
```

Roda formatação, lint, tipos e testes. O domínio inteiro é testável sem
`AsyncStorage`, sem relógio de verdade e sem React — se um teste precisar de
qualquer um dos três, a regra está na camada errada.

## Arquitetura em uma tela

```text
presentation ────────┐
                     ├──> application ───> domain
infrastructure ──────┘

app ──> presentation + application + infrastructure
```

- `domain` — `Task`, `Trio`, `Progress`, `QuickCapture`, `FocusSession`. Funções
  puras, sem import de framework.
- `application` — casos de uso e portas. Um caso de uso recebe o `Workspace` e
  devolve `{ workspace, events }`. Não salva, não vibra, não anima.
- `infrastructure` — AsyncStorage, relógio, háptico, telemetria e os assinantes
  do barramento.
- `presentation` — MVVM: _view-model_ guarda estado e chama caso de uso, _view_
  desenha e avisa intenção, _screen_ amarra os dois.
- `app` — raiz de composição: tema, navegação, splash e construção dos
  adaptadores concretos. É o único lugar do app que sabe que AsyncStorage existe.

Detalhes: [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).

## Arquitetura de eventos

Concluir uma tarefa dispara cinco reações de assuntos diferentes: salvar,
pontuar, vibrar, comemorar e reportar. Sem barramento, o caso de uso teria de
conhecer as cinco. Com barramento, o caso de uso publica o fato e cada
interessado se inscreve.

```text
view (toque) → view-model → caso de uso → domínio decide
                                        ↓
                                  EventBus.publish
      ┌───────────────┬───────────────┼───────────────┐
 persistência      háptico        telemetria      comemoração
```

Eventos: `task.captured`, `task.completed`, `task.reopened`, `task.deleted`,
`trio.assembled`, `trio.completed`, `level.reached`, `focus.started`,
`focus.finished`, `screen.opened` e `workspace.committed`.

Recurso novo é assinante novo — ver
[`docs/adr/0002-barramento-de-eventos.md`](docs/adr/0002-barramento-de-eventos.md).

## Estado

Fatia 1 do recorte de produto (captura, trio, conclusão, foco, listas,
progresso, tema e idioma), com dados locais. Conta e sincronia em nuvem são a
fatia 3 e ainda não existem.
