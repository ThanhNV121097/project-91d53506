# Frontend

Vite + React + TypeScript + Tailwind.

- Words: `src/content.json`, drawn with `<T k="…"/>` from `src/editable.tsx`.
- Colours and type: `src/theme.css` (CSS variables).
- Components: `src/components/`. Pages compose them in `src/App.tsx`.

`npm run dev` for hot reload, `npm run build` then `npm run start` to serve
the built site on `$PORT`.
- Records — products, categories, a menu, branches: `src/data/<name>.json`,
  one file per kind, described in `src/data/schema.json`, read only through
  `useCollection` / `useRecord` from `src/data/index.ts` (paged, with loading
  states). Each record has an `id` and a `_source`: `owner`, `web:<url>` or
  `assumed`. The owner edits them in the Studio. When the site gets a
  backend they move into its database and `src/data/index.ts` calls the API.
- Reaching the business: `contact.*` in `src/content.json` (phone, Zalo,
  email, address, hours). `ContactDock` (call and Zalo on a phone),
  `MapEmbed` (the address on a Google map) and `ContactForm` draw from it.
  The form posts through `src/site.ts` to Agent Team, where the owner reads
  it; `src/site.json` holds the site's key — never edit either.
- Found and shared: the title, description and `og:` tags in `index.html`;
  each page sets its own with `usePageMeta` from `src/seo.ts`.
- Page views of the published site are counted by `PageViews` (`src/site.ts`),
  rendered once in `src/main.tsx`; the Studio's frames are not counted.
- Stock photos' credits: `src/credits.json` (`path`, `author`, `source`,
  `license`, `page`), written by the team's `save_photo` and by the Studio when
  the owner replaces a photo — never by hand — and shown by `<PhotoCredits/>`
  in the footer, which many of the photos' licences (CC BY) ask for.
- Signed-in pages: `src/lib/session.ts` is the design's mock session
  (`useSession()`, `signIn(email, name?)`, `signOut()`). A page that
  `design/pages.json` marks `"auth": true` opens signed in in the Studio; the
  backend story replaces the file with real sign-in after approval.
