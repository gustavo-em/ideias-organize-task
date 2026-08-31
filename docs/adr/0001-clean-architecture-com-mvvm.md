# 0001 — Clean Architecture por feature, com MVVM na apresentação

**Estado:** aceita · **Data:** 2026-08-28

## Contexto

O app precisa sobreviver a trocas previsíveis: armazenamento local vira nuvem,
telemetria de console vira cliente de verdade, uma tela é redesenhada inteira.
Nenhuma dessas trocas deveria tocar na regra de que o dia tem três vagas ou de
que fechar uma tarefa vale o peso dela.

## Decisão

Camadas por feature, com dependência apontando para dentro, e MVVM apenas
dentro da apresentação. MVVM organiza a tela; Clean Architecture controla quem
pode importar quem. As duas coisas não competem.

O estado inteiro da feature vive em um valor imutável, o `Workspace`, e cada
caso de uso é uma função pura `(workspace, entrada, agora) => { workspace, events }`.

## Consequências

- O domínio é testável sem `AsyncStorage`, sem relógio e sem React. As setenta
  asserções do projeto rodam em menos de um segundo.
- Trocar um adaptador é mudar imports em `src/app/App.tsx`.
- Custa uma indireção: uma tela nova exige porta, adaptador e caso de uso em vez
  de uma chamada direta. É o preço aceito.
