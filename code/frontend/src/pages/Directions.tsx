/**
 * Two directions for the owner to choose between. Not part of the site:
 * each renders alone, outside the app shell, and the whole file goes once
 * the choice is made. Desktop only, judged at 1440x790.
 *
 * Product names and prices here are SAMPLES — the owner has supplied none.
 */

const PRODUCTS = [
  {
    kind: "Tour",
    name: "Cửa Lò beach · 2 days 1 night",
    price: "1.850.000",
    seats: "6 left",
    img: "/images/cua-lo.jpg",
    focus: "50% 62%",
  },
  {
    kind: "Experience",
    name: "Kim Liên village · half day",
    price: "420.000",
    seats: "18 left",
    img: "/images/kim-lien.jpg",
    focus: "48% 40%",
  },
  {
    kind: "Experience",
    name: "Thanh Chương tea island · early boat",
    price: "350.000",
    seats: "4 left",
    img: "/images/thanh-chuong.jpg",
    focus: "55% 45%",
  },
  {
    kind: "Homestay",
    name: "Bản Nưa homestay · 2 nights",
    price: "1.200.000",
    seats: "2 rooms",
    img: "/images/homestay.jpg",
    focus: "50% 35%",
  },
];

const LABEL = `
.d-label { position:fixed; right:0; bottom:0; font-size:10px; letter-spacing:.18em;
  text-transform:uppercase; padding:8px 14px; z-index:5; }
`;

const D1 = `
.d1 { --ground:#EFEFEC; --ink:#111214; --ink-soft:#5A5C5F;
  --accent:#C8381F; --line:rgba(17,18,20,0.14);
  min-height:100vh; background:var(--ground); color:var(--ink);
  font-family:"IBM Plex Sans",system-ui,sans-serif; display:flex; overflow:hidden; }
.d1 * { box-sizing:border-box; }
.d1-rail { width:54px; flex:0 0 54px; border-right:1px solid var(--line);
  display:flex; align-items:flex-end; justify-content:center; padding-bottom:26px; }
.d1-rail span { writing-mode:vertical-rl; transform:rotate(180deg); font-size:11px;
  letter-spacing:.22em; text-transform:uppercase; color:var(--ink-soft); }
.d1-body { flex:1; min-width:0; display:flex; flex-direction:column; }
.d1-search { display:grid; grid-template-columns:1.3fr 1fr 1fr 1fr 180px;
  border-bottom:1px solid var(--line); }
.d1-f { padding:14px 20px; border-right:1px solid var(--line); }
.d1-f b { display:block; font-size:10px; letter-spacing:.18em; text-transform:uppercase;
  color:var(--ink-soft); font-weight:500; margin-bottom:5px; }
.d1-f i { font-style:normal; font-family:"IBM Plex Mono",monospace; font-size:17px;
  font-variant-numeric:tabular-nums; }
.d1-go { background:var(--accent); color:#fff; border:0; font:inherit; font-size:12px;
  letter-spacing:.16em; text-transform:uppercase; cursor:pointer; }
.d1-head { padding:36px 20px 24px; display:flex; align-items:flex-end; gap:48px;
  border-bottom:1px solid var(--line); }
.d1-head h1 { margin:0; font-size:44px; line-height:1.05; letter-spacing:-.025em;
  font-weight:500; max-width:16ch; }
.d1-head p { margin:0 0 4px; font-size:15px; color:var(--ink-soft); max-width:34ch;
  line-height:1.5; }
.d1-live { margin-left:auto; text-align:right; font-family:"IBM Plex Mono",monospace;
  font-size:11px; letter-spacing:.1em; color:var(--accent); text-transform:uppercase; }
.d1-row { flex:1; display:grid; grid-template-columns:repeat(4,1fr); }
.d1-card { position:relative; border-right:1px solid var(--line); overflow:hidden;
  display:flex; flex-direction:column; }
.d1-card:last-child { border-right:0; }
.d1-pic { position:relative; flex:1; min-height:0; overflow:hidden; background:#DAD8D3; }
.d1-pic img { width:100%; height:100%; object-fit:cover; display:block;
  transition:transform .5s cubic-bezier(.22,1,.36,1); }
.d1-card:hover .d1-pic img { transform:scale(1.03); }
.d1-tag { position:absolute; top:0; left:0; background:var(--ground); color:var(--ink);
  font-size:10px; letter-spacing:.16em; text-transform:uppercase; padding:6px 10px; }
.d1-seats { position:absolute; top:0; right:0; background:var(--accent); color:#fff;
  font-family:"IBM Plex Mono",monospace; font-size:11px; padding:6px 10px;
  font-variant-numeric:tabular-nums; }
.d1-meta { padding:12px 20px 16px; display:flex; align-items:baseline; gap:10px;
  border-top:1px solid var(--line); }
.d1-meta h3 { margin:0; font-size:14px; font-weight:500; line-height:1.25; }
.d1-meta .p { margin-left:auto; font-family:"IBM Plex Mono",monospace; font-size:26px;
  font-variant-numeric:tabular-nums; letter-spacing:-.02em; white-space:nowrap; }
.d1-meta .p em { font-style:normal; font-size:14px; color:var(--ink-soft); }
`;

