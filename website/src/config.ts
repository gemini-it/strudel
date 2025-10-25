export const SITE = {
  title: 'Strudel',
  description: 'Strudel is a music live coding editor that brings TidalCycles to the browser.',
  defaultLanguage: 'en',
};

export const OPEN_GRAPH = {
  image: {
    src: 'https://strudel.cc/icon.png',
    alt: 'Strudel Logo',
  },
};

// This is the type of the frontmatter you put in the docs markdown files.
export type Frontmatter = {
  title: string;
  description: string;
  layout: string;
  image?: { src: string; alt: string };
  dir?: 'ltr' | 'rtl';
  ogLocale?: string;
  lang?: string;
};

export const KNOWN_LANGUAGES = {
  English: 'en',
  German: 'de',
  French: 'fr',
} as const;
export const KNOWN_LANGUAGE_CODES = Object.values(KNOWN_LANGUAGES);

export const GITHUB_EDIT_URL = `https://codeberg.org/uzu/strudel/src/branch/main/website`;

export const COMMUNITY_INVITE_URL = `https://discord.com/invite/HGEdXmRkzT`;

// See "Algolia" section of the README for more information.
export const ALGOLIA = {
  indexName: 'strudel-tidalcycles',
  appId: 'SAZ71S8CLS',
  apiKey: 'd5044f9d21b80e7721e5b0067a8730b1',
};

