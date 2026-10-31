/**
 * Two directions for the owner to choose between. Not part of the site: each
 * renders alone, outside the app shell, and this file and directions.css go
 * once the choice is made. Desktop only, judged at 1440x790.
 *
 * Product names and prices here are SAMPLES — the owner has supplied none.
 */
import "./directions.css";

const PRODUCTS = [
  {
    kind: "Tour",
    name: "Cửa Lò beach · 2N1Đ",
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
    name: "Thanh Chương tea island",
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

const SEARCH = [
  ["Where", "Cửa Lò"],
  ["Date", "12.07"],
  ["Travellers", "2 + 1"],
  ["Up to", "2.500.000 ₫"],
];

export function Directions1() {
  return (
    <div className="d1">
      <div className="d1-rail"><span>Nghệ An · book it online</span></div>
      <div className="d1-body">
        <div className="d1-search">
          {SEARCH.map(([label, value]) => (
            <div className="d1-f" key={label}><b>{label}</b><i>{value}</i></div>
          ))}
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
      <div className="d-label">Direction 1 · The departure board</div>
    </div>
  );
}

const TILES = [
  { place: "Cửa Lò", line: "Beach & seafood", from: "900.000", img: "/images/kind-seafood.jpg", focus: "50% 50%" },
  { place: "Pù Mát", line: "Forest & river", from: "650.000", img: "/images/kind-boat.jpg", focus: "55% 45%" },
  { place: "Thanh Chương", line: "Tea hills at dawn", from: "350.000", img: "/images/kind-village.jpg", focus: "50% 55%" },
];

const DATES = [
  ["Sat 12.07", "Cửa Lò, 2 nights", "6 seats"],
  ["Sun 13.07", "Thanh Chương, day", "4 seats"],
  ["Thu 17.07", "Pù Mát, 2 nights", "2 rooms"],
  ["Sat 19.07", "Kim Liên, half day", "18 seats"],
];

const COUNTS = [
  ["48", "listings"],
  ["21", "local operators"],
  ["5", "kinds of trip"],
];

export function Directions2() {
  return (
    <div className="d2">
      <div className="d2-hero">
        <img src="/images/pu-mat.jpg" alt="The river and forest of Pù Mát at dawn" />
        <div className="d2-scrim" />
        <div className="d2-top">
          <span className="dot" />
          <span>Nghệ An</span>
          <span className="soft">Local operators, verified</span>
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
        <div className="d2-dates">
          <h2>Leaving soon</h2>
          {DATES.map((d) => (
            <a key={d[0]} href="#"><b>{d[0]}</b><span>{d[1]}</span><u>{d[2]}</u></a>
          ))}
          <p>Prices move with the date. A seat is held 15 minutes while you pay.</p>
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
        {COUNTS.map(([n, what]) => <span key={what}><em>{n}</em> {what}</span>)}
      </div>
      <div className="d-label">Direction 2 · The place sells the trip</div>
    </div>
  );
}

const LISTINGS = [
  { n: 1, name: "Pù Mát Boat & Jeep Co.", kind: "Tour", badge: "Licensed operator", rating: "4.8", dist: "148 km from Cửa Lò", price: "650.000" },
  { n: 2, name: "Bản Nưa Homestay", kind: "Homestay", badge: "Verified host", rating: "4.9", dist: "112 km from Cửa Lò", price: "1.200.000" },
  { n: 3, name: "Thanh Chương Tea Walks", kind: "Experience", badge: "Licensed operator", rating: "4.7", dist: "64 km from Cửa Lò", price: "350.000" },
  { n: 4, name: "Kim Liên Heritage Guides", kind: "Experience", badge: "Verified host", rating: "4.9", dist: "18 km from Cửa Lò", price: "420.000" },
  { n: 5, name: "Cửa Lò Beach Stays", kind: "Tour", badge: "Licensed operator", rating: "4.6", dist: "0 km", price: "1.850.000" },
];

const PINS = [
  { n: 1, x: "28%", y: "20%" },
  { n: 2, x: "20%", y: "44%" },
  { n: 3, x: "47%", y: "58%" },
  { n: 4, x: "58%", y: "70%" },
  { n: 5, x: "74%", y: "84%" },
];

export function Directions3() {
  return (
    <div className="d3">
      <div className="d3-list">
        <div className="d3-top">
          <span className="d3-kicker">Nghệ An · verified suppliers</span>
          <h1>Who you are booking from, and exactly where they are.</h1>
        </div>
        {LISTINGS.map((l) => (
          <a className="d3-row" key={l.n} href="#">
            <span className="d3-n">{l.n}</span>
            <span className="d3-m">
              <b>{l.name}</b>
              <span className="d3-badge">{l.badge}</span>
              <span className="d3-sub">{l.kind} · {l.dist} · ★ {l.rating}</span>
            </span>
            <span className="d3-p">{l.price}<em> ₫</em></span>
          </a>
        ))}
      </div>
      <div className="d3-map">
        <div className="d3-legend">
          <span><i className="dot tour" /> Tour</span>
          <span><i className="dot stay" /> Homestay</span>
          <span><i className="dot exp" /> Experience</span>
        </div>
        <svg className="d3-svg" viewBox="0 0 100 100" preserveAspectRatio="none">
          <path d="M0,10 C30,5 40,30 35,55 C30,78 55,70 60,95 L0,100 Z" className="d3-land" />
          <path d="M55,0 L100,0 L100,100 L45,100 C55,70 35,55 42,30 C48,15 50,8 55,0 Z" className="d3-hill" />
        </svg>
        {PINS.map((p) => (
          <span className="d3-pin" key={p.n} style={{ left: p.x, top: p.y }}>{p.n}</span>
        ))}
      </div>
      <div className="d-label">Direction 3 · The map that knows the province</div>
    </div>
  );
}

const SIDE_STORIES = [
  { tag: "Homestay", img: "/images/guide-kimlien.jpg", focus: "50% 55%", head: "A night in the house Uncle Hồ was born near", price: "420.000" },
  { tag: "Nature", img: "/images/guide-tea.jpg", focus: "50% 45%", head: "Tea rows at dawn, before the mist lifts off Thanh Chương", price: "350.000" },
  { tag: "Beach", img: "/images/guide-cualo.jpg", focus: "50% 60%", head: "The boats come in at Cửa Lò before the tourists wake", price: "1.850.000" },
];

export function Directions4() {
  return (
    <div className="d4">
      <div className="d4-mast">
        <span>No. 1 · Nghệ An Guide</span>
        <span>Issue dated today</span>
        <span className="d4-search">Search the province →</span>
      </div>
      <div className="d4-spread">
        <article className="d4-feature">
          <div className="d4-feat-pic">
            <img src="/images/guide-pumat.jpg" alt="The river through Pù Mát forest" style={{ objectPosition: "55% 40%" }} />
          </div>
          <span className="d4-tag">Feature</span>
          <h1>Pù Mát keeps its river wild, <i>and its guides nearby.</i></h1>
          <p>
            Two hours from the coast, the forest opens onto a river boat run by the
            families who have always lived beside it — a morning trip, not a brochure
            photograph.
          </p>
          <a className="d4-read" href="#">Read the guide · <span className="d4-pricepill">from 650.000 ₫</span></a>
        </article>
        <div className="d4-side">
          {SIDE_STORIES.map((s) => (
            <article className="d4-story" key={s.head}>
              <div className="d4-story-pic">
                <img src={s.img} alt={s.head} style={{ objectPosition: s.focus }} />
              </div>
              <div className="d4-story-body">
                <span className="d4-tag small">{s.tag}</span>
                <h2>{s.head}</h2>
                <span className="d4-pricepill">from {s.price} ₫</span>
              </div>
            </article>
          ))}
        </div>
      </div>
      <div className="d-label">Direction 4 · The province&rsquo;s own guide</div>
    </div>
  );
}
