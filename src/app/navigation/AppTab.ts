export const appTabs = ['today', 'lists', 'you'] as const;

export type AppTab = (typeof appTabs)[number];
