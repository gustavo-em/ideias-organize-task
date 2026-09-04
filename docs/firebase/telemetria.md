# Telemetria — Analytics e Crashlytics

Duas perguntas diferentes, dois serviços. O Analytics responde o que as pessoas
usam; o Crashlytics responde o que quebrou no caminho. Nenhum dos dois carrega o
que alguém escreveu: título de tarefa, nome de espaço e texto digitado ficam no
aparelho. O que sai daqui é forma e contagem.

## Falta um passo no console

O `GoogleService-Info.plist` e o `google-services.json` deste projeto vieram de
antes do Google Analytics existir na conta: nenhum dos dois aponta para uma
propriedade do GA4. Enquanto isso não mudar, os eventos não aparecem em
relatório nenhum.

**O que isso não quer dizer:** o app continua coletando e transmitindo. O
`IS_ANALYTICS_ENABLED = false` que está no plist do iOS é chave legada — o SDK
não lê essa chave (nem `FirebaseCore` nem `GoogleAppMeasurement` a mencionam).
Quem decide é `analytics_auto_collection_enabled` no `firebase.json`, que a
fase de build do react-native-firebase transforma em
`FIREBASE_ANALYTICS_COLLECTION_ENABLED = YES` dentro do `Info.plist` do binário
— conferido no build de release. Ou seja: para as respostas de privacidade da
App Store Connect e para a política de privacidade, **este build coleta**. Se a
intenção for não coletar nesta versão, mude aquela chave para `false`; não
confie no plist.

1. Console do Firebase → Configurações do projeto → Integrações → Google
   Analytics → ativar e vincular a uma propriedade do GA4.
2. Baixar de novo os dois arquivos e substituir
   `ios/IdeiasOrganizeTask/GoogleService-Info.plist` e
   `android/app/google-services.json`.
3. No iOS, `pod install` de novo; no Android, nada além de rebuildar.

Para conferir os eventos chegando ao vivo, no console: Analytics → DebugView,
com o aparelho em modo debug (`adb shell setprop debug.firebase.analytics.app
com.ideiasorganizetask` no Android, argumento de execução `-FIRDebugEnabled` no
Xcode).

## Onde isso mora no código

O app depende da porta `UsageReporter`, nunca do SDK. Quem traduz fato em
telemetria é `createUsageSubscriber`, que escuta o barramento de eventos; quem
manda para o Firebase é `firebaseUsageReporter`. Trocar de serviço é trocar o
adaptador na raiz de composição (`src/app/App.tsx`) e mais nada.

O Crashlytics segue o mesmo desenho: porta `CrashReporter`, adaptador
`firebaseCrashReporter`, e `createBreadcrumbSubscriber` escrevendo a trilha —
só o **nome** de cada evento, nunca o conteúdo.

## Eventos

| Evento                | O que responde                                                | Parâmetros                                                                                                                                                                              |
| --------------------- | ------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `task_captured`       | Se as pessoas criam tarefas ou lembretes, de onde e com o quê | `origin` (`today`/`list`/`group`), `kind` (`task`/`reminder`), `recurrence`, `priority`, `has_due_date`, `has_list`, `has_group`, `remind_days_before`, `subtask_count`, `took_seconds` |
| `task_completed`      | Se o que entra também sai                                     | `weight`, `in_trio`                                                                                                                                                                     |
| `group_created`       | Se os grupos dentro de um espaço são usados                   | `icon`, `has_event_date`                                                                                                                                                                |
| `trio_completed`      | Se o dia fecha, e há quantos dias seguidos                    | `streak_days`                                                                                                                                                                           |
| `focus_started`       | Se o foco é aberto                                            | `planned_minutes`                                                                                                                                                                       |
| `focus_finished`      | Se o foco chega ao fim ou é abandonado                        | `minutes`, `reached_end`                                                                                                                                                                |
| `list_shared`         | Se alguém convida                                             | —                                                                                                                                                                                       |
| `list_member_joined`  | Se o convite é aceito, e por quantos                          | `member_count`                                                                                                                                                                          |
| `onboarding_finished` | Se a apresentação termina no convite ou no "depois"           | `outcome` (`invite`/`later`)                                                                                                                                                            |
| `screen_view`         | Qual aba é aberta                                             | `screen_name`                                                                                                                                                                           |

Sim e não viram `1` e `0` de propósito: assim um relatório tira média e a média
é a fatia. "Quantos por cento das capturas têm data" é `has_due_date`.

`took_seconds` é a única medida que existe por uma tese: a captura precisa caber
em segundos, e um número que ninguém mede é um número que ninguém defende.
