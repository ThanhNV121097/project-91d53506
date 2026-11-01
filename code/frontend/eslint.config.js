// The lint the shipped CI runs (`npm run lint`). The rules at "error"
// are the ones the pipeline's reviewers used to decide by opinion — file
// size, complexity, unused code and `any` — and a machine now decides them
// with a line number instead. Keep them at "error": a warning here changes
// nothing, because nobody reads a warning in a green run.
import js from "@eslint/js";
import tseslint from "typescript-eslint";
import reactHooks from "eslint-plugin-react-hooks";

// An effect whose arrow returns a value hands React that value as its
// cleanup. window.scrollTo returns a Promise in current browsers, so
// `useEffect(() => window.scrollTo(0, 0), [pathname])` crashed every
// page change of a designed site with "destroy is not a function".
const effectBody = {
  selector: "CallExpression[callee.name=/^use(Layout|Insertion)?Effect$/] > ArrowFunctionExpression[expression=true]",
  message: "Give the effect a block body: useEffect(() => { ... }). An arrow that returns a value hands React a cleanup it will call.",
};

// Every colour a page draws comes from theme.css, so that the palette is one
// decision and not a hundred.
//
// The owner picks a direction off a card showing seven colours, and open_pr
// now refuses a design whose theme.css is not those colours. That gate is
// worth nothing if a component can write a colour of its own: the stylesheet
// says one thing, the page shows another, and the owner's choice is carried
// by whichever files happened to use the tokens. It is also what makes the
// Studio's Colours panel work at all — it sets the four variables, and a
// hardcoded card does not move.
//
// Tailwind's arbitrary values (bg-[#0E0E10]) are the common way in, so the
// class strings are read too, in a literal or a template. Only components and
// pages: the editor runtime draws its own selection outlines over the site in
// colours that are deliberately NOT the site's.
const rawColour = [
  {
    selector: ":matches(Literal[value=/#[0-9a-fA-F]{3,8}\\b/], TemplateElement[value.raw=/#[0-9a-fA-F]{3,8}\\b/])",
    message: "No raw colour in a component: every colour is a token in src/theme.css, used through its Tailwind name (bg-ground, text-ink, border-line, bg-accent). The owner chose this palette; a hardcoded value is a second palette nobody chose, and the Studio's Colours panel cannot move it.",
  },
  {
    selector: ":matches(Literal[value=/\\b(?:bg|text|border|fill|stroke|ring|from|via|to|shadow|outline|decoration|accent|caret|divide|placeholder)-\\[(?:#|rgba?\\(|hsla?\\()/], TemplateElement[value.raw=/\\b(?:bg|text|border|fill|stroke|ring|from|via|to|shadow|outline|decoration|accent|caret|divide|placeholder)-\\[(?:#|rgba?\\(|hsla?\\()/])",
    message: "No arbitrary colour class: bg-[#0E0E10] is a colour this design chose twice. Add it to src/theme.css and use its Tailwind name (bg-ground, text-ink, bg-accent).",
  },
];

// A PICTURE IS NOT DRAWN IN A BOX OF ITS OWN.
//
// Two shapes of one defect, and run 4f4ac443 shipped both of them in one
// design, one round apart.
//
// The first: a raw <img className="object-cover"> crops the thing it shows.
// The second: a picture sized in percentages inside a box it does not own —
// `inset-[18%] h-[64%] w-[64%]` — leaves that box showing round it as a
// frame, which is what the review blocked on ("their own backdrop showing as
// a rounded box … a small photograph in a box floating in a lot of white says
// the idea was not built"). Asked to fix exactly that, the revision swung to
// object-cover and the walk reported image-scale on the same four pictures.
// One defect, two ends, and the oscillation between them cost three model
// turns and the whole test-and-fix loop behind them.
//
// <ProductImage> is the one place the inset shape is right, because it PAINTS
// the ground behind it (--product-ground, a light tile even on a dark site)
// and its 8% is a margin on a tile that is meant to be seen. Copied out of it
// onto a panel the picture does not own, the same classes are a photograph in
// a hole. So the exemption below is that component's, by name.
//
// These rules used to be keyed on the FILE NAME — *Card*, *Product*, *Shop*,
// *Catalog* — and the design that shipped this defect put its records on
// `Dish.tsx` and the home page, so neither rule was ever loaded for the files
// that had it. A rule that has to guess what a business calls the things it
// sells is a rule that is off for the next noun: a dish, a room, a course, a
// plate, a bottle. They are keyed on the ELEMENT now, everywhere a visitor
// sees, and <Picture> itself (src/picture.tsx, outside these globs) stays the
// deliberate way to fill a frame.
const pictureRules = [
  {
    selector: "JSXOpeningElement[name.name='img'] > JSXAttribute[name.name='className'] :matches(Literal[value=/\\bobject-cover\\b/], TemplateElement[value.raw=/\\bobject-cover\\b/])",
    message: "A raw <img> never crops: object-cover cuts the subject away (one run lost the top of a phone, another cut a bowl in half). A product is <ProductImage src={…} alt={…}/> (src/components/ProductImage.tsx) — object-contain on its own tile. A photograph meant to fill its frame is <Picture className=\"object-cover\"> (src/picture.tsx), the deliberate choice and visible in review.",
  },
  {
    selector: "JSXOpeningElement[name.name=/^(?:img|Picture)$/] > JSXAttribute[name.name='className'] :matches(Literal[value=/\\binset-\\[\\d+(\\.\\d+)?%\\]/], TemplateElement[value.raw=/\\binset-\\[\\d+(\\.\\d+)?%\\]/], Literal[value=/\\b[hw]-\\[\\d{1,2}(\\.\\d+)?%\\]/], TemplateElement[value.raw=/\\b[hw]-\\[\\d{1,2}(\\.\\d+)?%\\]/])",
    message: "A picture inset inside its own box shows the box: inset-[18%] h-[64%] w-[64%] draws a small photograph in a frame, which is the opposite of the picture being the thing on the page. Fill the frame (inset-0 h-full w-full) — or, for a product that needs a margin, use <ProductImage>, the one component that may inset because it paints the ground behind it (--product-ground).",
  },
];

