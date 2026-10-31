import { Link } from "react-router-dom";
import { T, useList, useContent } from "../editable";
import Icon from "./Icon";
import SocialIcon from "./SocialIcon";
import PhotoCredits from "./PhotoCredits";
import Logo from "./Logo";

interface Col { heading: string; links: { label: string; href: string }[] }

export default function Footer() {
  const cols = useList<Col>("footer.columns");
  const email = useContent("contact.email");
  const zalo = useContent("contact.zalo");
  const address = useContent("contact.address");
  return (
    <footer className="mt-24 border-t border-line bg-surface">
      <div className="mx-auto grid max-w-page gap-10 px-[var(--gutter)] py-14 md:grid-cols-[1.4fr_1fr_1fr]">
        <div>
          <Logo />
          <T k="footer.line" as="p" className="mt-4 max-w-[36ch] text-sm text-ink-soft" />
          <ul className="mt-5 flex flex-col gap-2 text-sm text-ink">
            {address && <li className="flex items-center gap-2"><Icon name="address" size={16} /><T k="contact.address" /></li>}
            {email && <li className="flex items-center gap-2"><Icon name="mail" size={16} /><T k="contact.email" /></li>}
            {zalo && <li className="flex items-center gap-2"><SocialIcon network="zalo" size={16} /><T k="contact.zalo" /></li>}
          </ul>
        </div>
        {cols.map((col, i) => (
          <nav key={col.heading} aria-label={col.heading}>
            <T k={`footer.columns.${i}.heading`} as="h2" className="label text-ink-soft" />
            <ul className="mt-4 flex flex-col gap-2 text-sm">
              {col.links.map((l, j) => (
                <li key={l.href}>
                  <Link to={l.href} className="text-ink hover:text-accent">
                    <T k={`footer.columns.${i}.links.${j}.label`} />
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </div>
      <div className="mx-auto flex max-w-page flex-col gap-2 border-t border-line px-[var(--gutter)] py-6 text-xs text-ink-soft">
        <T k="footer.legal" as="p" />
        <PhotoCredits />
      </div>
    </footer>
  );
}
