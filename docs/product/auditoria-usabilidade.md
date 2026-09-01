# Auditoria de usabilidade — Ideias

Run: `2026-09-01T16-02-40.957Z-dss88m`. Device Android, tela 1080x2340, densidade
assumida ~2.75x (1080 px ≈ 393 dp). Todas as conversões px→dp deste documento
usam esse fator.

## Método

Percurso em dois passes: usuário novo (login, primeira leitura da tela, captura)
e usuário diário (concluir, projetos compartilhados, combinado, perfil, foco).
Cada fricção registra onde, o que era esperado, o que aconteceu, a heurística
clássica violada, a gravidade e a menor correção possível.

Gravidades usadas, sem nível intermediário:

- **IMPEDE** — bloqueia o trabalho do usuário.
- **ATRAPALHA** — custa passos extras ou provoca erro reversível.
- **PODERIA SER MELHOR** — polimento, sem custo de tarefa.

Regra de evidência: nenhum achado entra nas tabelas sem screenshot ou nó de
árvore coletado neste run. O que não foi observado está em "Cobertura pendente de
evidência", sem virar achado.

## Evidência usada

| Checkpoint                            | Conteúdo real capturado                                                                                                                                                  |
| ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `login-abertura` (ciclo 3)            | Tela Entrar: e-mail, senha, Entrar, Esqueci minha senha, Criar conta, Google, Continuar só com nome                                                                      |
| `login-erro-vazio`                    | Mesma tela com "Digite seu e-mail." e "Digite sua senha." sob cada campo                                                                                                 |
| `today-lista` / `final` (ciclo 0)     | Tarefas com a seção "SEM PRAZO 4" fechada e nenhuma tarefa na tela                                                                                                       |
| `today-secao-expandida`               | Mesma tela com a seção aberta e as 4 tarefas visíveis                                                                                                                    |
| `today-captura`                       | Folha de captura com campo, fichas sem data / prioridade média / sem projeto, ajuda de sintaxe, Salvar desabilitado                                                      |
| `lists-visao-2`                       | Projetos: "3 projetos · 4 abertas", Entrar com convite, Caixa 1/5, Combinado do dia 1/1, Combinado dois 0/0                                                              |
| `list-actions-2`                      | Mesma tela com "Compartilhar" e "Sair do projeto" abertos abaixo do card                                                                                                 |
| `share-sheet-2` / `share-link-criado` | Folha Compartilhar com link `ideias.app/p/w32zyrfjeg`, membro "Pessoa do projeto · dono" e aviso de recusa do servidor                                                   |
| `settings-visao`                      | Você: "1 dia seguido", últimos sete dias, Nível 1 (44 de 100 pontos), 1 dias fechados, conta "Tester @tester · Conta só neste aparelho", Sair, Tarefas por dia 3/5/Todas |
| `settings-fim`                        | Mesma tela rolada até o fim: Aparência, Idioma, "Ver a apresentação de novo", Versão 0.1.0                                                                               |
| `profile-sheet-2`                     | Folha Perfil com avatar "VO", "Você / @voce", campos Nome de exibição e Nome de usuário, Salvar desabilitado                                                             |
| `focus-idle`                          | Foco: "Escolha uma para começar" e um único cartão contendo apenas a ficha "25 min"                                                                                      |
| `pos-login`                           | Tarefas logo após entrar com nome, já com "Próxima: Tarefa um"                                                                                                           |
| árvore da TodayScreen (ciclo 0)       | `resource-id`, `content-desc`, `class`, `clickable` e `bounds` de todos os nós                                                                                           |

Dois checkpoints estão com nome trocado em relação ao que mostram:
`join-invite-erro` e `tarefa-concluida` exibem a tela Entrar. Por isso, entrada
com convite inválido e conclusão de tarefa continuam sem evidência, e nenhum
achado foi escrito sobre eles.

## Fluxo: primeira impressão (tela Tarefas)

