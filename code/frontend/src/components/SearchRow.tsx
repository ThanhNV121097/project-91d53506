import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useContent } from "../editable";
import { useCollection } from "../data";
import Icon from "./Icon";
import Select from "./Select";

/** The search row: destination · date · travellers · price. Bleeds to both edges. */
export default function SearchRow({ initial = {} }: { initial?: { where?: string; date?: string; people?: string; max?: string } }) {
  const { items } = useCollection("destinations", { pageSize: 20 });
  const [where, setWhere] = useState(initial.where ?? "");
  const [date, setDate] = useState(initial.date ?? "");
  const [people, setPeople] = useState(initial.people ?? "2");
  const [max, setMax] = useState(initial.max ?? "");
  const navigate = useNavigate();
  const field = "w-full rounded-[var(--radius-sm)] border border-field bg-surface px-3 py-2 text-sm text-ink appearance-none";
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const q = new URLSearchParams();
        if (where) q.set("where", where);
        if (date) q.set("date", date);
        if (people) q.set("people", people);
        if (max) q.set("max", max);
        navigate(`/search?${q.toString()}`);
      }}
      className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:flex lg:items-end"
    >
      <label className="flex flex-col gap-1 lg:flex-1">
        <span className="label text-ink-soft">{useContent("search.where")}</span>
        <input id="where" list="destinations" value={where} onChange={(e) => setWhere(e.target.value)} className={field} />
        <datalist id="destinations">
          {items.map((d) => <option key={d.id} value={String(d.name)} />)}
        </datalist>
      </label>
      <label className="flex flex-col gap-1 lg:w-44">
        <span className="label text-ink-soft">{useContent("search.date")}</span>
        <input id="date" type="date" value={date} onChange={(e) => setDate(e.target.value)} className={`${field} fig`} />
      </label>
      <label className="flex flex-col gap-1 lg:w-32">
        <span className="label text-ink-soft">{useContent("search.people")}</span>
        <input id="people" type="number" min={1} max={60} value={people} onChange={(e) => setPeople(e.target.value)} className={`${field} fig text-right`} />
      </label>
      <span className="flex flex-col gap-1 lg:w-48">
        <span className="label text-ink-soft">{useContent("search.max")}</span>
        <Select
          id="max"
          aria-label={useContent("search.max")}
          value={max}
          onChange={setMax}
          placeholder={useContent("search.any")}
          options={[
            { value: "500000", label: "up to 500.000 ₫" },
            { value: "1000000", label: "up to 1.000.000 ₫" },
            { value: "2000000", label: "up to 2.000.000 ₫" },
            { value: "5000000", label: "up to 5.000.000 ₫" },
          ]}
        />
      </span>
      <button type="submit" data-testid="search-submit" className="flex items-center justify-center gap-2 rounded-[var(--radius-sm)] bg-accent px-6 py-2.5 text-sm text-accent-ink hover:opacity-90 lg:w-auto">
        <Icon name="search" size={16} />
        <span className="whitespace-nowrap">{useContent("search.submit")}</span>
      </button>
    </form>
  );
}
