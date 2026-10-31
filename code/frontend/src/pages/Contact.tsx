import { T, useContent } from "../editable";
import ContactForm from "../components/ContactForm";
import MapEmbed from "../components/MapEmbed";
import Icon from "../components/Icon";
import { usePageMeta } from "../seo";

export default function Contact() {
  usePageMeta("pages.contact.title", "pages.contact.description");
  const phone = useContent("contact.phone");
  const zalo = useContent("contact.zalo");
  const email = useContent("contact.email");
  const address = useContent("contact.address");
  const hours = useContent("contact.hours");
  return (
    <section className="mx-auto grid max-w-page gap-12 px-[var(--gutter)] py-10 lg:grid-cols-[1.1fr_1fr]">
      <div>
        <T k="pages.contact.eyebrow" as="p" className="label text-ink-soft" />
        <T k="pages.contact.heading" as="h1" className="mt-2 max-w-[22ch] text-[length:var(--size-h1)]" />
        <T k="pages.contact.sub" as="p" className="mt-4 max-w-[50ch] text-sm text-ink-soft" />
        <ContactForm className="mt-8 max-w-[44ch]" fields={[{ key: "booking", type: "text" }, { key: "date", type: "date" }, { key: "people", type: "number" }]} />
      </div>
      <div>
        <T k="pages.contact.details" as="h2" className="text-[length:var(--size-h2)]" />
        <ul className="mt-4 flex flex-col gap-3 border-t border-line pt-4 text-sm text-ink">
          {phone && <li className="flex items-center gap-2"><Icon name="phone" size={16} /><span className="fig"><T k="contact.phone" /></span></li>}
          {zalo && <li className="flex items-center gap-2"><Icon name="chat" size={16} /><span className="fig"><T k="contact.zalo" /></span></li>}
          {email && <li className="flex items-center gap-2"><Icon name="mail" size={16} /><T k="contact.email" /></li>}
          {address && <li className="flex items-center gap-2"><Icon name="address" size={16} /><T k="contact.address" /></li>}
          {hours && <li className="flex items-center gap-2"><Icon name="hours" size={16} /><T k="contact.hours" /></li>}
          {!phone && !email && !address && <li className="text-ink-soft"><T k="pages.contact.detailsEmpty" /></li>}
        </ul>
        {address && <MapEmbed className="mt-8 h-80 w-full rounded-[var(--radius-sm)] border border-line" />}
      </div>
    </section>
  );
}
