// Grupos de personajes. Cada personaje indica los suyos en `groups: ['lps', 'quinta']`
// (uno o varios). Sin el campo, aparece en todos.
export const GROUPS = [
  { id: 'lps', name: 'LPS', color: '#7df9ff' },
  { id: 'quinta', name: 'LA QUINTA DEL BUITRE', color: '#ff9f45' },
];

export const groupsOf = (cfg) => (cfg.groups ? GROUPS.filter((g) => cfg.groups.includes(g.id)) : GROUPS);

/** Insignias HTML con los grupos del personaje. */
export const groupBadges = (cfg) =>
  groupsOf(cfg).map((g) => `<span class="badge" style="--gc:${g.color}">${g.name}</span>`).join('');
