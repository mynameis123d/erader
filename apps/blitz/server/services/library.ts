import type { ViralReference } from "../../shared/types.js";

// Built-in library of proven short-form formats. These are format templates
// (structure + hook pattern), not copies of specific posts, so they carry no
// engagement numbers. Import real posts via POST /api/references to show their
// stats in the "Remixed From" panel.
const t = (r: Omit<ViralReference, "isTemplate" | "platform"> & { platform?: ViralReference["platform"] }): ViralReference => ({
  platform: "tiktok",
  isTemplate: true,
  ...r,
});

export const BUILTIN_REFERENCES: ViralReference[] = [
  t({
    id: "lessons-too-late",
    format: "slideshow",
    hook: "Things you learn too late about people",
    slides: [
      "Things you learn too late about people",
      "The ones who listen talk the least",
      "Consistency beats intensity",
      "Most people are too busy thinking about themselves to judge you",
      "Your energy tells people how to treat you",
      "Silence is a complete answer",
      "Who claps when you win says everything",
      "Save this for when you need it",
    ],
    structure: "Hook slide, then one short life lesson per slide, ending on a save CTA.",
    whyItWorks:
      "List-of-lessons slideshows earn saves and rewatches: each slide is a small payoff, and the hook promises insight the viewer feels they missed.",
    imageQueries: ["moody portrait night", "city lights film photo", "aesthetic dark interior"],
  }),
  t({
    id: "one-thing-full-day",
    format: "slideshow",
    hook: "Things you learn when one thing has to handle your whole day",
    slides: [
      "Things you learn when one {thing} has to handle your whole day",
      "Morning: it has to look good",
      "Afternoon: it has to keep up",
      "Evening: it can't let you down",
      "Turns out you only needed one that does it all",
    ],
    structure: "Day-in-the-life arc of a single product across morning, afternoon and night.",
    whyItWorks:
      "Puts the product inside a relatable routine instead of an ad, so the benefit shows up as a story beat rather than a claim.",
    imageQueries: ["golden hour outdoor lifestyle", "street candid film", "friends outdoor activity"],
  }),
  t({
    id: "signs-you-need",
    format: "slideshow",
    hook: "5 signs you need to fix this before it's too late",
    slides: [
      "5 signs you need to fix this before it's too late",
      "1. You keep saying \"I'll deal with it later\"",
      "2. It's costing you time every single day",
      "3. You've tried the usual fixes and nothing stuck",
      "4. Everyone around you already switched",
      "5. You're reading this",
    ],
    structure: "Numbered self-diagnosis list that ends with a self-aware punchline.",
    whyItWorks: "Viewers check themselves against each sign, which drives completion and comments like \"literally me\".",
    imageQueries: ["stressed person laptop", "messy desk", "tired morning coffee"],
  }),
  t({
    id: "wish-i-knew",
    format: "slideshow",
    hook: "Things I wish I knew before I started",
    slides: [
      "Things I wish I knew before I started",
      "You don't need the expensive version on day one",
      "The boring basics matter more than hacks",
      "Track it or it didn't happen",
      "The right tool saves you hours every week",
      "Start before you feel ready",
    ],
    structure: "Hindsight advice from someone further along, one tip per slide.",
    whyItWorks: "Positions the creator as experienced and gives beginners a shortcut; highly saveable.",
    imageQueries: ["notebook desk morning", "beginner workspace", "sunlight window plants"],
  }),
  t({
    id: "pov-finally",
    format: "slideshow",
    hook: "POV: you finally found the thing that actually works",
    slides: [
      "POV: you finally found the thing that actually works",
      "No more juggling five different apps",
      "No more wasting your evenings",
      "Just results",
      "Why did nobody tell me sooner",
    ],
    structure: "POV relief narrative: before-pain, then the calm after.",
    whyItWorks: "POV framing makes the viewer the main character, so the product becomes their own relief moment.",
    imageQueries: ["relaxed person smiling sunlight", "calm bedroom aesthetic", "cozy evening"],
  }),
  t({
    id: "unpopular-opinion",
    format: "slideshow",
    hook: "Unpopular opinion: you're doing it the hard way",
    slides: [
      "Unpopular opinion: you're doing it the hard way",
      "Hustle isn't the problem",
      "Your process is",
      "The people winning just use better tools",
      "Change one thing this week",
    ],
    structure: "Contrarian hook, short build-up, practical turn.",
    whyItWorks: "Mild controversy triggers comments and stitches; the practical ending keeps it from feeling like bait.",
    imageQueries: ["confident person street style", "minimal office", "city rooftop"],
  }),
  t({
    id: "stop-doing",
    format: "slideshow",
    hook: "Stop doing this. Do this instead.",
    slides: [
      "Stop doing this. Do this instead.",
      "Stop: doing everything manually. Instead: automate the boring part",
      "Stop: guessing. Instead: look at what already works",
      "Stop: waiting for perfect. Instead: ship it today",
      "Your future self says thanks",
    ],
    structure: "Stop/Instead pairs, one per slide.",
    whyItWorks: "Clear before/after contrast on every slide makes the advice instantly actionable and shareable.",
    imageQueries: ["clean desk laptop", "productive workspace", "morning routine"],
  }),
  t({
    id: "nobody-talks-about",
    format: "slideshow",
    hook: "Nobody talks about this part",
    slides: [
      "Nobody talks about this part",
      "The hardest part isn't starting",
      "It's staying consistent when nobody's watching",
      "What helped me: making it effortless",
      "Small systems > big motivation",
    ],
    structure: "Hidden-truth hook, emotional middle, practical resolution.",
    whyItWorks: "Feels like insider honesty; vulnerability plus a solution gets shares and follows.",
    imageQueries: ["person alone window", "rainy window aesthetic", "night drive"],
  }),
  t({
    id: "rating-everything",
    format: "slideshow",
    hook: "Rating every option I tried so you don't have to",
    slides: [
      "Rating every option I tried so you don't have to",
      "Option A: 4/10, looked good, didn't last",
      "Option B: 6/10, fine if you have time",
      "Option C: 7/10, way too expensive",
      "The one I kept: 10/10",
    ],
    structure: "Comparison ratings ending with the hero product.",
    whyItWorks: "Review formats borrow trust; the viewer stays to see the winner.",
    imageQueries: ["product flat lay", "shopping haul aesthetic", "unboxing table"],
  }),
  t({
    id: "before-after",
    format: "slideshow",
    hook: "Me 6 months ago vs me now",
    slides: [
      "Me 6 months ago vs me now",
      "Then: always behind",
      "Now: ahead before lunch",
      "Then: overwhelmed",
      "Now: it just runs",
      "The only thing I changed",
    ],
    structure: "Alternating then/now slides with a reveal at the end.",
    whyItWorks: "Transformation arcs are the most reliable short-form story; the reveal slide carries the product.",
    imageQueries: ["transformation sunrise", "person walking city morning", "fresh start"],
  }),
  t({
    id: "red-flags",
    format: "slideshow",
    hook: "Red flags nobody warns you about",
    slides: [
      "Red flags nobody warns you about",
      "When it's \"free\" but costs you hours",
      "When the reviews all sound the same",
      "When support takes a week",
      "Green flag: it just works",
    ],
    structure: "Red-flag list flipped into a green-flag product slide.",
    whyItWorks: "Warning content triggers protective sharing (\"sending this to my friend\").",
    imageQueries: ["red neon sign", "warning aesthetic", "night city red light"],
  }),
  t({
    id: "small-habits",
    format: "slideshow",
    hook: "Small habits that changed everything",
    slides: [
      "Small habits that changed everything",
      "Doing the hardest task first",
      "Planning tomorrow tonight",
      "Using tools that do the work for me",
      "Walking without my phone",
      "Try one this week",
    ],
    structure: "Habit list with the product slotted in as one of the habits.",
    whyItWorks: "Self-improvement lists are evergreen saves; the product feels like advice, not an ad.",
    imageQueries: ["morning walk nature", "journal coffee", "sunrise run"],
  }),
];

