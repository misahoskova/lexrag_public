export const LAWS: Record<string, { id: number; name: string }> = {
  DPH: { id: 1, name: 'Zákon o dani z přidané hodnoty' },
  DR: { id: 2, name: 'Zákon daňový řád' },
  DNV: { id: 3, name: 'Zákon České národní rady o dani z nemovitých věcí' },
  U: { id: 4, name: 'Zákon o účetnictví' },
  DP: { id: 5, name: 'Zákon České národní rady o daních z příjmů' },
  SP: {
    id: 6,
    name: 'Zákon České národní rady o pojistném na sociální zabezpečení a příspěvku na státní politiku zaměstnanosti',
  },
};

export function getLaw(otazkaId: string): { id: number; name: string } | undefined {
  const prefix = otazkaId.replace(/-\d+$/, '');
  return LAWS[prefix];
}
