# Notificações de atividade do projeto compartilhado

Dois fatos são avisados aos **outros** membros de um projeto: alguém concluiu
uma tarefa e alguém entrou. Nada do que a própria pessoa faz vira notificação.

## Camada A — detecção na sincronização (funciona sem backend)

O pull que o app já faz (primeiro paint da aba Projetos, arrastar para
atualizar e volta ao foreground) entrega o projeto para
`reportProjectActivity`. A detecção é pura
(`src/features/tasks/domain/ProjectActivity.ts`) e compara o estado remoto com
o ledger local de eventos já anunciados.

- Chaves: `c:{token}:{taskId}:{completedAtMs}` e `j:{token}:{personId}`.
- A chave é gravada **antes** de mostrar: em queda entre as duas coisas
  perde-se um aviso, nunca se repete um.
- O primeiro contato com um projeto grava tudo em silêncio (bootstrap): entrar
  num projeto antigo não despeja o histórico na bandeja.
- Acima de 3 fatos do mesmo projeto no mesmo ciclo, sai um resumo só.

## Camada A+ — checagem em background

`react-native-background-fetch` com `minimumFetchInterval: 15`,
`stopOnTerminate: false`, `startOnBoot: true` e headless task registrada em
`index.js`. Roda exatamente o mesmo caminho da Camada A.

Limites do sistema operacional, aceitos e esperados:

- o Android nunca acorda a tarefa mais de uma vez a cada 15 minutos;
- Doze e economia de bateria adiam a execução por bem mais que isso;
- app parado à força (force stop) não recebe nada até ser aberto de novo;
- alguns fabricantes matam tarefas em background de forma mais agressiva.

Ou seja: aviso em minutos, sem servidor — não é substituto de push.

## Camada B — push real (passo manual do dono)

Cliente pronto: token em `users/{uid}/fcmTokens/{token}` e handlers de
foreground/background. O push é **data-only** e carrega a mesma chave de
evento da Camada A; o aparelho grava a chave no ledger antes de exibir, então
push e sincronização nunca repetem o mesmo fato. Servidor em `functions/` (veja `functions/README.md`):
exige plano Blaze e `firebase deploy --only functions`. As regras de
`fcmTokens` estão em `docs/firebase/firestore.rules` e precisam ser
republicadas. Enquanto nada disso acontece, a Camada A cobre os mesmos avisos.

## Permissão e ajuste

A permissão nunca é pedida na abertura fria: ela aparece como uma linha na aba
Projetos, uma única vez, para quem tem projeto compartilhado, e ao ligar o
interruptor "Notificações do projeto" em Ajustes (ligado por padrão). Recusa
não é perguntada de novo, e nada no app deixa de funcionar por causa dela.
