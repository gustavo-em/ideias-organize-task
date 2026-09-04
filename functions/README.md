# Camada B — push real (passo manual do dono)

Esta pasta é a metade servidor das notificações de projeto compartilhado. Ela
**não é necessária para o app funcionar**: enquanto não estiver publicada, a
Camada A (detecção na própria sincronização do app) já mostra os mesmos dois
fatos — alguém concluiu uma tarefa, alguém entrou no projeto.

O deploy só pode ser feito por quem é dono do projeto Firebase, e exige plano
Blaze. Nada no app depende disso.

## O que a função faz

`onSharedProjectWritten` observa `sharedLists/{token}` com `onDocumentWritten`,
compara o documento antes e depois e envia push para os **outros** membros:

- tarefa que passou a ter `completedAtMs` e `completedBy` → “Fulano concluiu
  ‘X’”, com o nome do projeto no título;
- membro que passou a ter `joined: true` → “@fulano entrou em Projeto Y”.

Quem fez a mudança nunca recebe a própria notificação. A identidade sai de
`name`/`handle` do membro; e-mail nunca é usado.

O envio é **data-only** (`data`, nunca `notification`) e leva a mesma chave de
evento que o app usa na Camada A (`c:{token}:{taskId}:{completedAtMs}` e
`j:{token}:{personId}`). O aparelho registra a chave no ledger antes de exibir,
então push e sincronização nunca mostram o mesmo fato duas vezes — qualquer um
dos dois que chegue primeiro é o que aparece.

Os tokens são lidos de `users/{uid}/fcmTokens` (um documento por aparelho, id =
token), gravados pelo app depois que a pessoa autoriza notificações.

## Deploy (manual)

```bash
# 1. Plano Blaze habilitado no console do Firebase (Cloud Functions exige).
# 2. Uma vez, na raiz do repositório:
npm install -g firebase-tools
firebase login
firebase use ideiasorganizetask

# 3. Dependências da função e deploy:
npm --prefix functions install
firebase deploy --only functions
```

## Também manual: regras do Firestore

`docs/firebase/firestore.rules` ganhou o bloco `users/{uid}/fcmTokens`
(somente o próprio uid lê e escreve). Republique as regras no console ou com
`firebase deploy --only firestore:rules`. Sem isso, o registro do token falha
em silêncio e o app segue funcionando pela Camada A.

## Limites conhecidos

- A função envia em pt-BR: o idioma de cada aparelho ainda não viaja com o
  token. A Camada A, que roda no aparelho, respeita o idioma do app.
- Tokens inválidos não são removidos automaticamente; um aparelho que
  desinstalou o app deixa um documento parado até ser sobrescrito.