export function Directions1() {
  return (
    <div className="d1">
      <style>{LABEL + D1}</style>
      <div className="d1-rail"><span>Nghệ An · book it online</span></div>
      <div className="d1-body">
        <div className="d1-search">
          <div className="d1-f"><b>Where</b><i>Cửa Lò</i></div>
          <div className="d1-f"><b>Date</b><i>12.07</i></div>
          <div className="d1-f"><b>Travellers</b><i>2 + 1</i></div>
          <div className="d1-f"><b>Up to</b><i>2.500.000 ₫</i></div>
          <button className="d1-go" type="button">Find seats</button>
        </div>
        <div className="d1-head">
          <h1>Real dates, real seats, today&rsquo;s price.</h1>
          <p>
            Every listing comes from an approved Nghệ An operator. Pick the date, pay,
            get the code — no phone call in between.
          </p>
          <div className="d1-live">Availability · updated daily</div>
        </div>
        <div className="d1-row">
          {PRODUCTS.map((p) => (
            <article className="d1-card" key={p.name}>
              <div className="d1-pic">
                <img src={p.img} alt={p.name} style={{ objectPosition: p.focus }} />
                <span className="d1-tag">{p.kind}</span>
                <span className="d1-seats">{p.seats}</span>
              </div>
              <div className="d1-meta">
                <h3>{p.name}</h3>
                <span className="p">{p.price}<em> ₫</em></span>
              </div>
            </article>
          ))}
        </div>
      </div>
      <div className="d-label" style={{ color: "#5A5C5F" }}>
        Direction 1 · The departure board
      </div>
    </div>
  );
}

