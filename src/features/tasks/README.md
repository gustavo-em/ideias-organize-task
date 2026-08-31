# Feature: tasks

Capturar, montar o dia, concluir, focar e medir.

```text
domain/          Regras e tipos estáveis. Sem framework.
application/     Casos de uso e portas. Função pura que devolve { workspace, events }.
infrastructure/  AsyncStorage, relógio, háptico, telemetria e assinantes do barramento.
presentation/    MVVM: screens, views, view-models, animação e textos.
```

O estado inteiro é um valor imutável, o `Workspace`. Todo caso de uso o recebe e
devolve o próximo, junto dos fatos que aconteceram no caminho. Quem reage a
esses fatos são os assinantes — não o caso de uso.