// THE WORDS ON A PAGE LIVE IN content.json.
//
// That is the Studio's whole editing contract: the owner clicks a word in the
// frame and types, `<T k="…"/>` reads it back, and `PUT …/design/content`
// commits it. A string written into the JSX is a word the owner cannot touch,
// and nothing refused one.
//
// Measured on run 23: the storefront went through <T> properly, 176 times,
// and the dashboards did not — 52 bare strings in JSX text and 52 more in
// `title=` / `label=` props, every one of them on an Admin* or Supplier* page.
// So the owner could fix a word on the pages their customers see and could not
// touch a word on the nineteen pages they work in themselves. The design was
// not careless; it had no reason to think those pages were different, and the
// one thing that could have told it was a rule.
//
// Why PAGES and not components: a page is the owner's content, and a component
// is chrome whose labels are structural — "Actions", "Previous", "Rows per
// page", the scaffold's own. Pages are where all 104 of run 23's strings were,
// and the scaffold's own Home.tsx already passes this rule, which is what
// makes it a rule the shipped code keeps rather than a rule with an exemption
// list.
//
// Interpolation and punctuation are untouched: {" · "}, a number, a record's
// own field, {formatPrice(…)} — none of those is a word somebody wrote.
const pageWords = [
  {
    selector: "JSXText[value=/[A-Za-z]{2,}/]",
    message: "A word written into the page is a word the owner cannot edit: the Studio's Colours-and-words panel reads src/content.json, and <T k=\"…\"/> is how a page shows it. Put the text in content.json under this page's key and draw it with <T k=\"pages.<page>.<thing>\"/> (or useContent(\"…\") where you need the string itself). A record's own field is not copy — {trip.name} is fine.",
  },
  {
    selector: "JSXAttribute[name.name=/^(title|label|placeholder)$/] > Literal[value=/[A-Za-z]{2,}/]",
    message: "A label written into the page is a word the owner cannot edit: pass useContent(\"pages.<page>.<thing>\") instead, so the Studio can change it. aria-label and alt are accessibility, not copy, and are left alone.",
  },
];

