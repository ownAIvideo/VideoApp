export type Template = {
  id: string;
  title: string;
  emoji: string;
  description: string;
  style: string;      // indicații vizuale trimise generatorului
  duo: boolean;       // permite a doua persoană (doar cu consimțământul ei)
  proOnly?: boolean;
};

export const TEMPLATES: Template[] = [
  { id: "travel", emoji: "✈️", title: "Vlog de călătorie", duo: true,
    description: "Tu (și partenerul) într-o destinație de vis.",
    style: "cinematic travel vlog, golden hour, handheld camera, vibrant colors" },
  { id: "dance", emoji: "💃", title: "Dans romantic", duo: true,
    description: "Un vals sau un dans lent într-un decor elegant.",
    style: "elegant ballroom, soft warm lighting, slow motion, film grain" },
  { id: "dinner", emoji: "🕯️", title: "Cină la lumânare", duo: true,
    description: "O seară romantică — doar priviri, zâmbete și toasturi.",
    style: "candlelit restaurant, bokeh, intimate but tasteful, 35mm look" },
  { id: "hero", emoji: "🦸", title: "Supererou", duo: false,
    description: "Intrare epică, costum și efecte speciale.",
    style: "epic superhero movie shot, dramatic lighting, VFX, low angle" },
  { id: "fairytale", emoji: "🏰", title: "Basm", duo: true,
    description: "Prinț/prințesă într-un castel fermecat.",
    style: "fantasy fairytale, magical particles, castle, painterly" },
  { id: "music", emoji: "🎤", title: "Videoclip muzical", duo: false, proOnly: true,
    description: "Pe scenă, cu lumini și public.",
    style: "music video, concert stage lights, smoke, dynamic cuts" },
  { id: "scifi", emoji: "🚀", title: "Sci-fi", duo: true, proOnly: true,
    description: "Pilot de navă spațială pe o planetă necunoscută.",
    style: "sci-fi blockbuster, neon, spaceship cockpit, anamorphic lens" },
];

export const templateById = (id: string) => TEMPLATES.find((t) => t.id === id);
