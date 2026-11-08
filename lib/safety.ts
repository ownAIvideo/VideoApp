// Filtru rapid înainte de apelul către Claude. Nu e suficient singur —
// Claude face verificarea principală, iar furnizorul video are propriul filtru.
const BLOCKED = [
  /\bnud(a|ă|e|itate)?\b/i, /\bnaked\b/i, /\bnude\b/i, /\bsex/i, /\bporn/i, /\bxxx\b/i,
  /\berotic/i, /\bdezbr[aă]ca/i, /\bundress/i, /\blenjerie\b/i, /\blingerie\b/i,
  /\bminor/i, /\bcopil/i, /\bchild/i, /\bteen/i, /\bunderage/i,
];

export function quickScreen(text: string): string | null {
  for (const re of BLOCKED) if (re.test(text)) return "Descrierea conține conținut nepermis (sexual, nuditate sau minori).";
  return null;
}
