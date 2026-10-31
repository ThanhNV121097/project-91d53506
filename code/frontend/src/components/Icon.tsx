import {
  AlertCircle, ArrowRight, ArrowUpDown, ArrowUpRight, Award, Banknote, Bell, Calendar, Camera, Car, Check, ChevronDown,
  ChevronLeft, ChevronRight, CircleCheck, Clock, CreditCard, Download, ExternalLink, Eye, Filter, Gift, Globe, Heart,
  Home, Image, Info, LayoutGrid, Leaf, List, Lock, LogOut, Mail, MapPin, Menu, MessageCircle, Minus, Moon, Package,
  Percent, Phone, Play, Plus, QrCode, Quote, Recycle, RotateCcw, Search, Share2, ShieldCheck, ShoppingBag, ShoppingCart,
  SlidersHorizontal, Sparkles, Star, Store, Sun, Tag, Trash2, Truck, User, Users, Utensils, Wallet, Wifi, X, Zap,
  type LucideIcon,
} from "lucide-react";

/**
 * Every icon the design uses, by what it means. One set (lucide-react) at one
 * stroke, so a phone beside an address and a cart in the header are drawn by
 * the same hand. Add to the map rather than importing an icon elsewhere: the
 * meaning is the name, so "shipping" is a truck on every page.
 */
const ICONS = {
  // navigation and controls
  menu: Menu, close: X, search: Search, back: ChevronLeft, next: ChevronRight, expand: ChevronDown,
  arrow: ArrowRight, "arrow-out": ArrowUpRight, external: ExternalLink, home: Home, share: Share2,
  // account and shop
  cart: ShoppingCart, bag: ShoppingBag, account: User, wishlist: Heart, logout: LogOut, lock: Lock,
  plus: Plus, minus: Minus, remove: Trash2, filter: Filter, sort: ArrowUpDown, settings: SlidersHorizontal,
  grid: LayoutGrid, list: List, view: Eye, download: Download, tag: Tag, sale: Percent, gift: Gift, package: Package,
  // promises
  shipping: Truck, returns: RotateCcw, secure: ShieldCheck, card: CreditCard, cash: Banknote, wallet: Wallet, qr: QrCode,
  quality: Award, fresh: Leaf, eco: Recycle, new: Sparkles, fast: Zap,
  // contact and place
  phone: Phone, mail: Mail, address: MapPin, hours: Clock, date: Calendar, chat: MessageCircle, store: Store,
  web: Globe, parking: Car, wifi: Wifi, food: Utensils, people: Users, notify: Bell,
  // status and content
  check: Check, done: CircleCheck, info: Info, alert: AlertCircle, star: Star, quote: Quote, play: Play,
  image: Image, photo: Camera,
  // theme
  light: Sun, dark: Moon,
} satisfies Record<string, LucideIcon>;

export type IconName = keyof typeof ICONS;

/**
 * <Icon name="phone" />. Decorative by default (beside words that say the
 * same); give it a label when it stands alone, as an icon button's does.
 *
 * Always its own size: width and height are set from `size` and it never
 * shrinks (`shrink-0`), so beside a long address or a wrapping line in a
 * footer column the icon stays a full icon instead of a squeezed sliver.
 * Change the size with `size`, not a class.
 */
export default function Icon({ name, size = 20, label, className = "" }: { name: IconName; size?: number; label?: string; className?: string }) {
  const Glyph = ICONS[name];
  return (
    <Glyph
      size={size}
      strokeWidth={1.75}
      width={size}
      height={size}
      className={`shrink-0 ${className}`}
      aria-hidden={label ? undefined : true}
      aria-label={label}
      role={label ? "img" : undefined}
    />
  );
}