export default tseslint.config(
  { ignores: ["dist", "node_modules"] },
  {
    files: ["**/*.{ts,tsx}"],
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    plugins: { "react-hooks": reactHooks },
    rules: {
      // A LEADING UNDERSCORE MEANS "DELIBERATELY UNUSED", AND THE RULE HAD TO
      // BE TOLD.
      //
      // The rule is worth having: dead code is the thing reviewers used to
      // argue about and a line number settles it. What it could not tell
      // apart was dead code from a parameter that is unused ON PURPOSE —
      // a mock standing in for a backend that does not exist yet, a handler
      // matching a signature it does not need every argument of, a caught
      // error nobody reports.
      //
      // Measured on run 23, story "Buyer & role sign-up and sign-in". Dev
      // wrote the idiomatic thing:
      //
      //   export function requestOtp(_phone: string): void {
      //
      // and there is no correct fix available to it. Remove the parameter and
      // the signature stops matching the real one and its callers; rename it
      // and it is still unused; use it and there is nothing in a mock to use
      // it for. check_build failed three times with that one line, nothing
      // changed between them, the turn was stopped at the blocker, and the
      // story FAILED. This is the complexity:12 story again — a rule that
      // refuses the correct fix — and the escape here is the standard one the
      // rule ships with, so "_" means what it means everywhere else.
      //
      // Nothing is weakened: a variable or parameter with a real name that
      // nobody reads is still an error.
      "@typescript-eslint/no-unused-vars": ["error", {
        argsIgnorePattern: "^_",
        varsIgnorePattern: "^_",
        caughtErrorsIgnorePattern: "^_",
        destructuredArrayIgnorePattern: "^_",
      }],
      "@typescript-eslint/no-explicit-any": "error",
      "max-lines": ["error", { max: 300, skipBlankLines: true, skipComments: true }],
      // 20, measured — and it was 12, which refused the correct fix.
      //
      // The rule is worth having: a function nobody can follow is the thing
      // reviewers used to argue about and a number settles it. What 12 could
      // not tell apart was tangled control flow from a component that simply
      // shows a lot of fields. Three runs measured it:
      //
      //   14  a component Dev extracted FROM a page in order to get under the
      //       ceiling — still refused, and the pull request stayed red on the
      //       same rule after the right fix had been made
      //   16  buildParams in src/data/index.ts: eleven flat `if (x) set(x)`
      //       guards building a URLSearchParams. Honest, readable, refused
      //   27  SupplierProduct: title, description, images, a day-by-day
      //       itinerary, price, cancellation policy, draft → submit → status
      //       (pending / approved / rejected-with-reason), hide. This one
      //       genuinely wanted splitting
      //
      // Every `if`, `&&`, `||`, `??`, `?:`, `case` and `?.` counts, JSX
      // included, so a form of ten conditional fields reaches twelve without
      // being complicated. 20 passes the first two and still fails the third,
      // which is what the rule was for. The turn is also told how to get out
      // of it now (tooling/lint_advice.go); it used to be handed five ways of
      // fixing a TYPE error, and run bf7c8747 spent nine check_builds and
      // $71.69 of design on that before the turn was stopped.
      complexity: ["error", 20],
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",
      "no-restricted-syntax": ["error", effectBody],
    },
  },
  // The palette is theme.css's, everywhere a visitor sees it. Kept to
  // components and pages so the editor runtime, which draws over the site in
  // colours that are not the site's, is left alone.
  {
    files: ["src/components/**/*.{ts,tsx}", "src/pages/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-syntax": ["error", effectBody, ...rawColour, ...pictureRules],
    },
  },
  // And on a PAGE, the words themselves. See pageWords above: a later block's
  // no-restricted-syntax replaces the earlier one's options, so everything the
  // block above gives a page is repeated here.
  {
    files: ["src/pages/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-syntax": ["error", effectBody, ...rawColour, ...pictureRules, ...pageWords],
    },
  },
  // Where products are drawn — cards, tiles, product, shop, catalogue and
  // category pages — a raw <img> may not be object-cover. Cover crops the
  // thing being sold: a phone lost its top, a laptop filled its box edge to
  // edge beside a watch floating small, and a cut-out sat in a white box on a
  // dark card. Product pictures go through <ProductImage> (object-contain on
  // the theme's surface). The rule is by file name and by the class on the
  // <img> itself (a string or a template literal), so it has no false alarm
  // outside these files and cannot be dodged by building the class in a
  // template. A photograph that is meant to fill its frame on such a page (a
  // banner, a lifestyle shot) is <Picture className="object-cover"> from
  // src/picture.tsx — the deliberate choice, visible in review.
  // A later block's no-restricted-syntax replaces the earlier one's options,
  // so the effect rule is repeated here.
  {
    files: [
      "src/components/**/*{Card,Tile,Product}*.tsx",
      "src/pages/**/*{Product,Shop,Store,Catalog,Catalogue,Collection,Category}*.tsx",
    ],
    rules: {
      "no-restricted-syntax": [
        "error",
        effectBody,
        ...rawColour,
        ...pictureRules,
        // <Grid> exists so a card grid never leaves a hole in its last row,
        // and columnsFor picks the count that fills it (7 → 4 + 3, not
        // 3 + 3 + 1). One run shipped four orphan rows anyway — seven cards
        // in three columns on the home page, four in three on each category
        // page — because a fixed column count is the obvious thing to write
        // and nothing refused it. An affordance nothing requires is one that
        // gets skipped.
        {
          selector: ":matches(Literal[value=/\\bgrid-cols-(?:[2-9]|1[0-2])\\b/], TemplateElement[value.raw=/\\bgrid-cols-(?:[2-9]|1[0-2])\\b/])",
          message: "A fixed column count leaves a hole: seven cards in grid-cols-3 is 3 + 3 + 1. Use <Grid max={4}>{…}</Grid> (src/components/Grid.tsx), which picks the columns from how many items there are and centres the last row — or, for a CSS grid of your own, COLS[columnsFor(items.length, 4)].",
        },
      ],
    },
  },
  // The one exemption, and the reason the inset rule can be strict everywhere
  // else: <ProductImage> owns the box it insets inside. It paints
  // --product-ground itself and sets --picture-ground to match, so its 8%
  // margin is a margin on a tile the design meant the visitor to see — not a
  // picture floating in a hole. Every other file gets the ground of whatever
  // it happens to sit on, which is why the same classes there are a defect.
  // object-cover still applies: this component is object-contain by its whole
  // reason for existing.
  {
    files: ["src/components/ProductImage.tsx"],
    rules: {
      "no-restricted-syntax": ["error", effectBody, ...rawColour, pictureRules[0]],
    },
  },
);