export type SidebarLang = Record<string, { text: string; link: string }[]>;
export type Sidebar = Record<(typeof KNOWN_LANGUAGE_CODES)[number], SidebarLang>;
export const SIDEBAR: Sidebar = {
  fr: {
    Présentation: [
      { text: 'Qu\'est-ce que Strudel ?', link: 'workshop/getting-started' },
      { text: 'Vitrine', link: 'intro/showcase' },
      { text: 'Blog', link: 'blog' },
    ],
    Atelier: [
      { text: 'Premiers Sons', link: 'workshop/first-sounds' },
      { text: 'Premières Notes', link: 'workshop/first-notes' },
      { text: 'Premiers Effets', link: 'workshop/first-effects' },
      { text: 'Effets de Pattern', link: 'workshop/pattern-effects' },
      { text: 'Récapitulatif', link: 'workshop/recap' },
      { text: 'Atelier en Allemand', link: 'de/workshop/getting-started' },
    ],
    'Produire du Son': [
      { text: 'Samples', link: 'learn/samples' },
      { text: 'Synthétiseurs', link: 'learn/synths' },
      { text: 'Effets Audio', link: 'learn/effects' },
      { text: 'MIDI & OSC', link: 'learn/input-output' },
    ],
    Plus: [
      { text: 'Recettes', link: 'recipes/recipes' },
      { text: 'Mini-Notation', link: 'learn/mini-notation' },
      { text: 'Retour Visuel', link: 'learn/visual-feedback' },
      { text: 'Hors-ligne', link: 'learn/pwa' },
      { text: 'Patterns', link: 'technical-manual/patterns' },
      { text: 'Notation Mondo', link: 'learn/mondo-notation' },
      { text: 'Métadonnées Musicales', link: 'learn/metadata' },
      { text: 'CSound', link: 'learn/csound' },
      { text: 'Hydra', link: 'learn/hydra' },
      { text: 'Périphériques d\'Entrée', link: 'learn/input-devices' },
      { text: 'Mouvement de l\'Appareil', link: 'learn/devicemotion' },
    ],
    'Fonctions de Pattern': [
      { text: 'Introduction', link: 'functions/intro' },
      { text: 'Créer des Patterns', link: 'learn/factories' },
      { text: 'Modificateurs Temporels', link: 'learn/time-modifiers' },
      { text: 'Paramètres de Contrôle', link: 'functions/value-modifiers' },
      { text: 'Signaux', link: 'learn/signals' },
      { text: 'Modificateurs Aléatoires', link: 'learn/random-modifiers' },
      { text: 'Modificateurs Conditionnels', link: 'learn/conditional-modifiers' },
      { text: 'Accumulation', link: 'learn/accumulation' },
      { text: 'Fonctions Tonales', link: 'learn/tonal' },
      { text: 'Fonctions Graduelles', link: 'learn/stepwise' },
    ],
    Comprendre: [
      { text: 'Syntaxe de Codage', link: 'learn/code' },
      { text: 'Hauteur', link: 'understand/pitch' },
      { text: 'Fonctions Harmoniques Xen', link: 'learn/xen' },
      { text: 'Cycles', link: 'understand/cycles' },
      { text: 'Voicings', link: 'understand/voicings' },
      { text: 'Alignement des Patterns', link: 'technical-manual/alignment' },
      { text: 'Strudel vs Tidal', link: 'learn/strudel-vs-tidal' },
    ],
    Développement: [
      { text: 'Strudel dans votre Projet', link: 'technical-manual/project-start' },
      { text: 'Packages', link: 'technical-manual/packages' },
      { text: 'REPL', link: 'technical-manual/repl' },
      { text: 'Sons', link: 'technical-manual/sounds' },
      { text: 'Documentation', link: 'technical-manual/docs' },
      { text: 'Tests', link: 'technical-manual/testing' },
    ],
  },
  de: {
    Workshop: [
      { text: 'Intro', link: 'de/workshop/getting-started' },
      { text: 'Erste Sounds', link: 'de/workshop/first-sounds' },
      { text: 'Erste Töne', link: 'de/workshop/first-notes' },
      { text: 'Erste Effekte', link: 'de/workshop/first-effects' },
      { text: 'Pattern Effekte', link: 'de/workshop/pattern-effects' },
      { text: 'Rückblick', link: 'de/workshop/recap' },
      { text: 'Mehr Seiten auf Englisch', link: 'workshop/getting-started' },
    ],
  },
  en: {
    Presentation: [
      { text: 'What is Strudel?', link: 'workshop/getting-started' },
      { text: 'Showcase', link: 'intro/showcase' },
      { text: 'Blog', link: 'blog' },
      /* { text: 'Community Bakery', link: 'bakery' }, */
    ],
    Workshop: [
      // { text: 'Getting Started', link: 'workshop/getting-started' },
      { text: 'First Sounds', link: 'workshop/first-sounds' },
      { text: 'First Notes', link: 'workshop/first-notes' },
      { text: 'First Effects', link: 'workshop/first-effects' },
      { text: 'Pattern Effects', link: 'workshop/pattern-effects' },
      { text: 'Recap', link: 'workshop/recap' },
      { text: 'Workshop in German', link: 'de/workshop/getting-started' },
    ],
    'Making Sound': [
      { text: 'Samples', link: 'learn/samples' },
      { text: 'Synths', link: 'learn/synths' },
      { text: 'Audio Effects', link: 'learn/effects' },
      { text: 'MIDI & OSC', link: 'learn/input-output' },
    ],
    More: [
      { text: 'Recipes', link: 'recipes/recipes' },
      { text: 'Mini-Notation', link: 'learn/mini-notation' },
      { text: 'Visual Feedback', link: 'learn/visual-feedback' },
      { text: 'Offline', link: 'learn/pwa' },
      { text: 'Patterns', link: 'technical-manual/patterns' },
      { text: 'Mondo Notation', link: 'learn/mondo-notation' },
      { text: 'Music metadata', link: 'learn/metadata' },
      { text: 'CSound', link: 'learn/csound' },
      { text: 'Hydra', link: 'learn/hydra' },
      { text: 'Input Devices', link: 'learn/input-devices' },
      { text: 'Device Motion', link: 'learn/devicemotion' },
    ],
    'Pattern Functions': [
      { text: 'Introduction', link: 'functions/intro' },
      { text: 'Creating Patterns', link: 'learn/factories' },
      { text: 'Time Modifiers', link: 'learn/time-modifiers' },
      { text: 'Control Parameters', link: 'functions/value-modifiers' },
      { text: 'Signals', link: 'learn/signals' },
      { text: 'Random Modifiers', link: 'learn/random-modifiers' },
      { text: 'Conditional Modifiers', link: 'learn/conditional-modifiers' },
      { text: 'Accumulation', link: 'learn/accumulation' },
      { text: 'Tonal Functions', link: 'learn/tonal' },
      { text: 'Stepwise Functions', link: 'learn/stepwise' },
    ],
    Understand: [
      { text: 'Coding syntax', link: 'learn/code' },
      { text: 'Pitch', link: 'understand/pitch' },
      { text: 'Xen Harmonic Functions', link: 'learn/xen' },
      { text: 'Cycles', link: 'understand/cycles' },
      { text: 'Voicings', link: 'understand/voicings' },
      { text: 'Pattern Alignment', link: 'technical-manual/alignment' },
      { text: 'Strudel vs Tidal', link: 'learn/strudel-vs-tidal' },
    ],
    Development: [
      { text: 'Strudel in your Project', link: 'technical-manual/project-start' },
      { text: 'Packages', link: 'technical-manual/packages' },
      { text: 'REPL', link: 'technical-manual/repl' },
      { text: 'Sounds', link: 'technical-manual/sounds' },
      { text: 'Docs', link: 'technical-manual/docs' },
      { text: 'Testing', link: 'technical-manual/testing' },
      // { text: 'Internals', link: 'technical-manual/internals' },
    ],
  },
};
