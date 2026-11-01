/** The shape the pages read a product in. The records are src/data/products.json. */
export interface Trip {
  id: string;
  name: string;
  kind: string;
  destination: string;
  duration: string;
  price: number;
  seats: number;
  next_date: string;
  image: string;
  summary: string;
  itinerary: string[];
  includes: string[];
  excludes: string[];
  policy: string;
  confirmation: string;
  supplier: string;
  status: string;
  /** Set only while status is "rejected" (SUPPLIERS-002 AC-5); shown to the owning supplier. */
  rejection_reason?: string;
  place: string;
  map_x: number;
  map_y: number;
}

export interface Departure {
  id: string;
  product: string;
  product_name: string;
  supplier: string;
  supplier_name: string;
  date: string;
  seats: number;
  capacity: number;
  price: number;
  season: string;
  state: string;
}

export interface Booking {
  id: string;
  code: string;
  product_name: string;
  customer: string;
  supplier_name: string;
  date: string;
  travellers: number;
  total: number;
  status: string;
  payment: string;
  created: string;
  image: string;
}
