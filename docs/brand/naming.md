# Aluza — nome do app e da entidade compartilhada

## App: Aluza

O app se chama **Aluza** em toda a interface e no launcher (`app_name`,
`app.json → displayName`). O kit oficial da marca é `assets/brand/aluza-*`:
é a única fonte de símbolo, wordmark e cores. Nada de redesenhar, esticar ou
recolorir o símbolo; adaptação de tamanho é sempre escala uniforme mais
margem.

Paleta do kit:

| Token  | Hex       |
| ------ | --------- |
| Dark   | `#1D1D1B` |
| Yellow | `#FFC107` |
| Cream  | `#F6F3EC` |
| White  | `#FFFFFF` |

## Entidade compartilhada: "Espaço/Espaços" (pt-BR), "Space/Spaces" (en-US)

A feature antes chamada "Projeto/Projetos" passa a se chamar **Espaço**.

Racional (produto + marketing):

- **"Projeto" evoca ferramenta de trabalho e setup.** A evidência de mercado
  da categoria aponta o setup como gatilho de abandono precoce — literalmente
  _"You download a productivity app to track simple tasks, then spend 20
  minutes setting up projects, categories, and integrations"_. A palavra
  carrega o custo que o app quer justamente não ter.
- **"Espaço" é substantivo de lugar, não de trabalho.** Funciona em "nosso
  espaço", "o espaço da casa", "o espaço da viagem": serve a casal, família,
  amigos, república e uso solo, sem termo exclusivo de casal.
- **Tem equivalente consagrado em en-US**: "Spaces" já é entendido como área
  compartilhada, então a paridade pt-BR/en-US sai natural.
- **Posicionamento**: a propaganda fala com casais em primeiro plano, mas o
  nome não nicha o produto — nenhum texto da interface usa "parceiro",
  "casal" ou "cônjuge".

Regras de copy derivadas:

- Convite: "Convide quem divide isso com você" / "Invite whoever shares this
  with you".
- Espaço vazio: "Um espaço vazio, pronto para o que vocês combinarem." /
  "An empty space, ready for whatever you two set up."
- Nenhum texto atribui falha ao usuário.

Identificadores internos (tipos, arquivos, testIDs, coleções do Firestore)
continuam com `project`/`list`: a troca vale para texto visível e para
`accessibilityLabel`.
