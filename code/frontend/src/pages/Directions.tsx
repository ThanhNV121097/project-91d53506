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
