# Convite por link — `/e/<token>`

O que o link tem que fazer, em ordem de importância: abrir o app direto quando
ele está instalado, e mostrar o que é o convite quando não está. Um link que
abre o navegador numa página em branco não é um convite, é um beco.

## O que já está no repositório

| Peça                     | Onde                                            | Estado                                         |
| ------------------------ | ----------------------------------------------- | ---------------------------------------------- |
| Página e JSON do convite | `functions/invite.js`                           | pronta, falta o deploy                         |
| Rewrite `/e/**` → função | `firebase.json`                                 | pronto                                         |
| Associação iOS           | `public/.well-known/apple-app-site-association` | pronta                                         |
| Associação Android       | `public/.well-known/assetlinks.json`            | pronta (release + debug)                       |
| Link gerado pelo app     | `src/features/tasks/domain/TaskList.ts`         | `https://ideiasorganizetask.web.app/e/<token>` |
| Abrir o app pelo link    | `src/app/session/useIncomingInvite.ts`          | pronto                                         |
| Filtro de intent Android | `android/app/src/main/AndroidManifest.xml`      | pronto                                         |
| Capability iOS           | `ios/…/IdeiasOrganizeTask.entitlements`         | pronta                                         |

## Publicar

```bash
firebase deploy --only hosting,functions,firestore:rules
```

As funções HTTP exigem o plano Blaze. O `firebase deploy` avisa e dá o link
para habilitar.

Depois, conferir que a associação está no ar com o content-type certo — o iOS
recusa em silêncio qualquer coisa que não seja `application/json`:

```bash
curl -sI https://ideiasorganizetask.web.app/.well-known/apple-app-site-association | grep -i content-type
```

## O que falta

### Play App Signing

`assetlinks.json` traz as impressões digitais do `aluza-release.keystore` e do
`debug.keystore`. Se o app estiver na Play Store com **Play App Signing**, o
Google reassina o APK e é o certificado dele que os aparelhos verificam — o
keystore local passa a ser só a chave de upload.

Play Console → Configuração → Integridade do app → Assinatura de apps →
_Certificado da chave de assinatura do app_ → SHA-256. Se esse valor for
diferente do primeiro da lista, acrescente-o: o campo aceita vários, e os que
já estão lá continuam servindo para os builds locais.

### Trocar para `aluza.app`

Quando o domínio estiver registrado e adicionado em Hosting → Domínio
personalizado, mudar em três lugares:

- `SHARE_LINK_ORIGIN` em `src/features/tasks/domain/TaskList.ts`
- `applinks:` no `.entitlements`
- `android:host` no `AndroidManifest.xml`

Os links já enviados continuam funcionando: o caminho `/e/<token>` não muda, e
`parseInviteToken` lê o token do último segmento seja qual for o domínio.
