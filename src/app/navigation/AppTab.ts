export const appTabs = ['today', 'lists', 'focus', 'you'] as const;

export type AppTab = (typeof appTabs)[number];
