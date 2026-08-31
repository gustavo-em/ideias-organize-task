# Marca

A peça visual completa — logotipo em tamanhos, paleta, tipografia, as seis telas
e a especificação de movimento — está em
[`design/identidade-e-telas.html`](design/identidade-e-telas.html). Abra no
navegador. O que segue é o resumo que o código precisa obedecer.

## A marca

**Ideias** é o nome da marca. **Lista de tarefas** é o descritor que explica a
categoria quando o contexto pedir; ele não faz parte do nome e nunca deve
aparecer como “Organize Task”. O lockup usa “Ideias” em primeiro nível e o
descritor em segundo.

Três fragmentos. Eles são uma **lista** em repouso e viram um **sinal de
concluído** em movimento; o terceiro não some no caminho, vira a faísca própria
de quatro pontas acima do tique. O logotipo conta o que o produto faz sem virar
um mascote ou uma notificação.

A geometria vive em `src/app/components/AppMark.tsx`, em `MARK_GEOMETRY`, e a
abertura anima exatamente esses números. É o que impede o ícone e a splash de
divergirem.

O master usa grid `120 × 120`, traço óptico de `14`, área livre mínima de `16`,
vértice em `(47,78)` e faísca `14 × 14` centrada em `(92,28)`. Abaixo de 32 px,
a faísca vira um losango arredondado. Regras: nunca girar a marca pronta; nunca
usar gradiente; nunca usar a faísca sozinha.

## Paleta

| Nome  | Claro     | Escuro    | Papel                                 |
| ----- | --------- | --------- | ------------------------------------- |
| Sol   | `#FFC63D` | `#FFC63D` | Preenchimento, marca, conclusão       |
| Mel   | `#B36F00` | `#FFB524` | Texto de destaque, estado pressionado |
| Tinta | `#1B1710` | —         | Texto no claro, fundo no escuro       |
| Papel | `#FFFDF7` | `#141008` | Fundo                                 |
| Uva   | `#4B3A8F` | `#A895F5` | Modo foco e faísca                    |
| Menta | `#0A8F60` | `#3FD69B` | Concluído em texto                    |
| Coral | `#C93B25` | `#FF8A73` | Atrasado                              |

**Regra dura: Sol nunca é texto.** Amarelo sobre papel dá 1,6:1 e é ilegível.
Texto sobre Sol é sempre Tinta, que dá 11,4:1. Onde a marca precisa aparecer
escrita, usa-se Mel.

O cinza deste produto é quente. Um cinza neutro ao lado deste amarelo lê como
outro app.

## Tipografia

O app usa a fonte do sistema com tracking ajustado — tela de leitura curta não
paga o peso de um arquivo de fonte. A escala vive no tema, nomeada pelo papel e
não pelo tamanho: `display 34 / title 25 / heading 19 / body 15 / label 13 /
caption 11`.

Título com `letter-spacing -1.1`, rótulo em maiúscula com `+1.6`.

A peça de marca usa Bricolage Grotesque no display e Instrument Sans no texto.

Na splash, o wordmark “Ideias” usa contornos vetoriais exportados da Bricolage
Grotesque 700 (`opsz=14`, `wdth=100`) com HarfBuzz. O master vive em
`assets/brand/ideias-wordmark.svg`; a licença SIL OFL 1.1 acompanha o asset em
`assets/brand/LICENSE-Bricolage-Grotesque.txt`. Rode `npm run brand:wordmark`
depois de substituir conscientemente o master oficial. O componente gerado
não deve ser editado à mão.

## Movimento

Vocabulário único em
`src/features/tasks/presentation/animation/motion.ts`. Nenhuma tela inventa
duração própria.

| Evento           | O que acontece                                                 | Curva                                                                                    |
| ---------------- | -------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| Abertura         | Três fragmentos viram tique e faísca                           | Ease-out estrutural, 420 ms; fade 140 ms; encurta para no máximo 180 ms depois de pronto |
| `task.completed` | Caixa enche de Sol, traço se desenha, título risca, cartão sai | Mola (14/220) + traço 240 ms + saída 260 ms                                              |
| `trio.completed` | Confete curto, contador sobe, sequência pulsa                  | 1,2 s, easeOutCubic, háptico                                                             |
| `task.captured`  | Folha desce, cartão entra por cima                             | Mola de folha 320 ms, entrada 240 ms                                                     |
| Toque            | Escala 0,96 e volta                                            | 120 ms, mola leve                                                                        |
| Troca de aba     | Indicador desliza sob o ícone ativo                            | Mola 260 ms                                                                              |
| `focus.started`  | Fundo transita para Uva, anel começa                           | Cor 420 ms, anel na thread de UI                                                         |

Na abertura, `useReducedMotion` remove deslocamento, rotação, compressão e pulso
e limita a troca a um crossfade de 80 ms. As demais curvas declaram
`ReduceMotion.System`.

Animação responde a um evento do domínio. Se nada aconteceu, nada se mexe.

**Uma regra técnica que vale documentar:** no Reanimated, `entering`, `exiting`
e `layout` são todos _layout animations_, e um componente que roda qualquer uma
delas **não pode** declarar `opacity` no próprio estilo — o aviso aparece uma vez
por instância e a propriedade pode ser sobrescrita. Por isso o cartão separa
casca animada de superfície, e a barra da semana separa a entrada do
esmaecimento. Transição de layout foi removida das listas de tarefa: valia menos
que o console limpo.

## Anatomia do cartão

```text
┌──────────────────────────────────────────────┐
│ ☐   Título da tarefa, no tamanho de título    │
│                                              │
│     ▮▮▯ média  📅 amanhã     [Fazer agora]   │
└──────────────────────────────────────────────┘
```

O título ocupa a linha inteira porque é a única coisa que alguém procura ali.
Embaixo, mais discreto, o que a tarefa é e o que dá para fazer com ela. Cada
fato carrega o glifo do seu tipo. A tarja de prioridade na borda esquerda foi
removida: as barras de nível já dizem a mesma coisa, e dizer duas vezes fazia
uma lista calma parecer painel de alarme.

A caixa de entrada não aparece como lista no cartão — ela é o padrão, então
nomeá-la em toda tarefa é ruído que ainda rouba uma linha de largura.
