export const appLanguages = ['pt-BR', 'en-US'] as const;

export type AppLanguage = (typeof appLanguages)[number];

export interface TaskCopy {
  tabs: { today: string; lists: string; focus: string; you: string };
  today: {
    title: string;
    taskCount: (count: number) => string;
    sectionOverdue: string;
    sectionToday: string;
    sectionTomorrow: string;
    sectionNoDate: string;
    empty: string;
    emptyHint: string;
    capture: string;
    remove: string;
    removeConfirm: (title: string) => string;
    removeCancel: string;
    expand: string;
    collapse: string;
    edit: string;
    groupBy: string;
    grouping: {
      deadline: string;
      list: string;
      priority: string;
    };
    /** The "now" card: what to act on first, before the rest of the list. */
    agora: string;
    agoraMore: (count: number) => string;
    /** Starts the task from the now band, as opposed to `focus.start`, which
     * talks about the timer. */
    doNow: string;
    /** How far past the deadline. `overdue` is an adjective and does not
     * conjugate with a number. */
    lateDays: (days: number) => string;
    /** The weight a finished task just paid out. The colour says the rest. */
    earned: (weight: number) => string;
    /** The band's only control names the task it acts on. */
    doNowOn: (title: string) => string;
    /** Nothing due today, but the list is not empty: distinct from having
     * never written anything down. */
    caughtUpTitle: string;
    caughtUpNext: (title: string) => string;
    caughtUpAllDone: string;
    caughtUpViewAll: string;
  };
  capture: {
    placeholder: string;
    /** Says what priority is for, next to where it is chosen. Teaching the
     * syntax first taught people to type punctuation without ever telling
     * them what it changed. */
    hint: string;
    syntax: string;
    /** Editing does not read the text, so it must not promise that it will. */
    editHint: string;
    noList: string;
    previousMonth: string;
    nextMonth: string;
    save: string;
    cancel: string;
    examples: readonly string[];
    priority: Record<'low' | 'medium' | 'high', string>;
    noDate: string;
    today: string;
    tomorrow: string;
    minutes: (value: number) => string;
  };
  lists: {
    title: string;
    subtitle: (lists: number, tasks: number) => string;
    empty: string;
    progress: (done: number, total: number) => string;
    addToDay: string;
    inDay: string;
    newList: string;
    renameList: string;
    create: string;
    namePlaceholder: string;
    nameHint: string;
    duplicateName: string;
    addFirstTask: string;
    addTask: string;
    rename: string;
    moreActions: (name: string) => string;
    delete: string;
    deleteConfirm: (name: string) => string;
    deleteDetail: string;
    color: string;
    icon: string;
    appearance: string;
    customize: string;
    back: string;
    done: string;
    colors: Record<ListColor, string>;
    icons: Record<ProjectIcon, string>;
    // Sharing a project with friends — see docs/design/ui-projeto-compartilhado.md.
    share: string;
    shareHint: string;
    createLink: string;
    copyLink: string;
    copyLinkAccessible: string;
    linkCopied: string;
    invite: string;
    invitedAsLabel: string;
    roleViewer: string;
    roleEditor: string;
    roleOwner: string;
    roleChangeNote: string;
    membersHeader: string;
    pendingInvite: string;
    removeMemberLabel: string;
    removeMember: (name: string) => string;
    removeMemberConfirm: (name: string) => string;
    stopSharing: string;
    stopSharingConfirm: string;
    sharedWith: (count: number) => string;
    // The band at the top of an open shared project — fase 2.
    dayBandTitle: string;
    dayBandEmpty: string;
    dayBandTakeOne: string;
    dayBandAllDone: (count: number) => string;
    dayBandStreak: (days: number) => string;
    dayBandOffline: string;
    dayBandAbsent: string;
    dayBandStateFocusing: string;
    dayBandStateOpen: string;
    dayBandStateDone: string;
    joinInvite: string;
    joinInviteTitle: string;
    joinInviteHint: string;
    joinInvitePlaceholder: string;
    pasteFromClipboard: string;
    join: string;
    joining: string;
    invalidInvite: string;
    tryAgain: string;
    noNetwork: string;
    shareRefused: string;
    creatingLink: string;
    leaveProject: string;
    leaveProjectConfirm: (name: string) => string;
    deleteSharedDetail: string;
    completedBy: (name: string) => string;
    groupEmpty: string;
    groupEmptyInvite: string;
    groupAllDone: string;
    viewerCannotAdd: string;
  };
  focus: {
    title: string;
    idle: string;
    idleEmpty: string;
    idleHint: string;
    remaining: string;
    pause: string;
    resume: string;
    finish: string;
    complete: string;
    finished: string;
    chooseDuration: string;
    customDuration: string;
    increaseDuration: string;
    decreaseDuration: string;
    start: string;
    cancel: string;
    newFocus: string;
  };
  progress: {
    title: string;
    /** Conjugates. "1 seguidos" is the kind of thing that makes an app feel
     * machine-written, and zero is a sentence rather than a number. */
    streakTitle: (days: number) => string;
    streakHint: string;
    level: (level: number) => string;
    levelPoints: (into: number, span: number) => string;
    trios: string;
    week: string;
    weekdays: readonly string[];
    weightHint: string;
  };
  settings: {
    title: string;
    appearance: string;
    dayCapacity: string;
    dayCapacityOption: (capacity: number) => string;
    dayCapacityHint: string;
    light: string;
    dark: string;
    language: string;
    about: string;
    version: (value: string) => string;
  };
  onboarding: {
    steps: readonly { title: string; body: string }[];
    next: string;
    start: string;
    skip: string;
  };
  celebration: {
    title: string;
    body: (streak: number) => string;
    close: string;
  };
  priorityLabel: Record<'low' | 'medium' | 'high', string>;
  overdue: string;
  dueToday: string;
  tomorrow: string;
  noDate: string;
  stale: (days: number) => string;
}

