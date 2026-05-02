import { notFound } from "next/navigation";
import Link from "next/link";
import { getRegistry } from "../../lib/registry";
import CopyButton from "./copy-button";

interface Props {
  params: { id: string };
}

export async function generateStaticParams() {
  const registry = await getRegistry();
  return registry.skills.map((s) => ({ id: s.id }));
}

export default async function SkillDetailPage({ params }: Props) {
  const registry = await getRegistry();
  const skill = registry.skills.find((s) => s.id === params.id);
  if (!skill) return notFound();

  const cliCmd = `skills-market install ${skill.id}`;
  const repoUrl = "https://github.com/Equality-Machine/skills-market";

  return (
    <article className="detail">
      <Link className="back" href="/">
        ← All skills
      </Link>

      <header className="detail-head">
        <div className="detail-title">
          <h1>{skill.displayName ?? skill.name}</h1>
          {skill.verified && (
            <span className="verified" title="Maintainer-reviewed">
              ✓ verified
            </span>
          )}
        </div>
        <p className="lede">{skill.description}</p>
      </header>

      <section>
        <h2>Install</h2>
        <div className="install-block">
          <pre>
            <code>{cliCmd}</code>
          </pre>
          <CopyButton text={cliCmd} />
        </div>
        <p className="muted small">
          Auto-installs into every agent home that exists on your machine
          (<code>~/.claude/skills/</code> for Claude Code,{" "}
          <code>~/.codex/skills/</code> for Codex CLI). Pin one with
          {" "}
          <code>--target=claude</code> or <code>--target=codex</code>.
          {" "}
          <a href={`${repoUrl}#install-the-cli`} target="_blank" rel="noreferrer">
            CLI setup ↗
          </a>
        </p>
      </section>

      <section>
        <h2>Details</h2>
        <dl className="kv">
          <div>
            <dt>Version</dt>
            <dd>v{skill.version}</dd>
          </div>
          <div>
            <dt>Author</dt>
            <dd>{skill.author.name}</dd>
          </div>
          <div>
            <dt>Category</dt>
            <dd>{skill.category}</dd>
          </div>
          <div>
            <dt>License</dt>
            <dd>{skill.license ?? "—"}</dd>
          </div>
          <div>
            <dt>Created</dt>
            <dd>
              <time dateTime={skill.createdAt}>{skill.createdAt.slice(0, 10)}</time>
            </dd>
          </div>
        </dl>
      </section>

      {skill.tags?.length > 0 && (
        <section>
          <h2>Tags</h2>
          <div className="chips">
            {skill.tags.map((t) => (
              <span className="chip static" key={t}>
                {t}
              </span>
            ))}
          </div>
        </section>
      )}

      <section>
        <h2>Source</h2>
        <p className="muted">
          <a
            href={`${repoUrl}/blob/main/skills/${skill.id}/SKILL.md`}
            target="_blank"
            rel="noreferrer"
          >
            View SKILL.md on GitHub ↗
          </a>
          {skill.homepage && (
            <>
              {" · "}
              <a href={skill.homepage} target="_blank" rel="noreferrer">
                Homepage ↗
              </a>
            </>
          )}
        </p>
      </section>
    </article>
  );
}
