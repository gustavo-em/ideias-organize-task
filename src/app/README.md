# App

Casca da aplicação e raiz de composição.

Cuida da abertura, do tema compartilhado, da navegação por abas, da construção
dos adaptadores concretos e do registro dos assinantes de evento.
`useAppViewModel` guarda o estado da casca: aba aberta, aparência, idioma e se
a apresentação inicial já foi vista.

Este é o único lugar do app que sabe que `AsyncStorage` existe. Regra de negócio
e detalhe de SDK não moram aqui.