const ptBR: TaskCopy = {
  tabs: { today: 'Tarefas', lists: 'Projetos', focus: 'Foco', you: 'Você' },
  today: {
    title: 'Em aberto',
    taskCount: count => (count === 1 ? '1 tarefa' : `${count} tarefas`),
    sectionOverdue: 'Antes de hoje',
    sectionToday: 'Hoje',
    sectionTomorrow: 'Amanhã',
    sectionNoDate: 'Sem prazo',
    empty: 'Sua lista está livre.',
    emptyHint: 'O que você quer organizar primeiro?',
    capture: 'Nova tarefa',
    remove: 'Excluir',
    removeConfirm: title => `Excluir “${title}”? Isso não volta.`,
    removeCancel: 'Cancelar',
    expand: 'Expandir seção',
    collapse: 'Recolher seção',
    edit: 'Editar',
    groupBy: 'Organizar por',
    grouping: {
      deadline: 'Prazo',
      list: 'Projeto',
      priority: 'Prioridade',
    },
    agora: 'Agora',
    agoraMore: count => (count === 1 ? 'mais 1 hoje' : `mais ${count} hoje`),
    doNow: 'Fazer agora',
    lateDays: days => (days === 1 ? '1 dia' : `${days} dias`),
    earned: weight => `+${weight}`,
    doNowOn: title => `Fazer agora: ${title}`,
    caughtUpTitle: 'Você está em dia.',
    caughtUpNext: title => `Próxima: ${title}`,
    caughtUpAllDone: 'Tudo certo por aqui.',
    caughtUpViewAll: 'Ver tudo',
  },
  capture: {
    placeholder: 'O que precisa ser feito?',
    hint: 'Toque nas fichas para ajustar. Alta entra antes no dia e vale mais pontos.',
    syntax: 'Também entende: amanhã, sexta 9h, urgente, ~30min, #projeto',
    editHint:
      'Aqui o texto vale como está escrito. Data, prioridade e lista mudam só nas fichas.',
    noList: 'sem projeto',
    previousMonth: 'Mês anterior',
    nextMonth: 'Próximo mês',
    save: 'Salvar',
    cancel: 'Cancelar',
    examples: [
      'ligar pro contador sexta 9h !alta #impostos',
      'comprar pão amanhã',
      'revisar roteiro ~45min',
    ],
    priority: {
      low: 'prioridade baixa',
      medium: 'prioridade média',
      high: 'prioridade alta',
    },
    noDate: 'sem data',
    today: 'hoje',
    tomorrow: 'amanhã',
    minutes: value =>
      value >= 60 ? `${Math.round(value / 60)} h` : `${value} min`,
  },
  lists: {
    title: 'Onde os\nplanos andam.',
    subtitle: (lists, tasks) => `${lists} projetos · ${tasks} abertas`,
    empty: 'Nenhuma tarefa neste projeto.',
    progress: (done, total) => `${done}/${total}`,
    addToDay: 'Levar para hoje',
    inDay: 'No dia',
    newList: 'Novo projeto',
    renameList: 'Editar projeto',
    create: 'Criar',
    namePlaceholder: 'Nome do projeto',
    nameHint: 'Reúna os próximos passos de algo maior.',
    duplicateName: 'Esse projeto já existe. Escolha outro nome.',
    addFirstTask: 'Adicionar primeira tarefa',
    addTask: 'Adicionar tarefa',
    rename: 'Renomear',
    moreActions: name => `Mais ações: ${name}`,
    delete: 'Excluir',
    deleteConfirm: name => `Excluir “${name}”?`,
    deleteDetail: 'As tarefas serão movidas para Caixa; nada será apagado.',
    color: 'Cor',
    icon: 'Símbolo',
    appearance: 'Símbolo e cor',
    customize: 'Escolher',
    back: 'Voltar',
    done: 'Pronto',
    colors: {
      sun: 'Amarelo',
      grape: 'Roxo',
      mint: 'Verde',
      coral: 'Terracota',
      ocean: 'Azul-petróleo',
    },
    icons: {
      layers: 'Camadas',
      home: 'Casa',
      briefcase: 'Trabalho',
      plane: 'Viagem',
      book: 'Estudos',
      heart: 'Bem-estar',
      cart: 'Compras',
      wallet: 'Finanças',
      dumbbell: 'Treino',
      bulb: 'Ideias',
      calendar: 'Eventos',
      inbox: 'Caixa',
    },
    share: 'Compartilhar',
    shareHint: 'Quem abrir o link entra no projeto.',
    createLink: 'Criar link',
    copyLink: 'Copiar',
    copyLinkAccessible: 'Copiar link do projeto',
    linkCopied: 'Link copiado',
    invite: 'Convidar',
    invitedAsLabel: 'Quem entrar pode',
    roleViewer: 'Ver',
    roleEditor: 'Editar',
    roleOwner: 'dono',
    roleChangeNote: 'Vale para quem entrar depois, não para quem já entrou.',
    membersHeader: 'No projeto',
    pendingInvite: 'convite pendente',
    removeMemberLabel: 'Remover',
    removeMember: name => `Remover ${name} do projeto`,
    removeMemberConfirm: name => `Remover ${name} do projeto?`,
    stopSharing: 'Parar de compartilhar',
    stopSharingConfirm:
      'Ninguém mais vai poder entrar; quem já está sai também.',
    sharedWith: count => (count === 1 ? '1 pessoa' : `${count} pessoas`),
    dayBandTitle: 'Hoje, no combinado',
    dayBandEmpty: 'Ninguém levou nada para hoje ainda.',
    dayBandTakeOne: 'Levar uma para hoje',
    dayBandAllDone: count =>
      count === 1 ? 'Uma pessoa fechou hoje' : `Os ${count} fecharam hoje`,
    dayBandStreak: days =>
      days === 1
        ? '1 dia seguido em que todo mundo fechou o que levou.'
        : `${days} dias seguidos em que todo mundo fechou o que levou.`,
    dayBandOffline:
      'Sem conexão agora — mostrando o que já estava no aparelho.',
    dayBandAbsent: 'Ainda não levou nada',
    dayBandStateFocusing: 'em foco',
    dayBandStateOpen: 'em aberto',
    dayBandStateDone: 'concluída',
    joinInvite: 'Entrar com convite',
    joinInviteTitle: 'Entrar em um projeto',
    joinInviteHint: 'Cole o link que alguém te mandou.',
    joinInvitePlaceholder: 'Link do convite',
    pasteFromClipboard: 'Colar',
    join: 'Entrar',
    joining: 'Entrando…',
    invalidInvite: 'Esse convite não é válido. Confira o link e tente de novo.',
    tryAgain: 'Tentar de novo',
    noNetwork: 'Sem conexão agora. Verifique a internet e tente de novo.',
    shareRefused:
      'O servidor recusou este compartilhamento agora. Tente de novo em instantes.',
    creatingLink: 'Criando link…',
    leaveProject: 'Sair do projeto',
    leaveProjectConfirm: name =>
      `Sair de “${name}”? Você deixa de ver as tarefas dele.`,
    deleteSharedDetail:
      'Isso apaga o projeto para todo mundo, não só para você. Ninguém recupera as tarefas depois.',
    completedBy: name => `Concluída por ${name}`,
    groupEmpty: 'Nenhuma tarefa neste projeto ainda.',
    groupEmptyInvite: 'Convide alguém e comecem juntos.',
    groupAllDone: 'Tudo feito por aqui.',
    viewerCannotAdd: 'Você só pode ver este projeto.',
  },
  focus: {
    title: 'Foco',
    idle: 'Escolha uma para começar',
    idleEmpty: 'Nada aberto no dia. Feche o app e vá viver.',
    idleHint: 'Escolha o tempo que você acha que vai levar.',
    remaining: 'restantes',
    pause: 'Pausar',
    resume: 'Continuar',
    finish: 'Encerrar',
    complete: 'Concluir',
    finished: 'Tempo cumprido.',
    chooseDuration: 'Quanto tempo você quer focar?',
    customDuration: 'Personalizado',
    increaseDuration: 'Aumentar tempo',
    decreaseDuration: 'Diminuir tempo',
    start: 'Começar',
    cancel: 'Cancelar',
    newFocus: 'Novo foco',
  },
  progress: {
    title: 'Seu ritmo',
    streakTitle: days =>
      days === 0
        ? 'Sem sequência ainda'
        : days === 1
        ? '1 dia seguido'
        : `${days} dias seguidos`,
    streakHint: 'A sequência conta dia em que tudo do dia foi feito',
    level: level => `Nível ${level}`,
    levelPoints: (into, span) => `${into} de ${span} pontos`,
    trios: 'dias fechados',
    week: 'Últimos sete dias',
    weekdays: ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'],
    weightHint: 'Pontos vêm do peso da tarefa, nunca da quantidade.',
  },
  settings: {
    title: 'Ajustes',
    appearance: 'Aparência',
    dayCapacity: 'Tarefas por dia',
    dayCapacityOption: capacity => (capacity === 0 ? 'Todas' : `${capacity}`),
    dayCapacityHint:
      'Três é o padrão porque lista longa é o que faz alguém parar de abrir o app. Sem limite, tudo que estiver aberto aparece no dia.',
    light: 'Claro',
    dark: 'Escuro',
    language: 'Idioma',
    about: 'Sobre',
    version: value => `Versão ${value}`,
  },
  onboarding: {
    steps: [
      {
        title: 'Escreva do jeito que você fala',
        body: 'Uma linha só. Data, prioridade e lista saem do próprio texto.',
      },
      {
        title: 'O dia cabe em três',
        body: 'Todo dia o app separa três tarefas. O resto fica guardado, contado e fora da sua frente.',
      },
      {
        title: 'Fechar tem peso',
        body: 'Pontos vêm do tamanho do que foi feito. Fatiar a lista não acelera nada.',
      },
    ],
    next: 'Continuar',
    start: 'Começar',
    skip: 'Pular',
  },
  celebration: {
    title: 'Dia fechado.',
    body: streak =>
      streak <= 1
        ? 'Três de três. Amanhã começa a sequência.'
        : `Três de três. ${streak} dias seguidos.`,
    close: 'Fechar',
  },
  priorityLabel: { low: 'baixa', medium: 'média', high: 'alta' },
  overdue: 'atrasada',
  dueToday: 'hoje',
  tomorrow: 'amanhã',
  noDate: 'sem data',
  stale: days => `parada há ${days} dias`,
};