// "Wall of Text" video formats: one stock clip, one block of text over it.
const wall = (r: { id: string; text: string; structure: string; whyItWorks: string; imageQueries: string[] }): ViralReference => ({
  id: r.id,
  format: "video",
  platform: "tiktok",
  isTemplate: true,
  hook: r.text.split("\n")[0],
  slides: [r.text],
  structure: r.structure,
  whyItWorks: r.whyItWorks,
  imageQueries: r.imageQueries,
});

export const WALL_OF_TEXT_REFERENCES: ViralReference[] = [
  wall({
    id: "wall-advice-from-someone",
    text: "advice from someone who's done the {thing} shuffle:\npick the one that survives your workout, commute, grocery run, long walk, and eight-hour shift.\nif it can keep going, you shouldn't have to keep switching",
    structure: "Lowercase advice paragraph from an experienced voice, over candid POV lifestyle footage.",
    whyItWorks:
      "Wall-of-text posts make viewers pause to read, which boosts watch time; the casual 'advice from someone who...' voice reads like a friend, not a brand.",
    imageQueries: ["woman running sunset path", "walking city street pov", "friends outdoor summer"],
  }),
  wall({
    id: "wall-nobody-tells-you",
    text: "nobody tells you this about getting your life together:\nit's not one big change.\nit's the boring stuff you stop fighting every morning.\nthe things that just work so you don't have to think about them",
    structure: "Hidden-truth paragraph with a calm reframe, over slow morning-routine footage.",
    whyItWorks: "Relatable honesty plus a soft lesson gets saves and 'needed this' comments.",
    imageQueries: ["morning routine coffee window", "slow morning bedroom", "making coffee kitchen"],
  }),
  wall({
    id: "wall-i-used-to-think",
    text: "i used to think i needed more motivation.\nturns out i needed fewer decisions.\nsame breakfast, same route, same {thing}.\nnow my energy goes to the stuff that actually matters",
    structure: "Before-belief, then realisation, then the simple system, over everyday footage.",
    whyItWorks: "Belief-flip paragraphs trigger self-recognition; the product appears as part of the system, not an ad.",
    imageQueries: ["person walking city morning", "commute train window", "minimal desk workspace"],
  }),
  wall({
    id: "wall-reminder",
    text: "reminder:\nyou don't need the perfect plan.\nyou need the thing you'll actually use on a tuesday when you're tired.\nchoose that",
    structure: "Short 'reminder:' pep paragraph over moody ambient footage.",
    whyItWorks: "Short reminders are quick to read and rewatch, and they get shared as encouragement.",
    imageQueries: ["rainy window city night", "sunset drive road", "ocean waves sunset"],
  }),
  wall({
    id: "wall-things-that-just-make-sense",
    text: "things that just make sense once you're over 25:\nbuying the comfortable version.\nleaving early.\nowning less but better.\nand never again settling for {thing} that makes your day harder",
    structure: "Age-relatable list paragraph ending with the product category.",
    whyItWorks: "Age-anchored relatability ('once you're over 25') drives comments and duets.",
    imageQueries: ["friends laughing outdoor", "golden hour city walk", "picnic park summer"],
  }),
];

export function allReferences(imported: ViralReference[]): ViralReference[] {
  return [...imported, ...WALL_OF_TEXT_REFERENCES, ...BUILTIN_REFERENCES];
}

/** Pick the next references, preferring ones that were used least. */
export function pickReferences(refs: ViralReference[], usage: Map<string, number>, count: number): ViralReference[] {
  const ranked = [...refs].sort((a, b) => (usage.get(a.id) ?? 0) - (usage.get(b.id) ?? 0) || Math.random() - 0.5);
  const out: ViralReference[] = [];
  for (let i = 0; out.length < count && ranked.length > 0; i++) out.push(ranked[i % ranked.length]);
  return out;
}
