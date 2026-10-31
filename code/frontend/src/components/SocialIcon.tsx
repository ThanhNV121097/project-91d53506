import {
  siFacebook, siGrab, siInstagram, siMessenger, siPinterest, siShopee, siThreads, siTiktok, siWhatsapp, siX, siYoutube, siZalo,
} from "simple-icons";

/**
 * The networks' own marks (simple-icons, CC0), drawn in currentColor so they
 * follow the palette and both modes. Social links are these, never the
 * network's name as a word.
 */
const NETWORKS = {
  facebook: siFacebook, instagram: siInstagram, youtube: siYoutube, tiktok: siTiktok, zalo: siZalo, x: siX,
  messenger: siMessenger, whatsapp: siWhatsapp, pinterest: siPinterest, threads: siThreads, shopee: siShopee, grab: siGrab,
};

export type Network = keyof typeof NETWORKS;

export default function SocialIcon({ network, size = 20, className = "" }: { network: Network; size?: number; className?: string }) {
  const icon = NETWORKS[network];
  return (
    <svg role="img" aria-label={icon.title} viewBox="0 0 24 24" width={size} height={size} fill="currentColor" className={`shrink-0 ${className}`}>
      <path d={icon.path} />
    </svg>
  );
}
