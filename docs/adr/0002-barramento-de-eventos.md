# 0002 — Barramento de eventos entre caso de uso e reação

**Estado:** aceita · **Data:** 2026-08-28 · **Revisada:** 2026-09-04

## Contexto

Concluir uma tarefa provoca coisas de assuntos diferentes: gravar em disco,
somar pontos, vibrar, comemorar quando o dia fecha, reportar telemetria,
alimentar a trilha de migalhas do relatório de crash e reabrir o convite de
avaliação da loja. Chamadas diretas fariam `toggleTask` conhecer háptico,
confete, analytics, Crashlytics e `SKStoreReviewController` — e cada recurso
novo engordaria a mesma função.

O problema não é o número de chamadas. É a direção da dependência: `toggleTask`
pertence a `application` e essas sete reações pertencem a `infrastructure`. Uma
chamada direta inverteria a regra de dependência do [ADR 0001](0001-clean-architecture-com-mvvm.md)
em cada recurso novo.

## Decisão

Casos de uso publicam fatos em um barramento tipado. Reações são assinantes
registrados na casca. O barramento é genérico e mora em `shared/events`; a união
de eventos do produto mora no domínio da feature que os emite
(`features/tasks/domain/TaskEvent.ts`).

```text
view (toque) → view-model → caso de uso → o domínio decide
                                        ↓
                                  EventBus.publish
  ┌──────────────┬──────────────┬───────┴──────┬──────────────┬──────────────┐
persistência   háptico      telemetria    comemoração    migalhas de crash  convite
```

São 20 fatos, em cinco famílias: `task.*`, `trio.*`, `focus.*`, `group.*`,
`list.*`, mais `level.reached`, `screen.opened` e `workspace.committed`.

Todo caso de uso termina com `workspace.committed`, carregando o resultado. A
persistência assina esse evento com debounce de 400 ms e grava só as partes cuja
referência mudou.

### Regras que o barramento impõe de propósito

- **Evento é fato passado, nunca ordem.** `task.completed`, não
  `saveAndVibrate`. Quem publica não sabe quem escuta, e é isso que mantém a
  seta de dependência apontando para dentro.
- **Entrega é síncrona e em ordem de registro.** Um evento não vira uma fila
  assíncrona: publicar retorna quando todos os assinantes rodaram. Um bug fica
  no stack trace do toque que o causou.
- **Um assinante que lança não derruba os demais.** O barramento isola cada
  chamada e reporta por `onListenerError`, que está ligado ao Crashlytics. Uma
  chamada de analytics quebrada não pode matar o salvamento.
- **O conjunto de assinantes é copiado antes da entrega.** Um assinante que se
  desinscreve, ou registra outro, não muda o que aquele `publish` já vai
  entregar.

## Alternativas consideradas

- **Chamada direta a partir do caso de uso.** Mais simples de ler numa linha, e
  insustentável na quinta reação — que já chegou. Também inverteria a regra de
  dependência: `application` passaria a importar `infrastructure`.
- **Redux / RTK, ou qualquer store com middleware.** Traria o mesmo
  desacoplamento com uma biblioteca, um vocabulário e um custo de aprendizado
  que o tamanho do app não justifica. `Workspace` já é um valor imutável com
  transições puras — o núcleo do Redux existe aqui sem a dependência.
- **RxJS.** Resolveria com sobra, e o excedente é o problema: operadores,
  agendadores e um modelo de cancelamento inteiro para sete assinantes que só
  precisam de "me avise quando".
- **Injetar as reações como portas no caso de uso.** Foi tentado: `toggleTask`
  recebendo `haptics`, `usageReporter` e `store`. A assinatura crescia a cada
  recurso, e cada teste do caso de uso precisava de mais um dublê para uma
  reação que o teste não estava verificando.
- **`EventEmitter` do React Native.** Mesma forma, sem tipo. O ganho do
  barramento próprio é que `bus.on('task.completed', …)` entrega o evento já
  estreitado pelo TypeScript, e um `type` inexistente não compila.

## Consequências

**A favor**

- Recurso novo é assinante novo. Telemetria do Firebase, migalhas de crash e o
  convite de avaliação entraram sem tocar em `toggleTask`.
- Salvar deixa de ser obrigação que cada caso de uso precisa lembrar: é reação a
  `workspace.committed`. Um caso de uso novo persiste de graça — e não há como
  esquecer.
- Testar um caso de uso é comparar o array de eventos que ele devolve. Não
  precisa de dublê para háptico nem para analytics.
- Um assinante quebrado degrada um recurso, não o app.

**Contra — e aceito**

- **Fica mais difícil ler, num só lugar, tudo que acontece depois de um toque.**
  Um `grep` por `'task.completed'` responde, mas é uma pergunta que a chamada
  direta respondia sem procurar. O índice de eventos no README e neste ADR é a
  compensação.
- **O stack trace de um assinante não mostra a intenção.** Aparece
  `publish → listener`, não "o usuário fechou uma tarefa". Foi exatamente por
  isso que a trilha de migalhas virou assinante do próprio barramento.
- **Erro de assinante é silencioso por construção.** Engolir a exceção protege
  os outros assinantes e esconde a falha; sem `onListenerError` ligado a um
  relatório de crash, um assinante poderia estar morto há semanas sem ninguém
  notar. É o motivo de esse gancho não ser opcional na composição.
- **Nada garante ordem entre assinantes de assuntos diferentes.** A ordem é a de
  registro em `App.tsx`, o que é determinístico mas frágil como contrato. A
  regra em vigor: um assinante nunca pode depender de outro ter rodado antes.
  Quando dois passos precisam de ordem, eles pertencem ao mesmo caso de uso, não
  a dois assinantes.
- **Ciclo é possível.** Um assinante que dispara um caso de uso que publica de
  novo entraria em recursão, e o barramento não detecta isso. Hoje nenhum
  assinante chama caso de uso; é convenção, não impedimento.

## Relacionados

- [0001](0001-clean-architecture-com-mvvm.md) — a regra de dependência que este
  barramento existe para proteger.
- [0005](0005-o-projeto-e-compartilhado-o-placar-nao.md) — um caso em que o fato
  publicado foi escolhido para não permitir a comparação entre pessoas.
