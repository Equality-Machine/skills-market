"use client";
import { useMemo, useState } from "react";
import type { Skill, SkillRegistry } from "@skills-market/registry";

export default function BrowseClient({ registry }: { registry: SkillRegistry }) {
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  const categories = useMemo(() => {
    return Array.from(new Set(registry.skills.map((s) => s.category))).sort();
  }, [registry]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return registry.skills.filter((s) => {
      if (activeCategory && s.category !== activeCategory) return false;
      if (!q) return true;
      const haystack = [s.id, s.name, s.displayName ?? "", s.description, ...s.tags]
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [registry, query, activeCategory]);

  return (
    <>
      <div className="search">
        <input
          type="search"
          placeholder="Search skills (e.g. git, design, kubernetes)…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>
      <div className="chips">
        <span
          className={`chip ${activeCategory === null ? "active" : ""}`}
          onClick={() => setActiveCategory(null)}
        >
          all
        </span>
        {categories.map((c) => (
          <span
            key={c}
            className={`chip ${activeCategory === c ? "active" : ""}`}
            onClick={() => setActiveCategory(c)}
          >
            {c}
          </span>
        ))}
      </div>

      <div className="grid">
        {filtered.map((s) => (
          <SkillCard key={s.id} skill={s} />
        ))}
      </div>
      {filtered.length === 0 && (
        <p style={{ color: "var(--muted)", marginTop: 24 }}>No skills match your search.</p>
      )}
    </>
  );
}

function SkillCard({ skill }: { skill: Skill }) {
  return (
    <a className="card" href={`/skills/${skill.id}`}>
      <div className="title">
        <h3>{skill.displayName ?? skill.name}</h3>
        {skill.verified && <span className="verified">✓ verified</span>}
      </div>
      <div className="desc">{skill.description}</div>
      <div className="meta">
        <span className="tag">{skill.category}</span>
        <span>v{skill.version}</span>
        <span>· {skill.downloads} installs</span>
      </div>
      <div className="install">
        <code>{skill.install.command ?? `npx -y skills-market install ${skill.id}`}</code>
      </div>
    </a>
  );
}
