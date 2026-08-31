# 0002 — Barramento de eventos entre caso de uso e reação

**Estado:** aceita · **Data:** 2026-08-28

## Contexto

Concluir uma tarefa provoca cinco coisas de assuntos diferentes: gravar em
disco, somar pontos, vibrar, comemorar quando o dia fecha e reportar
telemetria. Chamadas diretas fariam `toggleTask` conhecer háptico, confete e
analytics — e cada recurso novo engordaria a mesma função.

## Decisão

Casos de uso publicam fatos em um barramento tipado. Reações são assinantes
registrados na casca. O barramento é genérico e mora em `shared`; a união de
eventos do produto mora no domínio da feature que os emite.

Todo caso de uso termina com `workspace.committed`, carregando o resultado. A
persistência assina esse evento com debounce de 400 ms e grava só as partes cuja
referência mudou.

## Alternativas consideradas

- **Chamada direta a partir do caso de uso.** Mais simples de ler numa linha, e
  insustentável na quinta reação.
- **Redux ou similar.** Traria o mesmo desacoplamento com uma biblioteca, um
  vocabulário e um custo de aprendizado que o tamanho do app não justifica.

## Consequências

- Recurso novo é assinante novo. Notificação noturna, widget e badge entram sem
  tocar em `toggleTask`.
- Um assinante que lança exceção não derruba os demais: o barramento isola cada
  chamada e reporta por `onListenerError`.
- Fica mais difícil ler, num só lugar, tudo que acontece depois de um toque. O
  índice de eventos no README é a compensação.
