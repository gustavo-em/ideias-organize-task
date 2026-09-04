# 5. O projeto é compartilhado, o placar não

Data: 2026-09-01 · Status: aceito

## Contexto

A fase 2 dos projetos compartilhados coloca a faixa "Hoje, no combinado" no topo
do projeto aberto: uma linha por pessoa com o que ela levou para hoje e se
fechou. A pergunta que apareceu no desenho foi até onde essa faixa pode ir —
mostrar pontos, nível, peso ou a sequência pessoal de cada um transformaria a
faixa num ranking entre amigos com um esforço pequeno de implementação.

Duas evidências pesaram contra isso. A primeira é o próprio `ProgressState`:
ele é o registro de como uma pessoa está indo, e nunca foi feito para ser lido
por outra. A segunda vem das reclamações recorrentes em apps de hábito com
sequência: perder uma sequência longa não faz a pessoa recomeçar, faz ela
abandonar. Uma sequência exposta ao grupo transforma um dia ruim em dívida
social.

## Decisão

Nenhuma tela da fase 2 mostra progresso individual de outra pessoa. A faixa
mostra só duas coisas por pessoa: qual tarefa do projeto ela levou para hoje e
em que estado essa tarefa está. `ProgressState` não sai do aparelho.

A "sequência do grupo" existe, mas é derivada e local: dias seguidos em que
**todos** fecharam o que levaram. Um dia em que o dado de alguém não chegou não
conta como fechado e também **não zera** o contador — quebra não é punição.

O dado novo que atravessa a rede é apenas `SharedMemberDay`
(`personId`, `dayKey`, `taskIds`, `focusTaskId`, `updatedAtMs`), num documento
por dia do projeto, com um mapa indexado pelo uid. Publicar é uma escrita num
caminho de campo; ler o dia é uma leitura de documento; a regra de segurança em
`docs/firebase/firestore.rules` exige ser membro do projeto para ler e só deixa
cada um escrever a própria chave.

## Consequências

- `sharedDay()` recebe `days: readonly SharedMemberDay[]` além de membros e
  tarefas. A assinatura de três argumentos do pacote de desenho não conseguia
  cumprir a regra "membro sem dado remoto fica fora do array": o trio de cada
  pessoa vive no workspace dela e não dá para derivar das tarefas sincronizadas,
  então a origem do dado precisou entrar como argumento.
- Silêncio de rede nunca vira estado: quem não publicou o dia não aparece na
  faixa, e uma falha de leitura mostra o que já estava no aparelho com uma linha
  explicando, em vez de esvaziar a faixa ou girar um indicador.
- `focusing` continua no modelo e nunca é produzido nesta fatia: acender o glifo
  exigiria publicar presença ao vivo, o único pedaço perto de tempo real.
- Passo manual do dono, fora do que o app pode fazer: publicar as regras
  atualizadas de `docs/firebase/firestore.rules` no console do Firebase.
