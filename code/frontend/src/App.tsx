import { useEffect } from "react";
import { Route, Routes, useLocation } from "react-router-dom";
import Header from "./components/Header";
import Footer from "./components/Footer";
import ContactDock from "./components/ContactDock";
import { PageViews } from "./site";
import Home from "./pages/Home";
import Search from "./pages/Search";
import Trip from "./pages/Trip";
import Book from "./pages/Book";
import Checkout from "./pages/Checkout";
import Confirmed from "./pages/Confirmed";
import Account from "./pages/Account";
import Wishlist from "./pages/Wishlist";
import Departures from "./pages/Departures";
import Guides from "./pages/Guides";
import Guide from "./pages/Guide";
import Contact from "./pages/Contact";
import SignIn from "./pages/SignIn";
import Register from "./pages/Register";
import SupplierHome from "./pages/SupplierHome";
import SupplierProducts from "./pages/SupplierProducts";
import SupplierProduct from "./pages/SupplierProduct";
import SupplierBookings from "./pages/SupplierBookings";
import SupplierReviews from "./pages/SupplierReviews";
import SupplierAccount from "./pages/SupplierAccount";
import AdminHome from "./pages/AdminHome";
import AdminQueue from "./pages/AdminQueue";
import AdminUsers from "./pages/AdminUsers";
import AdminBookings from "./pages/AdminBookings";
import AdminFinance from "./pages/AdminFinance";
import AdminModeration from "./pages/AdminModeration";
import AdminContent from "./pages/AdminContent";
import AdminSystem from "./pages/AdminSystem";

/** The dashboard is an application: its pages carry their own shell. */
const DASH = [
  ["/supplier", SupplierHome], ["/supplier/products", SupplierProducts],
  ["/supplier/products/:id", SupplierProduct], ["/supplier/bookings", SupplierBookings],
  ["/supplier/reviews", SupplierReviews], ["/supplier/account", SupplierAccount],
  ["/admin", AdminHome], ["/admin/queue", AdminQueue], ["/admin/users", AdminUsers],
  ["/admin/bookings", AdminBookings], ["/admin/finance", AdminFinance],
  ["/admin/moderation", AdminModeration], ["/admin/content", AdminContent],
  ["/admin/system", AdminSystem],
] as const;

const SITE = [
  ["/", Home], ["/search", Search], ["/tours/:id", Trip], ["/book/:id", Book],
  ["/checkout/:id", Checkout], ["/booking/:code", Confirmed], ["/account", Account],
  ["/wishlist", Wishlist], ["/departures", Departures], ["/guides", Guides],
  ["/guides/:slug", Guide], ["/contact", Contact], ["/signin", SignIn], ["/register", Register],
] as const;

function ToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

export default function App() {
  return (
    <>
      <ToTop />
      <PageViews />
      <Routes>
        {DASH.map(([path, Page]) => <Route key={path} path={path} element={<Page />} />)}
        <Route path="*" element={<Site />} />
      </Routes>
    </>
  );
}

function Site() {
  return (
    <div className="flex min-h-screen flex-col bg-ground font-body text-ink">
      <Header />
      <main className="flex-1 pb-[var(--dock-space)] lg:pb-0">
        <Routes>
          {SITE.map(([path, Page]) => <Route key={path} path={path} element={<Page />} />)}
          <Route path="*" element={<Home />} />
        </Routes>
      </main>
      <Footer />
      <ContactDock />
    </div>
  );
}
