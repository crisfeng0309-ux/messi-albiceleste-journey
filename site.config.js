/**
 * Site-level configuration.
 * Kept separate from year data so the timeline can be re-themed or re-hosted
 * without touching content.
 */
export const SITE = {
  title: 'MESSI · THE ALBICELESTE JOURNEY',
  subtitle: '2005 — 2026',
  description:
    "A visual journey through Lionel Messi's Argentina national team career.",
  /**
   * The hero is the museum's first wall. It uses the 2014 World Cup final
   * photograph — the moment the whole story turns on.
   */
  heroPhoto: 'assets/photos/2014.jpg',
  /** Absolute or root-relative URL used for the social preview card. */
  ogImage: 'assets/og-cover.jpg',
  baseUrl: 'https://messi-albiceleste-journey.vercel.app/',
};

/** The date the editorial numbers were last reconciled against published records. */
export const DATA_AS_OF = '2026-10-07';

export const EPILOGUE = {
  kicker: 'THE FINAL CHAPTER',
  span: '2005 — 2026',
  journey: 'THE ALBICELESTE JOURNEY',
  gracias: 'Gracias, Leo.',
};
