"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import type { Skill, SkillRegistry } from "@skills-market/registry";

export default function BrowseClient({ registry }: { registry: SkillRegistry }) {
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  const categories = useMemo(
    () => Array.from(new Set(registry.skills.map((s) => s.category))).sort(),
    [registry]
  );

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
          placeholder="Search skills"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Search skills"
        />
        <span className="search-count">
          {filtered.length} of {registry.skills.length}
        </span>
      </div>
      <div className="chips">
        <button
          className={`chip ${activeCategory === null ? "active" : ""}`}
          onClick={() => setActiveCategory(null)}
          type="button"
        >
          all
        </button>
        {categories.map((c) => (
          <button
            key={c}
            className={`chip ${activeCategory === c ? "active" : ""}`}
            onClick={() => setActiveCategory(c)}
            type="button"
          >
            {c}
          </button>
        ))}
      </div>

      {filtered.length > 0 ? (
        <ul className="grid">
          {filtered.map((s) => (
            <li key={s.id}>
              <SkillCard skill={s} />
            </li>
          ))}
        </ul>
      ) : (
        <p className="empty">No skills match your search.</p>
      )}
    </>
  );
}

function SkillCard({ skill }: { skill: Skill }) {
  return (
    <Link className="card" href={`/skills/${skill.id}`}>
      <div className="card-head">
        <h3>{skill.displayName ?? skill.name}</h3>
        {skill.verified && (
          <span className="verified" title="Maintainer-reviewed">
            ✓
          </span>
        )}
      </div>
      <p className="desc">{skill.description}</p>
      <div className="meta">
        <span className="tag">{skill.category}</span>
        <span className="muted">v{skill.version}</span>
      </div>
    </Link>
  );
}
