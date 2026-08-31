# Contribuindo

## Antes de mexer no código

1. Leia [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).
2. Confira os [ADRs](docs/adr/README.md).
3. Dependência de plataforma fica em `infrastructure`. Nunca no domínio.
4. Abra um ADR novo quando uma mudança reverter ou estender uma decisão aceita.

## Branches

Um nome curto por resultado:

- `feat/captura-por-voz`
- `fix/trio-vira-a-meia-noite`
- `docs/notas-de-marca`

Não misture atualização de dependência, refatoração e comportamento no mesmo
branch.

## Commits semânticos

```text
tipo(escopo opcional): resumo no imperativo
```

Tipos usados: `feat`, `fix`, `docs`, `test`, `refactor`, `perf`, `build`, `ci`,
`chore`.

```text
feat(capture): ler duração escrita como ~1h30
fix(trio): manter a escolha da manhã depois da meia-noite
perf(focus): mover o anel para a thread de UI
```

## Pull requests

- Explique o problema e a fronteira escolhida.
- Anexe imagem ou vídeo curto para mudança visual.
- `npm run validate` precisa passar.
- Mudança de animação pede teste em aparelho físico: emulador não mostra queda
  de quadro.

## O que o código precisa manter

- Domínio sem import de React, React Native ou SDK.
- Caso de uso é função pura que devolve `{ workspace, events }`.
- Nenhuma view fala com storage.
- Toda animação responde a um evento do domínio. Se nada aconteceu, nada se mexe.
- Toda animação declara `ReduceMotion.System`.