const D2 = `
.d2 { --ground:#0C0D0F; --surface:#16181B; --ink:#F4F1EA; --ink-soft:#A09C93;
  --accent:#E4B363; --line:rgba(244,241,234,0.16);
  min-height:100vh; background:var(--ground); color:var(--ink);
  font-family:Inter,system-ui,sans-serif; display:flex; flex-direction:column;
  overflow:hidden; }
.d2 * { box-sizing:border-box; }
.d2-hero { position:relative; flex:1; min-height:430px; }
.d2-hero > img { position:absolute; inset:0; width:100%; height:100%; object-fit:cover;
  object-position:50% 34%; filter:brightness(.5) saturate(.82) contrast(1.06); }
.d2-scrim { position:absolute; inset:0;
  background:linear-gradient(100deg, rgba(12,13,15,.93) 0%, rgba(12,13,15,.6) 44%, rgba(12,13,15,.12) 78%),
             linear-gradient(to top, rgba(12,13,15,.96) 0%, rgba(12,13,15,0) 50%); }
.d2-top { position:absolute; top:0; left:0; right:0; display:flex; align-items:center;
  gap:14px; padding:20px 40px; font-size:11px; letter-spacing:.2em;
  text-transform:uppercase; color:var(--ink-soft); }
.d2-top .dot { width:6px; height:6px; border-radius:50%; background:var(--accent); }
.d2-words { position:absolute; left:40px; top:104px; right:40px; }
.d2-words h1 { margin:0; font-family:"Bricolage Grotesque",system-ui,sans-serif;
  font-weight:500; font-size:72px; line-height:1.02; letter-spacing:-.035em;
  max-width:21ch; }
.d2-words h1 em { font-style:normal; color:var(--accent); }
.d2-words p { margin:20px 0 0; max-width:42ch; font-size:16px; line-height:1.55;
  color:var(--ink-soft); }
.d2-cta { display:flex; align-items:center; gap:18px; margin-top:24px; }
.d2-cta button { font:inherit; font-size:14px; border:0; cursor:pointer;
  background:var(--accent); color:#16140F; padding:13px 24px; }
.d2-cta span { font-size:13px; color:var(--ink-soft); }
.d2-tiles { position:relative; z-index:2; display:grid;
  grid-template-columns:repeat(3,252px); gap:1px; margin:-128px 0 0 40px;
  background:var(--line); border:1px solid var(--line); width:fit-content; }
.d2-tile { position:relative; aspect-ratio:1/1; overflow:hidden; background:var(--surface);
  display:block; text-decoration:none; color:inherit; }
.d2-tile img { position:absolute; inset:0; width:100%; height:100%; object-fit:cover;
  filter:brightness(.68) saturate(.9);
  transition:transform .6s cubic-bezier(.22,1,.36,1), filter .4s ease; }
.d2-tile:hover img { transform:scale(1.05); filter:brightness(.86) saturate(1); }
.d2-tile .t { position:absolute; left:0; right:0; bottom:0; padding:16px 18px 14px;
  background:linear-gradient(to top, rgba(12,13,15,.92), rgba(12,13,15,0)); }
.d2-tile .t b { display:block; font-family:"Bricolage Grotesque",system-ui,sans-serif;
  font-size:20px; font-weight:500; letter-spacing:-.015em; }
.d2-tile .t i { font-style:normal; font-size:13px; color:#CFC9BE;
  font-variant-numeric:tabular-nums; }
.d2-tile .t i u { text-decoration:none; color:var(--accent); }
.d2-foot { display:flex; align-items:center; gap:34px; padding:22px 40px 26px;
  font-size:11px; letter-spacing:.14em; text-transform:uppercase; color:var(--ink-soft); }
.d2-foot em { font-style:normal; color:var(--ink); font-size:14px;
  font-variant-numeric:tabular-nums; }
`;

const TILES = [
  { place: "Cửa Lò", line: "Beach & seafood", from: "900.000", img: "/images/cua-lo.jpg", focus: "45% 24%" },
  { place: "Thanh Chương", line: "Tea island, by boat", from: "350.000", img: "/images/thanh-chuong.jpg", focus: "38% 78%" },
  { place: "Kim Liên", line: "Village & history", from: "420.000", img: "/images/kim-lien.jpg", focus: "55% 74%" },
];

export function Directions2() {
  return (
    <div className="d2">
      <style>{LABEL + D2}</style>
      <div className="d2-hero">
        <img src="/images/pu-mat.jpg" alt="The river and forest of Pù Mát at dawn" />
        <div className="d2-scrim" />
        <div className="d2-top">
          <span className="dot" />
          <span>Nghệ An</span>
          <span style={{ opacity: 0.6 }}>Local operators, verified</span>
        </div>
        <div className="d2-words">
          <h1>A whole province worth going to, <em>bookable a day at a time.</em></h1>
          <p>
            Pù Mát forest, Cửa Lò beach, the tea island at Thanh Chương, the village at
            Kim Liên — run by the people who live there, paid for here.
          </p>
          <div className="d2-cta">
            <button type="button">See the places</button>
            <span>Or search the dates you are free</span>
          </div>
        </div>
      </div>
      <div className="d2-tiles">
        {TILES.map((t) => (
          <a className="d2-tile" key={t.place} href="#">
            <img src={t.img} alt={t.place} style={{ objectPosition: t.focus }} />
            <span className="t">
              <b>{t.place}</b>
              <i>{t.line} · from <u>{t.from} ₫</u></i>
            </span>
          </a>
        ))}
      </div>
      <div className="d2-foot">
        <span><em>48</em> listings</span>
        <span><em>21</em> local operators</span>
        <span><em>5</em> kinds of trip</span>
      </div>
      <div className="d-label" style={{ color: "#A09C93" }}>
        Direction 2 · The place sells the trip
      </div>
    </div>
  );
}
