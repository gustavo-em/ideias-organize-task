export const appLanguages = ['pt-BR', 'en-US'] as const;

export type AppLanguage = (typeof appLanguages)[number];

export interface TaskCopy {
  tabs: { today: string; lists: string; you: string };
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
    /** Editing does not read the text, so it must not promise that it will. */
    editHint: string;
    /** The sheet opens minimal: these name the way into the chips and into the
     * writing shortcuts, one tap away each. */
    moreOptions: string;
    lessOptions: string;
    syntaxTitle: string;
    syntaxHelp: string;
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
    /** Saying something before the deadline, chosen on the task itself. Only
     * ever seen on a task that has a date to count back from. */
    reminder: {
      /** Names the control for a screen reader, whatever it currently says. */
      label: string;
      off: string;
      on: (days: number) => string;
      noReminder: string;
      daysBefore: (days: number) => string;
      /** What the chip itself says when the deadline leaves no room: short
       * enough for a chip, and the same fact as `tooLateHint`. */
      noLeadTime: string;
      /** A deadline today or already past leaves no room to warn early. */
      tooLateHint: string;
      /** The phone was told no. Says what is off, never what the person did
       * wrong. */
      blockedHint: string;
      openSettings: string;
    };
  };
  /** The steps inside one task. Only ever seen while editing a task: capture
   * stays one field. */
  subtasks: {
    title: string;
    /** Names one step for a screen reader, so its box is never mistaken for
     * the task's own. */
    item: (title: string) => string;
    /** Read out on a card that has steps, where only "2/5" is drawn. */
    progress: (done: number, total: number) => string;
    /** Read out while writing a new task, where nothing is ticked yet and only
     * the number of steps is drawn. */
    count: (total: number) => string;
    addPlaceholder: string;
    add: string;
    /** Names the step being renamed, so the field is not an unlabelled box. */
    rename: (title: string) => string;
    remove: (title: string) => string;
    /** A suggestion, never a verdict: finishing the steps is not finishing the
     * task, and the person is the one who says it is done. */
    allDone: string;
    limitReached: (limit: number) => string;
  };
  lists: {
    title: string;
    subtitle: (lists: number, tasks: number) => string;
    empty: string;
    progress: (done: number, total: number) => string;
    addToDay: string;
    inDay: string;
    newList: string;
    /** Sits under "Novo espaço": the templates are a shortcut, never a
     * requirement. */
    templatesSubtitle: string;
    /** Name and short description of each starting point. The name is what
     * lands in the name field when the card is tapped. */
    templates: Record<ProjectTemplateId, { name: string; description: string }>;
    renameList: string;
    create: string;
    namePlaceholder: string;
    nameHint: string;
    duplicateName: string;
    sharedProject: string;
    sharedProjectHint: string;
    addFirstTask: string;
    addTask: string;
    rename: string;
    moreActions: (name: string) => string;
    /** The disclosure control on a project card, named by what the tap does
     * next: closed projects offer to open, open ones offer to close. */
    expandProject: (name: string) => string;
    collapseProject: (name: string) => string;
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
    /** Shown while the server has not confirmed the share, so nobody sends a
     * link that will not open. */
    linkNotPublished: string;
    /** What a project card means when this account can only read it. */
    readOnlyTag: string;
    /** Names which project the open action row belongs to. */
    actionsFor: (name: string) => string;
    invite: string;
    invitedAsLabel: string;
    roleViewer: string;
    roleEditor: string;
    roleOwner: string;
    roleChangeNote: string;
    membersHeader: string;
    /** Who came into the project and when, most recent first. */
    joinHistoryHeader: string;
    /** Stands in for the moment of entry of somebody recorded before it was
     * kept: a dash, never a guessed date. */
    joinedAtUnknown: string;
    /** Says the section shows only the latest entries. */
    joinHistoryTruncated: (shown: number, total: number) => string;
    joinedAtAccessible: (name: string, when: string) => string;
    /** Spoken form of the dash: a screen reader never reads a bare glyph. */
    joinedAtUnknownAccessible: (name: string) => string;
    pendingInvite: string;
    /** The logged-in person's own row. */
    memberYou: string;
    memberYouInitials: string;
    /** For somebody a project only recorded by an address: the address is
     * never shown, so the row says this instead. */
    memberSomeone: string;
    removeMemberLabel: string;
    removeMember: (name: string) => string;
    removeMemberConfirm: (name: string) => string;
    stopSharing: string;
    stopSharingConfirm: string;
    sharedWith: (count: number) => string;
    /** Who took each task of a shared project. */
    assignSectionTitle: string;
    joinTask: string;
    leaveTask: string;
    assignedTo: (count: number) => string;
    /** What the tap does, never where the person already is: the row says
     * "put in" while nobody is on it, and "take out" once somebody is. */
    assignPerson: (name: string) => string;
    unassignPerson: (name: string) => string;
    assignedAnnouncement: (name: string) => string;
    unassignedAnnouncement: (name: string) => string;
    // The band at the top of an open shared project — fase 2.
    dayBandTitle: string;
    dayBandEmpty: string;
    dayBandEmptyHint: string;
    dayBandTakeOne: string;
    dayBandAllDone: (count: number) => string;
    dayBandStreak: (days: number) => string;
    dayBandOffline: string;
    dayBandError: string;
    dayBandRetry: string;
    dayBandRetrying: string;
    dayBandRetryFailed: string;
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
    /** Says which slice of the tasks is on this list, so a short list is not
     * read as a missing one. */
    idleScope: string;
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
    /** Starts a block from the task itself, in the edit sheet. */
    action: string;
    /** Leaves the immersive session without stopping it. */
    close: string;
    rowPaused: string;
    rowDone: string;
    openSession: string;
  };
  progress: {
    /** The small label above the board's title. It names the screen, so it
     * cannot repeat or contradict the title under it. */
    eyebrow: string;
    /** The board's own title. Deliberately steady: a headline that changes with
     * the numbers turns the screen into a scoreboard that shouts. */
    boardTitle: string;
    /** Says out loud that none of this leaves the phone. */
    privacyHint: string;
    balanceLabel: string;
    open: string;
    closed: string;
    /** Read out for the ring, which draws a share no screen reader can see. */
    balanceSummary: (open: number, closed: number) => string;
    sevenDays: string;
    closedInWeek: (closed: number) => string;
    weekSummary: (closed: number) => string;
    patterns: string;
    bestWeekday: string;
    /** Neutral, never a reproach: nothing closed yet is not a failure. */
    noPatternYet: string;
    bestWeekdaySummary: (weekday: string, closed: number) => string;
    activeProjects: string;
    activeProjectsOf: (total: number) => string;
    projectsSummary: (active: number, total: number) => string;
    /** Level and streak together, in one quiet line at the bottom. */
    footnote: (level: number, streakDays: number) => string;
    weekdays: readonly string[];
    /** Full weekday names, Sunday first, for the best-day line. */
    weekdayNames: readonly string[];
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
    replayOnboarding: string;
    replayOnboardingHint: string;
  };
  /** Notifications about what other people do in a shared project. */
  projectActivity: {
    settingsLabel: string;
    settingsToggle: string;
    settingsHint: string;
    /** What the section says while the switch is off: what it would do, not
     * what it is doing. */
    settingsHintOff: string;
    /** The switch is on, and the system is the one holding the alerts back. */
    blockedNote: string;
    blockedAction: string;
    promptBody: string;
    promptEnable: string;
    promptDismiss: string;
  };
  onboarding: {
    steps: readonly { title: string; body: string; example: string }[];
    next: string;
    start: string;
    skip: string;
    /** Announced on the scene, so the position in the walk-through is spoken
     * instead of being only a row of dots. */
    stepPosition: (step: number, total: number) => string;
    /** The last step asks for the one thing the app cannot do alone: somebody
     * else in the same space. Both answers close the walk-through. */
    invite: { action: string; later: string };
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
  tabs: { today: 'Tarefas', lists: 'Espaços', you: 'Você' },
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
      list: 'Espaço',
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
    editHint:
      'Aqui o texto vale como está escrito. Data, prioridade e lista mudam só nas fichas.',
    moreOptions: 'Mais opções',
    lessOptions: 'Menos opções',
    syntaxTitle: 'Atalhos de escrita',
    syntaxHelp:
      'Nada disso é obrigatório: as fichas fazem o mesmo com um toque.',
    noList: 'sem espaço',
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
    reminder: {
      label: 'Aviso antes do prazo',
      off: 'sem aviso',
      on: days =>
        days === 1 ? 'aviso 1 dia antes' : `aviso ${days} dias antes`,
      noReminder: 'Não avisar',
      // Impresso no chip: o substantivo fica, senão "2 dias" some no meio da
      // faixa entre "5/9" e "prioridade média" sem dizer do que se trata.
      daysBefore: days =>
        days === 1 ? 'Aviso · 1 dia' : `Aviso · ${days} dias`,
      noLeadTime: 'sem antecedência',
      tooLateHint: 'Sem antecedência possível para este prazo.',
      blockedHint: 'Notificações desativadas no sistema.',
      openSettings: 'Abrir ajustes',
    },
  },
  subtasks: {
    title: 'Subtarefas',
    item: title => `Subtarefa: ${title}`,
    progress: (done, total) => `${done} de ${total} subtarefas`,
    count: total => `${total} subtarefas`,
    addPlaceholder: 'Nova subtarefa',
    add: 'Adicionar subtarefa',
    rename: title => `Renomear subtarefa: ${title}`,
    remove: title => `Excluir subtarefa: ${title}`,
    allDone: 'Todas as subtarefas concluídas.',
    limitReached: limit => `Limite de ${limit} subtarefas por tarefa.`,
  },
  lists: {
    title: 'Onde os\nplanos andam.',
    subtitle: (lists, tasks) =>
      `${lists} ${lists === 1 ? 'espaço' : 'espaços'} · ${tasks} ${
        tasks === 1 ? 'aberta' : 'abertas'
      }`,
    empty: 'Nenhuma tarefa neste espaço.',
    progress: (done, total) => `${done}/${total}`,
    addToDay: 'Levar para hoje',
    inDay: 'No dia',
    newList: 'Novo espaço',
    templatesSubtitle: 'Comece de um destes ou do zero.',
    templates: {
      home: { name: 'Casa', description: 'Consertos e combinados' },
      trip: { name: 'Viagem', description: 'Reservas, malas, roteiro' },
      bills: { name: 'Contas', description: 'O que vence e quando' },
      market: { name: 'Mercado', description: 'A lista da semana' },
      work: { name: 'Trabalho', description: 'Entregas e responsáveis' },
      blank: { name: 'Em branco', description: 'Só o nome' },
    },
    renameList: 'Editar espaço',
    create: 'Criar',
    namePlaceholder: 'Nome do espaço',
    nameHint: 'Reúna os próximos passos de algo maior.',
    duplicateName: 'Esse espaço já existe. Escolha outro nome.',
    sharedProject: 'Espaço compartilhado',
    sharedProjectHint: 'Ao salvar, criamos o link de convite.',
    addFirstTask: 'Adicionar primeira tarefa',
    addTask: 'Adicionar tarefa',
    rename: 'Editar',
    moreActions: name => `Mais ações: ${name}`,
    expandProject: name => `Abrir espaço ${name}`,
    collapseProject: name => `Fechar espaço ${name}`,
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
    shareHint:
      'Convide quem divide isso com você. Quem abrir o link entra no espaço.',
    createLink: 'Criar link',
    copyLink: 'Copiar',
    copyLinkAccessible: 'Copiar link do espaço',
    linkCopied: 'Link copiado',
    linkNotPublished: 'Link ainda não publicado.',
    readOnlyTag: 'Somente leitura',
    actionsFor: name => `Ações de ${name}`,
    invite: 'Convidar',
    invitedAsLabel: 'Quem entrar pode',
    roleViewer: 'Ver',
    roleEditor: 'Editar',
    roleOwner: 'dono',
    roleChangeNote: 'Vale para quem entrar depois, não para quem já entrou.',
    membersHeader: 'No espaço',
    joinHistoryHeader: 'Entradas',
    joinedAtUnknown: '—',
    joinHistoryTruncated: (shown, total) =>
      `Mostrando as ${shown} entradas mais recentes de ${total}.`,
    joinedAtAccessible: (name, when) => `${name} entrou em ${when}`,
    joinedAtUnknownAccessible: name => `${name}, sem data de entrada`,
    pendingInvite: 'convite pendente',
    memberYou: 'Você',
    memberYouInitials: 'VC',
    memberSomeone: 'Pessoa do espaço',
    removeMemberLabel: 'Remover',
    removeMember: name => `Remover ${name} do espaço`,
    removeMemberConfirm: name => `Remover ${name} do espaço?`,
    stopSharing: 'Parar de compartilhar',
    stopSharingConfirm:
      'Ninguém mais vai poder entrar; quem já está sai também.',
    sharedWith: count => (count === 1 ? '1 pessoa' : `${count} pessoas`),
    assignSectionTitle: 'Pessoas',
    joinTask: 'Entrar na tarefa',
    leaveTask: 'Sair da tarefa',
    assignedTo: count =>
      count === 1 ? '1 pessoa na tarefa' : `${count} pessoas na tarefa`,
    assignPerson: name => `Colocar ${name} na tarefa`,
    unassignPerson: name => `Tirar ${name} da tarefa`,
    assignedAnnouncement: name => `${name} entrou na tarefa`,
    unassignedAnnouncement: name => `${name} saiu da tarefa`,
    dayBandTitle: 'Hoje, no combinado',
    dayBandEmpty: 'Ninguém levou nada para hoje ainda.',
    dayBandEmptyHint:
      'Cada um leva poucas tarefas para o dia. Aqui vocês veem o combinado de todo mundo.',
    dayBandTakeOne: 'Levar uma para hoje',
    dayBandAllDone: count =>
      count === 1 ? 'Uma pessoa fechou hoje' : `Os ${count} fecharam hoje`,
    dayBandStreak: days =>
      days === 1
        ? '1 dia seguido em que todo mundo fechou o que levou.'
        : `${days} dias seguidos em que todo mundo fechou o que levou.`,
    dayBandOffline:
      'Sem conexão agora — mostrando o que já estava no aparelho.',
    dayBandError: 'Não deu para carregar o combinado de hoje.',
    dayBandRetry: 'Tentar de novo',
    dayBandRetrying: 'Tentando…',
    dayBandRetryFailed: 'Ainda não deu — tentar de novo',
    dayBandAbsent: 'Ainda não levou nada',
    dayBandStateFocusing: 'em foco',
    dayBandStateOpen: 'em aberto',
    dayBandStateDone: 'concluída',
    joinInvite: 'Entrar com convite',
    joinInviteTitle: 'Entrar em um espaço',
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
    leaveProject: 'Sair do espaço',
    leaveProjectConfirm: name =>
      `Sair de “${name}”? Você deixa de ver as tarefas dele.`,
    deleteSharedDetail:
      'Isso apaga o espaço para todo mundo, não só para você. Ninguém recupera as tarefas depois.',
    completedBy: name => `Concluída por ${name}`,
    groupEmpty: 'Um espaço vazio, pronto para o que vocês combinarem.',
    groupEmptyInvite: 'Convide alguém e comecem juntos.',
    groupAllDone: 'Tudo feito por aqui.',
    viewerCannotAdd: 'Você só pode ver este espaço.',
  },
  focus: {
    title: 'Foco',
    idle: 'Escolha uma para começar',
    idleEmpty: 'Nada aberto no dia. Feche o app e vá viver.',
    idleHint: 'Escolha o tempo que você acha que vai levar.',
    idleScope: 'Aqui ficam as tarefas do dia. Para outra, abra ela na lista.',
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
    action: 'Focar',
    close: 'Voltar',
    rowPaused: 'Pausado',
    rowDone: 'Tempo cumprido',
    openSession: 'Abrir sessão de foco',
  },
  progress: {
    eyebrow: 'Progresso',
    boardTitle: 'Seu placar',
    privacyHint: 'Só neste aparelho',
    balanceLabel: 'Equilíbrio',
    open: 'Abertas',
    closed: 'Fechadas',
    balanceSummary: (open, closed) =>
      `${open} ${open === 1 ? 'aberta' : 'abertas'}, ${closed} ${
        closed === 1 ? 'fechada' : 'fechadas'
      }`,
    sevenDays: '7 dias',
    closedInWeek: closed =>
      closed === 1
        ? 'fechada nos últimos 7 dias'
        : 'fechadas nos últimos 7 dias',
    weekSummary: closed =>
      closed === 1
        ? '1 tarefa fechada nos últimos 7 dias'
        : `${closed} tarefas fechadas nos últimos 7 dias`,
    patterns: 'Padrões',
    bestWeekday: 'Melhor dia',
    noPatternYet: 'Ainda sem dados',
    bestWeekdaySummary: (weekday, closed) =>
      closed === 1
        ? `Melhor dia: ${weekday}, com 1 fechada`
        : `Melhor dia: ${weekday}, com ${closed} fechadas`,
    activeProjects: 'Espaços ativos',
    activeProjectsOf: total =>
      total === 1 ? 'de 1 espaço' : `de ${total} espaços`,
    projectsSummary: (active, total) =>
      active === 1
        ? `1 espaço ativo de ${total}`
        : `${active} espaços ativos de ${total}`,
    footnote: (level, streakDays) =>
      streakDays === 0
        ? `Nível ${level}`
        : streakDays === 1
        ? `Nível ${level} · 1 dia seguido`
        : `Nível ${level} · ${streakDays} dias seguidos`,
    weekdays: ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'],
    weekdayNames: [
      'domingo',
      'segunda',
      'terça',
      'quarta',
      'quinta',
      'sexta',
      'sábado',
    ],
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
    replayOnboarding: 'Ver a apresentação de novo',
    replayOnboardingHint:
      'Abre a apresentação inteira, do começo. Nada muda nas suas tarefas.',
  },
  projectActivity: {
    settingsLabel: 'Notificações do espaço',
    settingsToggle: 'Avisar sobre espaços compartilhados',
    settingsHint:
      'Avisa quando alguém do espaço conclui uma tarefa ou entra. Com o app fechado, o aviso pode levar alguns minutos.',
    settingsHintOff:
      'Ligado, avisa quando alguém do espaço conclui uma tarefa ou entra.',
    blockedNote: 'Avisos bloqueados nos ajustes do sistema',
    blockedAction: 'Abrir ajustes',
    promptBody:
      'Quer saber quando alguém do espaço concluir uma tarefa ou entrar?',
    promptEnable: 'Ativar avisos',
    promptDismiss: 'Agora não',
  },
  onboarding: {
    steps: [
      {
        title: 'Anotar leva segundos',
        body: 'Toque em Nova tarefa, escreva e ajuste data, prioridade e espaço na mesma folha.',
        example: 'Ex.: “Renovar o seguro”, amanhã, no espaço Casa nova.',
      },
      {
        title: 'Espaços que você divide',
        body: 'Abra um espaço compartilhado, envie o convite e acompanhe o combinado do dia no mesmo lugar.',
        example: 'Ex.: “Casa nova”, com o link de convite pronto.',
      },
      {
        title: 'Convide quem divide a rotina',
        body: 'Um espaço compartilhado guarda o combinado de vocês: par, família, casa, amigos. Quem entra vê o mesmo dia.',
        example: 'Ex.: “Casa”, com o link pronto.',
      },
    ],
    next: 'Continuar',
    start: 'Começar',
    skip: 'Pular',
    stepPosition: (step, total) => `Passo ${step} de ${total}`,
    invite: { action: 'Convidar alguém', later: 'Agora não' },
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
  tabs: { today: 'Tasks', lists: 'Spaces', you: 'You' },
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
      list: 'Space',
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
    editHint:
      'Here the text is kept as written. Date, priority and list change only through the chips.',
    moreOptions: 'More options',
    lessOptions: 'Fewer options',
    syntaxTitle: 'Writing shortcuts',
    syntaxHelp: 'None of this is required: the chips do the same with one tap.',
    noList: 'no space',
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
    reminder: {
      label: 'Reminder before the due date',
      off: 'no reminder',
      on: days =>
        days === 1 ? 'reminder 1 day before' : `reminder ${days} days before`,
      noReminder: 'No reminder',
      daysBefore: days =>
        days === 1 ? 'Reminder · 1 day' : `Reminder · ${days} days`,
      noLeadTime: 'no lead time',
      tooLateHint: 'No lead time available for this due date.',
      blockedHint: 'Notifications are turned off in the system.',
      openSettings: 'Open settings',
    },
  },
  subtasks: {
    title: 'Subtasks',
    item: title => `Subtask: ${title}`,
    progress: (done, total) => `${done} of ${total} subtasks`,
    count: total => `${total} subtasks`,
    addPlaceholder: 'New subtask',
    add: 'Add subtask',
    rename: title => `Rename subtask: ${title}`,
    remove: title => `Delete subtask: ${title}`,
    allDone: 'All subtasks done.',
    limitReached: limit => `Limit of ${limit} subtasks per task.`,
  },
  lists: {
    title: 'Where plans\nmove forward.',
    subtitle: (lists, tasks) =>
      `${lists} ${lists === 1 ? 'space' : 'spaces'} · ${tasks} open`,
    empty: 'No tasks in this space.',
    progress: (done, total) => `${done}/${total}`,
    addToDay: 'Move into today',
    inDay: 'In the day',
    newList: 'New space',
    templatesSubtitle: 'Start from one of these, or from scratch.',
    templates: {
      home: { name: 'Home', description: 'Repairs and agreements' },
      trip: { name: 'Trip', description: 'Bookings, packing, itinerary' },
      bills: { name: 'Bills', description: 'What is due and when' },
      market: { name: 'Groceries', description: 'This week’s list' },
      work: { name: 'Work', description: 'Deliverables and owners' },
      blank: { name: 'Blank', description: 'Just the name' },
    },
    renameList: 'Edit space',
    create: 'Create',
    namePlaceholder: 'Space name',
    nameHint: 'Gather the next steps of something larger.',
    duplicateName: 'That space already exists. Choose another name.',
    sharedProject: 'Shared space',
    sharedProjectHint: 'Saving creates the invite link.',
    addFirstTask: 'Add first task',
    addTask: 'Add task',
    rename: 'Edit',
    moreActions: name => `More actions: ${name}`,
    expandProject: name => `Open space ${name}`,
    collapseProject: name => `Close space ${name}`,
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
    shareHint:
      'Invite whoever shares this with you. Whoever opens the link joins the space.',
    createLink: 'Create link',
    copyLink: 'Copy',
    copyLinkAccessible: 'Copy the space link',
    linkCopied: 'Link copied',
    linkNotPublished: 'Link not published yet.',
    readOnlyTag: 'Read only',
    actionsFor: name => `${name} actions`,
    invite: 'Invite',
    invitedAsLabel: 'Whoever joins can',
    roleViewer: 'View',
    roleEditor: 'Edit',
    roleOwner: 'owner',
    roleChangeNote: 'Applies to whoever joins next, not to who is already in.',
    membersHeader: 'In the space',
    joinHistoryHeader: 'Joined',
    joinedAtUnknown: '—',
    joinHistoryTruncated: (shown, total) =>
      `Showing the ${shown} most recent of ${total}.`,
    joinedAtAccessible: (name, when) => `${name} joined on ${when}`,
    joinedAtUnknownAccessible: name => `${name}, no join date recorded`,
    pendingInvite: 'invite pending',
    memberYou: 'You',
    memberYouInitials: 'YO',
    memberSomeone: 'Someone in this space',
    removeMemberLabel: 'Remove',
    removeMember: name => `Remove ${name} from the space`,
    removeMemberConfirm: name => `Remove ${name} from the space?`,
    stopSharing: 'Stop sharing',
    stopSharingConfirm:
      'Nobody else can join; whoever is already in leaves too.',
    sharedWith: count => (count === 1 ? '1 person' : `${count} people`),
    assignSectionTitle: 'People',
    joinTask: 'Join this task',
    leaveTask: 'Leave this task',
    assignedTo: count =>
      count === 1 ? '1 person on this task' : `${count} people on this task`,
    assignPerson: name => `Put ${name} on this task`,
    unassignPerson: name => `Take ${name} off this task`,
    assignedAnnouncement: name => `${name} joined the task`,
    unassignedAnnouncement: name => `${name} left the task`,
    dayBandTitle: 'Today, together',
    dayBandEmpty: 'Nobody took anything for today yet.',
    dayBandEmptyHint:
      'Each person takes a few tasks for the day. Here you see what everyone took.',
    dayBandTakeOne: 'Take one for today',
    dayBandAllDone: count =>
      count === 1 ? 'One person closed today' : `All ${count} closed today`,
    dayBandStreak: days =>
      days === 1
        ? '1 day in a row where everybody closed what they took.'
        : `${days} days in a row where everybody closed what they took.`,
    dayBandOffline:
      'No connection right now — showing what was already on the phone.',
    dayBandError: "Could not load today's plan.",
    dayBandRetry: 'Try again',
    dayBandRetrying: 'Trying…',
    dayBandRetryFailed: 'Still no luck — try again',
    dayBandAbsent: 'Has not taken anything yet',
    dayBandStateFocusing: 'in focus',
    dayBandStateOpen: 'open',
    dayBandStateDone: 'done',
    joinInvite: 'Join with invite',
    joinInviteTitle: 'Join a space',
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
    leaveProject: 'Leave space',
    leaveProjectConfirm: name => `Leave “${name}”? You stop seeing its tasks.`,
    deleteSharedDetail:
      'This deletes the space for everyone, not just you. Nobody gets the tasks back after.',
    completedBy: name => `Completed by ${name}`,
    groupEmpty: 'An empty space, ready for whatever you set up together.',
    groupEmptyInvite: 'Invite someone and start together.',
    groupAllDone: 'All done here.',
    viewerCannotAdd: 'You can only view this space.',
  },
  focus: {
    title: 'Focus',
    idle: 'Pick one to start',
    idleEmpty: 'Nothing open today. Close the app and go live.',
    idleHint: 'Pick how long you think it will take.',
    idleScope:
      "Today's tasks are listed here. For another one, open it in the list.",
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
    action: 'Focus',
    close: 'Back',
    rowPaused: 'Paused',
    rowDone: 'Time served',
    openSession: 'Open focus session',
  },
  progress: {
    eyebrow: 'Progress',
    boardTitle: 'Your board',
    privacyHint: 'Stays on this phone',
    balanceLabel: 'Balance',
    open: 'Open',
    closed: 'Closed',
    balanceSummary: (open, closed) => `${open} open, ${closed} closed`,
    sevenDays: '7 days',
    closedInWeek: () => 'closed in the last 7 days',
    weekSummary: closed =>
      closed === 1
        ? '1 task closed in the last 7 days'
        : `${closed} tasks closed in the last 7 days`,
    patterns: 'Patterns',
    bestWeekday: 'Best day',
    noPatternYet: 'No data yet',
    bestWeekdaySummary: (weekday, closed) =>
      closed === 1
        ? `Best day: ${weekday}, with 1 closed`
        : `Best day: ${weekday}, with ${closed} closed`,
    activeProjects: 'Active spaces',
    activeProjectsOf: total =>
      total === 1 ? 'of 1 space' : `of ${total} spaces`,
    projectsSummary: (active, total) =>
      active === 1
        ? `1 active space of ${total}`
        : `${active} active spaces of ${total}`,
    footnote: (level, streakDays) =>
      streakDays === 0
        ? `Level ${level}`
        : streakDays === 1
        ? `Level ${level} · 1 day in a row`
        : `Level ${level} · ${streakDays} days in a row`,
    weekdays: ['S', 'M', 'T', 'W', 'T', 'F', 'S'],
    weekdayNames: [
      'Sunday',
      'Monday',
      'Tuesday',
      'Wednesday',
      'Thursday',
      'Friday',
      'Saturday',
    ],
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
    replayOnboarding: 'See the walk-through again',
    replayOnboardingHint:
      'Opens the whole walk-through, from the start. Nothing changes in your tasks.',
  },
  projectActivity: {
    settingsLabel: 'Space notifications',
    settingsToggle: 'Tell me about shared spaces',
    settingsHint:
      'Says when someone in the space completes a task or joins. With the app closed, the alert may take a few minutes.',
    settingsHintOff:
      'When on, it tells you when someone in the space completes a task or joins.',
    blockedNote: 'Alerts are off in system settings',
    blockedAction: 'Open settings',
    promptBody:
      'Want to hear when someone in the space completes a task or joins?',
    promptEnable: 'Turn on alerts',
    promptDismiss: 'Not now',
  },
  onboarding: {
    steps: [
      {
        title: 'Capture takes seconds',
        body: 'Tap New task, type it, then set date, priority and space in the same sheet.',
        example:
          'Like “Renew the insurance”, tomorrow, in the New place space.',
      },
      {
        title: 'Spaces you share',
        body: 'Open a shared space, send the invite and follow the day’s agreement in one place.',
        example: 'Like “New place”, with the invite link ready.',
      },
      {
        title: 'Invite whoever shares your routine',
        body: 'A shared space holds what you agreed on: the two of you, family, housemates, friends. Whoever joins sees the same day.',
        example: 'Like “Home”, with the link ready.',
      },
    ],
    next: 'Continue',
    start: 'Start',
    skip: 'Skip',
    stepPosition: (step, total) => `Step ${step} of ${total}`,
    invite: { action: 'Invite someone', later: 'Not now' },
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
import type { ProjectTemplateId } from '../models/projectTemplates';
