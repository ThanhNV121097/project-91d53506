/**
 * Sample records for the direction pages. Deleted with them once the owner
 * has chosen. Product names and prices are SAMPLES — the owner supplied none.
 */
export const PRODUCTS = [
  { kind: "Tour", name: "Cửa Lò beach · 2N1Đ", price: "1.850.000", seats: "6 left", img: "/images/cua-lo.jpg", focus: "50% 62%" },
  { kind: "Experience", name: "Kim Liên village · half day", price: "420.000", seats: "18 left", img: "/images/kim-lien.jpg", focus: "48% 40%" },
  { kind: "Experience", name: "Thanh Chương tea island", price: "350.000", seats: "4 left", img: "/images/thanh-chuong.jpg", focus: "55% 45%" },
  { kind: "Homestay", name: "Bản Nưa homestay · 2 nights", price: "1.200.000", seats: "2 rooms", img: "/images/homestay.jpg", focus: "50% 35%" },
];

export const SEARCH = [
  ["Where", "Cửa Lò"],
  ["Date", "12.07"],
  ["Travellers", "2 + 1"],
  ["Up to", "2.500.000 ₫"],
];

export const TILES = [
  { place: "Cửa Lò", line: "Beach & seafood", from: "900.000", img: "/images/kind-seafood.jpg", focus: "50% 50%" },
  { place: "Pù Mát", line: "Forest & river", from: "650.000", img: "/images/kind-boat.jpg", focus: "55% 45%" },
  { place: "Thanh Chương", line: "Tea hills at dawn", from: "350.000", img: "/images/kind-village.jpg", focus: "50% 55%" },
];

export const DATES = [
  ["Sat 12.07", "Cửa Lò, 2 nights", "6 seats"],
  ["Sun 13.07", "Thanh Chương, day", "4 seats"],
  ["Thu 17.07", "Pù Mát, 2 nights", "2 rooms"],
  ["Sat 19.07", "Kim Liên, half day", "18 seats"],
];

export const COUNTS = [
  ["48", "listings"],
  ["21", "local operators"],
  ["5", "kinds of trip"],
];

export const LISTINGS = [
  { n: 1, name: "Pù Mát Boat & Jeep Co.", kind: "Tour", badge: "Licensed operator", rating: "4.8", dist: "148 km from Cửa Lò", price: "650.000" },
  { n: 2, name: "Bản Nưa Homestay", kind: "Homestay", badge: "Verified host", rating: "4.9", dist: "112 km from Cửa Lò", price: "1.200.000" },
  { n: 3, name: "Thanh Chương Tea Walks", kind: "Experience", badge: "Licensed operator", rating: "4.7", dist: "64 km from Cửa Lò", price: "350.000" },
  { n: 4, name: "Kim Liên Heritage Guides", kind: "Experience", badge: "Verified host", rating: "4.9", dist: "18 km from Cửa Lò", price: "420.000" },
  { n: 5, name: "Cửa Lò Beach Stays", kind: "Tour", badge: "Licensed operator", rating: "4.6", dist: "0 km", price: "1.850.000" },
];

export const PINS = [
  { n: 1, x: "28%", y: "20%" },
  { n: 2, x: "20%", y: "44%" },
  { n: 3, x: "47%", y: "58%" },
  { n: 4, x: "58%", y: "70%" },
  { n: 5, x: "74%", y: "84%" },
];

export const SIDE_STORIES = [
  { tag: "Homestay", img: "/images/guide-kimlien.jpg", focus: "50% 55%", head: "A night in the house Uncle Hồ was born near", price: "420.000" },
  { tag: "Nature", img: "/images/guide-tea.jpg", focus: "50% 45%", head: "Tea rows at dawn, before the mist lifts off Thanh Chương", price: "350.000" },
  { tag: "Beach", img: "/images/guide-cualo.jpg", focus: "50% 60%", head: "The boats come in at Cửa Lò before the tourists wake", price: "1.850.000" },
];

export const STATS5 = [
  ["9 yrs", "running trips"],
  ["< 2 hrs", "reply time"],
  ["340+", "guests hosted"],
];

export const D6_FILTERS = [
  ["Type", ["Tour", "Homestay", "Experience", "Transport"]],
  ["Duration", ["Half day", "1 day", "2+ days"]],
  ["Rating", ["4.5+", "4.0+", "Any"]],
] as const;

export const D6_CARDS = [
  { name: "Cửa Lò beach · 2N1Đ", r: "4.6 · Tour", price: "1.850.000", img: "/images/cua-lo.jpg" },
  { name: "Thanh Chương tea walk", r: "4.7 · Experience", price: "350.000", img: "/images/thanh-chuong.jpg" },
  { name: "Bản Nưa homestay", r: "4.9 · Homestay", price: "1.200.000", img: "/images/homestay.jpg" },
  { name: "Kim Liên half day", r: "4.9 · Experience", price: "420.000", img: "/images/kim-lien.jpg" },
  { name: "Pù Mát boat & jeep", r: "4.8 · Tour", price: "650.000", img: "/images/pu-mat.jpg" },
  { name: "Cửa Lò seafood night", r: "4.5 · Experience", price: "290.000", img: "/images/kind-seafood.jpg" },
  { name: "Tea island sunrise", r: "4.7 · Experience", price: "350.000", img: "/images/kind-village.jpg" },
  { name: "Pù Mát river boat", r: "4.8 · Tour", price: "650.000", img: "/images/kind-boat.jpg" },
];
