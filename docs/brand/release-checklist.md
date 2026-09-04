# Aluza — o que falta antes de publicar

Este arquivo descrevia três bloqueios que já não existem: os frames antigos do
onboarding (a apresentação foi redesenhada e não usa mais captura de tela), o
link de convite em `ideias.app/p/` (o host hoje é o do Firebase Hosting) e a
ausência de um projeto iOS (existe, e é o que está sendo publicado primeiro).
Foi reescrito para dizer o que de fato está de pé.

## Versões

São dois números independentes, e é assim de propósito:

- **iOS** — `MARKETING_VERSION` e `CURRENT_PROJECT_VERSION` no projeto Xcode.
  Hoje `1.0 (1)`.
- **Android** — `VERSIONNAME` e `VERSIONCODE` no `.env`, que o
  `android/app/build.gradle` lê no build. É o número que se muda para gerar um
  AAB novo.

O `APP_VERSION` em `src/app/config/appMetadata.ts` é o que a tela de Ajustes
mostra, e é uma terceira cópia à mão. **Ao subir a versão de qualquer
plataforma, subir essa também** — hoje ela diz `1.0`, igual ao iOS.

Ler o número do próprio binário resolveria a cópia de vez, mas exige um módulo
nativo em cada plataforma; enquanto isso não existe, o acordo é lembrar aqui.

## applicationId do Android — decidir antes do primeiro envio ao Play

Hoje: `com.ideiasorganizetask`, em `android/app/build.gradle` (`applicationId`
e `namespace`). O iOS já vai como `com.aluza.app`.

**O applicationId não pode mudar depois do primeiro envio ao Play.** Se o app
ainda não foi publicado lá, esta é a última janela para trocá-lo por algo com o
nome da marca. Se já foi, ele está fixo para sempre e não há o que fazer.

Trocar exige, na ordem:

1. Firebase Console → **Adicionar app Android** com o pacote novo.
2. Baixar o `google-services.json` e substituir `android/app/google-services.json`.
3. Em **Authentication**, reativar os provedores para o pacote novo e cadastrar
   o SHA-1/SHA-256 da chave de assinatura.
4. Só então trocar `applicationId` e `namespace` e refazer o build.

Trocar o id sem o `google-services.json` correspondente quebra o build.

O nome visível no launcher vem de `app_name`, não do applicationId: o app já
aparece como **Aluza** com o id atual.

## Marca

Uma fonte só: `assets/brand/aluza-mark-source.svg`. `npm run brand:assets`
reconstrói o ícone das duas lojas, as launch screens, os recortes das telas de
marca e a geometria que o splash anima. Nada de arte é editado à mão.

## Loja

- **Ícone 1024** — gerado sem canal alpha, que é o que o App Store Connect
  exige.
- **Privacidade** — o app coleta Analytics e Crashlytics vinculados à conta.
  A política em `public/privacidade.html` diz isso, e as respostas no App Store
  Connect precisam dizer o mesmo.
- **GA4** — enquanto a propriedade não for vinculada no console do Firebase, o
  app coleta e transmite, mas nada aparece em relatório. Ver
  `docs/firebase/telemetria.md`.