const enUS: TaskCopy = {
  tabs: { today: 'Tasks', lists: 'Projects', focus: 'Focus', you: 'You' },
  today: {
    title: 'Open tasks',
    taskCount: count => (count === 1 ? '1 task' : `${count} tasks`),
    sectionOverdue: 'Before today',
    sectionToday: 'Today',
    sectionTomorrow: 'Tomorrow',
    sectionNoDate: 'No deadline',
    empty: 'Your list is clear.',
    emptyHint: 'What do you want to organize first?',
    capture: 'New task',
    remove: 'Delete',
    removeConfirm: title => `Delete “${title}”? This does not come back.`,
    removeCancel: 'Cancel',
    expand: 'Expand section',
    collapse: 'Collapse section',
    edit: 'Edit',
    groupBy: 'Group by',
    grouping: {
      deadline: 'Deadline',
      list: 'Project',
      priority: 'Priority',
    },
    agora: 'Now',
    agoraMore: count => (count === 1 ? '1 more today' : `${count} more today`),
    doNow: 'Do it now',
    lateDays: days => (days === 1 ? '1 day' : `${days} days`),
    earned: weight => `+${weight}`,
    doNowOn: title => `Do it now: ${title}`,
    caughtUpTitle: "You're caught up.",
    caughtUpNext: title => `Next: ${title}`,
    caughtUpAllDone: 'All clear here.',
    caughtUpViewAll: 'View all',
  },
  capture: {
    placeholder: 'What needs doing?',
    hint: 'Tap the chips to adjust. High goes into the day first and is worth more points.',
    syntax: 'Also understands: tomorrow, friday 9h, urgent, ~30min, #project',
    editHint:
      'Here the text is kept as written. Date, priority and list change only through the chips.',
    noList: 'no project',
    previousMonth: 'Previous month',
    nextMonth: 'Next month',
    save: 'Save',
    cancel: 'Cancel',
    examples: [
      'call the accountant friday 9h !high #taxes',
      'buy bread tomorrow',
      'review the script ~45min',
    ],
    priority: {
      low: 'low priority',
      medium: 'medium priority',
      high: 'high priority',
    },
    noDate: 'no date',
    today: 'today',
    tomorrow: 'tomorrow',
    minutes: value =>
      value >= 60 ? `${Math.round(value / 60)} h` : `${value} min`,
  },
  lists: {
    title: 'Where plans\nmove forward.',
    subtitle: (lists, tasks) => `${lists} projects · ${tasks} open`,
    empty: 'No tasks in this project.',
    progress: (done, total) => `${done}/${total}`,
    addToDay: 'Move into today',
    inDay: 'In the day',
    newList: 'New project',
    renameList: 'Edit project',
    create: 'Create',
    namePlaceholder: 'Project name',
    nameHint: 'Gather the next steps of something larger.',
    duplicateName: 'That project already exists. Choose another name.',
    addFirstTask: 'Add first task',
    addTask: 'Add task',
    rename: 'Rename',
    moreActions: name => `More actions: ${name}`,
    delete: 'Delete',
    deleteConfirm: name => `Delete “${name}”?`,
    deleteDetail: 'Its tasks will move to Inbox; nothing will be deleted.',
    color: 'Color',
    icon: 'Symbol',
    appearance: 'Symbol and color',
    customize: 'Choose',
    back: 'Back',
    done: 'Done',
    colors: {
      sun: 'Yellow',
      grape: 'Purple',
      mint: 'Green',
      coral: 'Terracotta',
      ocean: 'Teal',
    },
    icons: {
      layers: 'Layers',
      home: 'Home',
      briefcase: 'Work',
      plane: 'Travel',
      book: 'Study',
      heart: 'Well-being',
      cart: 'Shopping',
      wallet: 'Finances',
      dumbbell: 'Workout',
      bulb: 'Ideas',
      calendar: 'Events',
      inbox: 'Inbox',
    },
    share: 'Share',
    shareHint: 'Whoever opens the link joins the project.',
    createLink: 'Create link',
    copyLink: 'Copy',
    copyLinkAccessible: 'Copy the project link',
    linkCopied: 'Link copied',
    invite: 'Invite',
    invitedAsLabel: 'Whoever joins can',
    roleViewer: 'View',
    roleEditor: 'Edit',
    roleOwner: 'owner',
    roleChangeNote: 'Applies to whoever joins next, not to who is already in.',
    membersHeader: 'In the project',
    pendingInvite: 'invite pending',
    removeMemberLabel: 'Remove',
    removeMember: name => `Remove ${name} from the project`,
    removeMemberConfirm: name => `Remove ${name} from the project?`,
    stopSharing: 'Stop sharing',
    stopSharingConfirm:
      'Nobody else can join; whoever is already in leaves too.',
    sharedWith: count => (count === 1 ? '1 person' : `${count} people`),
    dayBandTitle: 'Today, together',
    dayBandEmpty: 'Nobody took anything for today yet.',
    dayBandTakeOne: 'Take one for today',
    dayBandAllDone: count =>
      count === 1 ? 'One person closed today' : `All ${count} closed today`,
    dayBandStreak: days =>
      days === 1
        ? '1 day in a row where everybody closed what they took.'
        : `${days} days in a row where everybody closed what they took.`,
    dayBandOffline:
      'No connection right now — showing what was already on the phone.',
    dayBandAbsent: 'Has not taken anything yet',
    dayBandStateFocusing: 'in focus',
    dayBandStateOpen: 'open',
    dayBandStateDone: 'done',
    joinInvite: 'Join with invite',
    joinInviteTitle: 'Join a project',
    joinInviteHint: 'Paste the link someone sent you.',
    joinInvitePlaceholder: 'Invite link',
    pasteFromClipboard: 'Paste',
    join: 'Join',
    joining: 'Joining…',
    invalidInvite: "That invite isn't valid. Check the link and try again.",
    tryAgain: 'Try again',
    noNetwork: 'No connection right now. Check the internet and try again.',
    shareRefused:
      'The server refused this share right now. Try again in a moment.',
    creatingLink: 'Creating link…',
    leaveProject: 'Leave project',
    leaveProjectConfirm: name => `Leave “${name}”? You stop seeing its tasks.`,
    deleteSharedDetail:
      'This deletes the project for everyone, not just you. Nobody gets the tasks back after.',
    completedBy: name => `Completed by ${name}`,
    groupEmpty: 'No tasks in this project yet.',
    groupEmptyInvite: 'Invite someone and start together.',
    groupAllDone: 'All done here.',
    viewerCannotAdd: 'You can only view this project.',
  },
  focus: {
    title: 'Focus',
    idle: 'Pick one to start',
    idleEmpty: 'Nothing open today. Close the app and go live.',
    idleHint: 'Pick how long you think it will take.',
    remaining: 'remaining',
    pause: 'Pause',
    resume: 'Resume',
    finish: 'Stop',
    complete: 'Complete',
    finished: 'Time served.',
    chooseDuration: 'How long do you want to focus?',
    customDuration: 'Custom',
    increaseDuration: 'Increase time',
    decreaseDuration: 'Decrease time',
    start: 'Start',
    cancel: 'Cancel',
    newFocus: 'New focus',
  },
  progress: {
    title: 'Your pace',
    streakTitle: days =>
      days === 0
        ? 'No streak yet'
        : days === 1
        ? '1 day in a row'
        : `${days} days in a row`,
    streakHint: 'The streak counts days where the whole day was done',
    level: level => `Level ${level}`,
    levelPoints: (into, span) => `${into} of ${span} points`,
    trios: 'days closed',
    week: 'Last seven days',
    weekdays: ['S', 'M', 'T', 'W', 'T', 'F', 'S'],
    weightHint: 'Points come from weight, never from count.',
  },
  settings: {
    title: 'Settings',
    appearance: 'Appearance',
    dayCapacity: 'Tasks per day',
    dayCapacityOption: capacity => (capacity === 0 ? 'All' : `${capacity}`),
    dayCapacityHint:
      'Three is the default because a long list is what makes people stop opening the app. With no ceiling, everything still open shows up in the day.',
    light: 'Light',
    dark: 'Dark',
    language: 'Language',
    about: 'About',
    version: value => `Version ${value}`,
  },
  onboarding: {
    steps: [
      {
        title: 'Write it the way you say it',
        body: 'One line. Date, priority and list come out of the text itself.',
      },
      {
        title: 'The day fits in three',
        body: 'Every day the app sets aside three tasks. The rest stays kept, counted and out of your face.',
      },
      {
        title: 'Finishing has weight',
        body: 'Points come from the size of what was done. Slicing the list speeds up nothing.',
      },
    ],
    next: 'Continue',
    start: 'Start',
    skip: 'Skip',
  },
  celebration: {
    title: 'Day closed.',
    body: streak =>
      streak <= 1
        ? 'Three of three. Tomorrow starts the streak.'
        : `Three of three. ${streak} days in a row.`,
    close: 'Close',
  },
  priorityLabel: { low: 'low', medium: 'medium', high: 'high' },
  overdue: 'overdue',
  dueToday: 'today',
  tomorrow: 'tomorrow',
  noDate: 'no date',
  stale: days => `sitting for ${days} days`,
};

const COPY: Record<AppLanguage, TaskCopy> = { 'pt-BR': ptBR, 'en-US': enUS };

export function getTaskCopy(language: AppLanguage): TaskCopy {
  return COPY[language] ?? ptBR;
}
import type { ListColor, ProjectIcon } from '../../domain/TaskList';