O app abre na aba Tarefas com cabeçalho de data, seletor "Organizar por" com três
chips, um card de estado ("Você está em dia." / "Próxima: Tarefa um" / "Ver
tudo"), o cabeçalho "SEM PRAZO 4" com filete e chevron, e um grande vazio até
"Nova tarefa". Em `final` e `today-lista` nenhuma tarefa aparece; em
`today-secao-expandida`, depois de tocar no cabeçalho, as quatro tarefas surgem.
Ou seja, a seção nasce fechada.

Conformidades: o cabeçalho de seção usa rótulo curto em maiúsculas, contagem e
filete fino atravessando a largura, e a seção não tem fundo, borda ou raio
próprios. As duas regras fixas do app estão respeitadas nesta tela.

## Fluxo: login

A tela Entrar apresenta e-mail, senha, botão primário, "Esqueci minha senha",
"Criar conta" e, sob o separador "OU", Google e "Continuar só com nome".
Submeter vazio produz erro inline por campo, com ícone e texto de instrução
("Digite seu e-mail."), sem culpar o usuário — conformidade com a regra de
linguagem e com prevenção de erro.

## Fluxo: tarefas (criar, concluir)

`today-captura` mostra a folha com campo em foco, três fichas, a explicação
"Toque nas fichas para ajustar. Alta entra antes no dia e vale mais pontos." e a
linha de sintaxe aceita ("amanhã, sexta 9h, urgente, ~30min, #projeto"). O
"Salvar" nasce desabilitado enquanto o campo está vazio — boa prevenção de erro.
A ficha do meio ("prioridade média") aparece com contorno escuro forte enquanto
as outras duas ficam com traço claro, o que sugere seleção onde há apenas o valor
padrão. Conclusão de tarefa não foi capturada.

## Fluxo: projetos compartilhados

`lists-visao-2` mostra "3 projetos · 4 abertas", o atalho "Entrar com convite" e
três cards com progresso. "Combinado do dia" traz um rótulo "VER" solto entre o
título e o contador. `list-actions-2` abre "Compartilhar" e "Sair do projeto"
como dois botões flutuando no espaço entre cards. `share-sheet-2` mostra, na
mesma folha, um link pronto com botão "Copiar" e o aviso "O servidor recusou este
compartilhamento agora. Tente de novo em instantes." com "Tentar de novo".

## Fluxo: faixa do combinado

Existe o projeto "Combinado do dia" com 1/1 em `lists-visao-2`, mas nenhuma faixa
de combinado apareceu na tela Tarefas em nenhum checkpoint deste run
(`today-lista`, `today-secao-expandida`, `pos-login`). O estado da faixa (vazia,
tudo feito, offline) segue sem evidência.

## Fluxo: perfil

`settings-visao` reúne, em uma tela só, o painel de ritmo (streak, gráfico de
sete dias, nível, dias fechados) e "Ajustes" com conta, "Sair" e "Tarefas por
dia". A conta aparece como "Tester / @tester · Conta só neste aparelho".
`profile-sheet-2` é de outra sessão, criada depois de um sign-out, e mostra
"Você / @voce" — não há divergência a registrar entre as duas.

Conformidade: em `settings-visao` o parágrafo de "Tarefas por dia" aparece
cortado, mas isso é só a dobra de rolagem; `settings-fim` mostra a mesma lista
rolada até o fim, com APARÊNCIA, IDIOMA, "Ver a apresentação de novo" e "Versão
0.1.0" inteiros acima da barra de abas. O padding inferior está correto.

## Fluxo: foco

`focus-idle` traz "Escolha uma para começar" e um único cartão que contém apenas
a ficha "25 min": o nome da tarefa não aparece. Só uma tarefa é ofertada,
enquanto Projetos contava 4 abertas no mesmo run, e a tela não diz que recorte
está listando.

## Achados — IMPEDE

| ID  | Tela/Fluxo           | Esperado                             | Aconteceu                                                                           | Heurística                        | Menor correção                                                                                 | Evidência                                                                | Desfecho              |
| --- | -------------------- | ------------------------------------ | ----------------------------------------------------------------------------------- | --------------------------------- | ---------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ | --------------------- |
| A01 | Tarefas / uso diário | Ver as tarefas do dia ao abrir o app | A seção "SEM PRAZO 4" abre fechada; sem tocar nela a tela não mostra nenhuma tarefa | Visibilidade do estado do sistema | Em TodayScreen, iniciar as seções do dia expandidas, mantendo o toque no cabeçalho para fechar | `final`, `today-lista` (fechada) vs. `today-secao-expandida` (4 tarefas) | Corrigido neste ciclo |

## Achados — ATRAPALHA

| ID  | Tela/Fluxo               | Esperado                                                | Aconteceu                                                                                                                                              | Heurística                                    | Menor correção                                                                                                | Evidência                                                 | Desfecho                      |
| --- | ------------------------ | ------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------- | ------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------- | ----------------------------- |
| A02 | Tarefas / acessibilidade | Abas anunciadas como controle acionável                 | As quatro abas vêm com `class="android.view.View"`, sem papel de botão ou aba; só carregam `content-desc`. A confirmar com TalkBack                    | Consistência e padrões (Android)              | Na tab bar, expor `accessibilityRole="tab"` (ou `button`) e `accessibilityState.selected` no item ativo       | árvore: `tab-today`, `tab-lists`, `tab-focus`, `tab-you`  | Já resolvido por menu-premium |
| A03 | Tarefas / alvos de toque | Alvo mínimo de 48 dp                                    | Abas da barra inferior têm 107 px ≈ 39 dp de altura                                                                                                    | Prevenção de erro                             | Elevar a altura útil de cada item da tab bar para 48 dp mantendo o rótulo                                     | árvore: `tab-today` bounds `[0,2233][270,2340]`           | Já resolvido por menu-premium |
| A04 | Tarefas / alvos de toque | Alvo mínimo de 48 dp nos chips                          | Chips "Prazo", "Projeto" e "Prioridade" têm 125 px ≈ 45 dp de altura                                                                                   | Prevenção de erro                             | Ajustar a altura dos chips de "Organizar por" para 48 dp em TodayScreen                                       | árvore: `today-group-deadline` bounds `[63,297][205,422]` | Já resolvido por menu-premium |
| A05 | Tarefas / cabeçalho      | Saber que o ícone do topo abre e fecha a faixa de chips | O ícone de controles no topo direito não indica que é o disclosure da faixa "ORGANIZAR POR" logo abaixo; parece um segundo caminho para a mesma função | Reconhecimento em vez de memorização          | Trocar o ícone por um estado visível de aberto/fechado (rótulo ou chevron) mantendo o toggle                  | `final`; árvore: Button `content-desc="Organizar por"`    | Corrigido neste ciclo         |
| A06 | Tarefas / card de estado | Reconhecer "Ver tudo" como ação                         | "Ver tudo" aparece só como texto em negrito dentro do card, sem borda, ícone ou sublinhado                                                             | Reconhecimento em vez de memorização          | Dar tratamento de link ou botão discreto ao "Ver tudo" no card de estado                                      | `final`; árvore: Button `content-desc="Ver tudo"`         | Corrigido neste ciclo         |
| A10 | Projetos / compartilhar  | Saber se o link exibido funciona                        | A folha mostra o link `ideias.app/p/w32zyrfjeg` com "Copiar" e, logo abaixo, "O servidor recusou este compartilhamento agora." com "Tentar de novo"    | Visibilidade do estado do sistema             | Enquanto a publicação falha, desabilitar o campo e o "Copiar" e marcar o link como ainda não publicado        | `share-sheet-2`, `share-link-criado`                      | Corrigido neste ciclo         |
| A11 | Login / conta nova       | Uma conta recém-criada começar vazia                    | Logo após entrar com nome, a tela já traz "Próxima: Tarefa um" e "SEM PRAZO 4"; Projetos, na sequência, conta "3 projetos · 4 abertas"                 | Visibilidade do estado do sistema e confiança | Nomear na tela a origem desses itens (exemplo em texto sob o card de estado) ou começar a conta nova sem eles | `pos-login`, `lists-visao-2`                              | Corrigido neste ciclo         |
| A12 | Foco / cartão da tarefa  | Saber em que tarefa o foco vai entrar                   | O cartão exibe apenas a ficha "25 min"; nenhum título de tarefa aparece                                                                                | Reconhecimento em vez de memorização          | Exibir o título da tarefa como primeira linha do cartão de foco, acima da ficha de duração                    | `focus-idle`                                              | Já resolvido por foco-inline  |
| A13 | Foco / recorte da lista  | Entender por que só uma tarefa aparece                  | Um cartão listado, enquanto Projetos conta "4 abertas" no mesmo run; a tela não diz qual recorte está mostrando                                        | Visibilidade do estado do sistema             | Acrescentar uma linha sob o subtítulo dizendo qual recorte está listado e como ver as demais                  | `focus-idle`, `lists-visao-2`                             | Corrigido neste ciclo         |

Nota A02: o atributo `clickable="false"` aparece em todo nó da árvore, inclusive
nos que já se apresentam como `class="android.widget.Button"` com `content-desc`.
Por isso ele foi tratado como artefato do dump, e não como prova de falta de
papel; A02 ficou restrito às abas, únicos nós interativos que chegam como `View`.

Nota A11: a causa (dados locais compartilhados entre sessões ou seed de
demonstração) não está provada por esta evidência. O que está registrado é o que
a tela mostra logo após a criação da conta.

## Achados — PODERIA SER MELHOR

| ID  | Tela/Fluxo               | Esperado                                      | Aconteceu                                                                                                                                                     | Heurística                           | Menor correção                                                                                                       | Evidência                                                | Desfecho                        |
| --- | ------------------------ | --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------ | -------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------- | ------------------------------- |
| A07 | Tarefas / hierarquia     | O espaço em branco separar blocos de conteúdo | Com a seção fechada, o vazio entre o filete e "Nova tarefa" ocupa ~35% da altura da tela                                                                      | Estética e design minimalista        | Resolvido por A01: o conteúdo da seção ocupa o espaço; nenhuma caixa nova deve ser adicionada                        | `final` vs. `today-secao-expandida`                      | Corrigido neste ciclo (via A01) |
| A08 | Tarefas / cabeçalho      | Saber em que tela está                        | O topo mostra só a data; a identificação da aba vem apenas do rótulo na barra inferior, ao contrário de Projetos, Foco e Você, que têm rótulo próprio no topo | Consistência e padrões               | Acrescentar o rótulo "TAREFAS" acima da data, no mesmo padrão das outras três abas                                   | `final`, `lists-visao-2`, `focus-idle`, `settings-visao` | Já resolvido por telas-botoes-2 |
| A09 | Tarefas / contagem       | Ler a contagem como parte do cabeçalho        | O "4" ao lado de "SEM PRAZO" tem contraste bem menor que o rótulo                                                                                             | Visibilidade do estado do sistema    | Igualar o peso/contraste do número ao rótulo da seção, mantendo o corpo menor                                        | `final`; árvore: TextView "4"                            | Corrigido neste ciclo           |
| A15 | Projetos / card          | Entender cada linha do card                   | Sob "Combinado do dia" aparece o rótulo solto "VER", sem ação nem explicação, entre o título e o contador                                                     | Reconhecimento em vez de memorização | Substituir "VER" por um rótulo que diga o que ele indica, ou removê-lo do card                                       | `lists-visao-2`                                          | Corrigido neste ciclo           |
| A16 | Projetos / menu de ações | Ver as ações ligadas ao projeto que as abriu  | "Compartilhar" e "Sair do projeto" aparecem flutuando no vão entre dois cards, sem ligação visual com o card de origem                                        | Reconhecimento em vez de memorização | Ancorar as ações dentro do card do projeto ou abrir como folha com o nome do projeto no topo                         | `list-actions-2`                                         | Corrigido neste ciclo           |
| A17 | Captura / ficha padrão   | Distinguir valor padrão de escolha feita      | "prioridade média" recebe contorno escuro forte, enquanto "sem data" e "sem projeto" ficam com traço claro, sugerindo seleção onde há só o padrão             | Consistência e padrões               | Usar o mesmo traço das demais fichas enquanto o valor for o padrão, reservando o contorno forte para valor escolhido | `today-captura`                                          | Corrigido neste ciclo           |

Nota sobre a coluna Desfecho: "corrigido neste ciclo" é a tarefa que implementou
esta auditoria. "Já resolvido por" nomeia a tarefa anterior que fechou o achado
antes desta, verificada no estado atual do código. Não existe A14: a numeração
salta de A13 para A15 desde a redação original.

## Notas de linguagem

Os textos observados descrevem estado, não cobram: "Você está em dia.", "Digite
seu e-mail.", "A sequência conta dia em que tudo do dia foi feito", "Pontos vêm
do peso da tarefa, nunca da quantidade" e "Três é o padrão porque lista longa é o
que faz alguém parar de abrir o app". Nenhum atribui falha ao usuário. Textos de
estado vazio, de atraso e da faixa do combinado não foram capturados.

## Não verificável com um device

Projeto compartilhado exige duas contas simultâneas. Com um login foi possível
ver a criação do link, o botão Copiar e a lista de membros ("Pessoa do projeto ·
dono") em `share-sheet-2`. O que a outra conta vê ao entrar, a convergência
last-write-wins e a remoção de membro ficam como observação não verificável nesta
sessão.

## Cobertura pendente de evidência

1. Onboarding: `Você` > `settings-replay-onboarding` → telas 1 a 3 e o "pular".
2. Conclusão de tarefa: recapturar `tarefa-concluida`, hoje mostrando a tela
   Entrar.
3. Entrada com convite inválido: recapturar `join-invite-erro`, hoje mostrando a
   tela Entrar.
4. Faixa do combinado na tela Tarefas: `shared-day-band` em seus estados (vazio,
   tudo feito, offline) e `streak-chip`.
5. Sessão de foco em andamento e conclusão: `focus-session`, `focus-complete`.
6. Erro de credencial no login: `login-erro-credencial`.
7. Cor destrutiva: uma TodayScreen com ao menos uma tarefa de prioridade alta e
   uma tarefa com prazo vencido, para observar na tela o glifo `≡` e a data. A
   regra do app já classifica como violações a corrigir os usos de
   `theme.colors.danger` em `TaskFacts.tsx` (`priorityColor`, `dueColor`) e o
   equivalente em `ListsScreen.tsx`; sem tarefa nesse estado, este run não tem
   screenshot para ancorá-los como achado.

## Fora de escopo desta auditoria

**FAB sobre a última linha durante a rolagem.** Em `tarefas-4-sem-toque` o botão
"Nova tarefa" (`today-capture`) cobre parte de uma linha de tarefa. Isso é o
comportamento normal de um botão flutuante: ele fica sobre o conteúdo enquanto a
lista rola. A folga do fim da lista já existe — o `contentContainerStyle` da
TodayScreen reserva 168 dp abaixo do último card, contra os ~78 dp ocupados pelo
FAB (54 dp de altura mais o afastamento inferior). Com a lista rolada até o fim,
nenhuma linha fica atrás do botão. Não é achado desta auditoria e nenhuma
correção foi feita por causa dele.

## Top 5 para atacar primeiro

1. **A01 — seção do dia abre fechada.** O trabalho principal do usuário diário
   exige um toque antes de qualquer tarefa aparecer. Esforço: baixo.
2. **A11 — conta nova já abre com dados da sessão anterior.** Ver tarefas que não
   são suas na primeira tela derruba confiança em app de dados pessoais.
   Esforço: médio.
3. **A10 — link compartilhado exibido junto com erro do servidor.** O usuário
   pode enviar um link que talvez não funcione. Esforço: baixo.
4. **A12 — cartão de foco sem o nome da tarefa.** A tela pede uma escolha sem
   mostrar o que está sendo escolhido. Esforço: baixo.
5. **A02 — abas sem papel de controle.** Afeta leitor de tela na navegação
   principal; a confirmar com TalkBack. Esforço: baixo.
