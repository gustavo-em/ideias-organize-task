# Application

Casos de uso e portas.

Um caso de uso recebe o `Workspace` atual e devolve `{ workspace, events }`.
Ele não salva nada, não vibra, não anima e não fala com nenhum SDK — quem faz
isso são os assinantes do barramento, registrados na raiz de composição.

Por isso todo caso de uso é uma função pura e o teste dele não precisa de
`AsyncStorage`, de relógio de verdade nem de React.
