# 0004 — Pontos vêm do peso, nunca da contagem

**Estado:** aceita · **Data:** 2026-08-28

## Contexto

Gamificação funciona: o estudo de caso do Karma, do Todoist, mostra queda de
3,7% em churn e sessão 22% mais longa. E ela falha de um jeito conhecido —
premiar a contagem faz a rota mais barata para o topo ser fatiar tudo em
tarefas de dois minutos, enquanto o projeto importante fica parado.

## Decisão

Pontuar o peso da tarefa (baixa 5, média 12, alta 25) e nada mais. Fechar o
trio inteiro dá um bônus fixo, o único do app. Reabrir devolve os pontos;
apagar uma tarefa concluída também. A sequência conta dias com trio fechado, não
dias com o app aberto.

## Consequências

- Fatiar a lista não acelera nível nenhum.
- Pontos que sobrevivem a um desfazer seriam pontos fabricáveis — por isso o
  desfazer devolve.
- A sequência não é apagada por um desfazer feito depois: o dia foi fechado, e
  uma correção mais tarde não deveria custar duas semanas de manhãs.
