# Aluza — pendências pré-publicação

## Lote de release da marca — bloqueiam a publicação

Os três itens abaixo saem juntos, no mesmo lote, antes de publicar o Aluza.
Nenhum deles pode ir para a loja como está:

1. **applicationId** `com.ideiasorganizetask` → `app.aluza`, depois do
   `google-services.json` novo.
2. **Link de convite** `SHARE_LINK_HOST = 'ideias.app/p/'` → domínio Aluza.
   É a marca antiga lida por quem recebe o convite.
3. **Frames do onboarding** recapturados. Enquanto não forem, a apresentação
   mostra a marca em vez das capturas antigas
   (`ONBOARDING_FRAMES_STALE = true`).

## applicationId

Hoje: `com.ideiasorganizetask` (em `android/app/build.gradle`, `applicationId`
e `namespace`).

O id **não** foi trocado para `app.aluza` porque o
`android/app/google-services.json` do repositório ainda é o do app antigo
(`project_id: ideiasorganizetask`, `package_name: com.ideiasorganizetask`).
Trocar o id sem o json correspondente quebra o build do Firebase.

Passos manuais do dono, no console do Firebase, antes de publicar com o id
novo:

1. Firebase Console → projeto → **Adicionar app Android** com o pacote
   `app.aluza`.
2. Baixar o `google-services.json` novo e substituir
   `android/app/google-services.json`.
3. Reativar em **Authentication** os provedores usados pelo app para o novo
   pacote e cadastrar o **SHA-1/SHA-256** da chave de assinatura.
4. Só então trocar `applicationId` e `namespace` em `android/app/build.gradle`
   para `app.aluza` e refazer o build.

Enquanto isso não acontece, o app instala e roda normalmente com o id atual e
já aparece como **Aluza** no launcher: o nome visível vem de `app_name`, não do
applicationId.

## Frames do onboarding — bloqueio de release

Os PNGs em `assets/onboarding/` foram capturados antes do rebrand: ainda mostram
o nome antigo e a palavra "Projetos" na interface. Eles aparecem na primeira
abertura do app e no replay em Ajustes, então **o app não pode ser publicado com
eles**.

Enquanto isso, `ONBOARDING_FRAMES_STALE` em
`src/app/components/onboarding/onboardingSteps.ts` está em `true`: a
apresentação mostra o símbolo Aluza no palco, com o mesmo tamanho, em vez de
ensinar um nome que a interface não usa mais. Depois da recaptura, mude a flag
para `false` no mesmo commit dos PNGs novos.

Passo manual do dono, com um device ou emulador conectado (`adb`, `ffmpeg`,
`python3`), rodando o build já rebrandado:

1. preparar o aparelho como descreve `assets/onboarding/README.md` (tema claro,
   pt-BR, sessão iniciada, tarefas e espaços de exemplo);
2. `scripts/capture-onboarding-frames.sh capture`;
3. `scripts/capture-onboarding-frames.sh shared`;
4. copiar as coordenadas novas de `capture-taps.json` e `shared-taps.json` para
   `src/app/components/onboarding/onboardingSteps.ts` e conferir o `aspect` de
   cada demo.

As legendas dos passos já dizem "Espaços": só os PNGs estão pendentes.

## Link de convite — bloqueio de release

`SHARE_LINK_HOST` em `src/features/tasks/domain/TaskList.ts` ainda é
`ideias.app/p/`, e esse texto aparece no link que a pessoa compartilha. Publicar
o Aluza com link `ideias.app` mostra a marca antiga a quem recebe o convite.

A troca mexe na mecânica de compartilhamento (domínio, registro do host,
compatibilidade dos links já criados), então o código fica para uma tarefa
própria: registrar `aluza.app`, apontar o novo host e decidir se os links
antigos continuam sendo aceitos na leitura. Mesmo assim o item **bloqueia a
publicação** e sai no mesmo lote do `applicationId`: publicar o Aluza com link
`ideias.app` mostra a marca antiga a cada convite enviado.

## iOS

Não há projeto iOS versionado neste repositório. Quando houver, o
`CFBundleDisplayName` passa a ser `Aluza` e o app icon sai de
`assets/brand/aluza-symbol-primary.svg` sobre o creme `#F6F3EC`.
