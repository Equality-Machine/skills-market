import { notFound } from "next/navigation";
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

  const installCmd = skill.install.command ?? `npx -y skills-market install ${skill.id}`;

  return (
    <section className="detail">
      <a className="back" href="/">← Back to catalog</a>
      <h1>{skill.displayName ?? skill.name} {skill.verified && <span style={{ color: "var(--good)", fontSize: 14, marginLeft: 8 }}>✓ verified</span>}</h1>
      <p className="lede">{skill.description}</p>

      <div className="row">
        <div>
          <strong>Version</strong>
          <div>v{skill.version}</div>
        </div>
        <div>
          <strong>Author</strong>
          <div>{skill.author.name}</div>
        </div>
        <div>
          <strong>Category</strong>
          <div>{skill.category}</div>
        </div>
        <div>
          <strong>License</strong>
          <div>{skill.license ?? "n/a"}</div>
        </div>
        <div>
          <strong>Installs</strong>
          <div>{skill.downloads}</div>
        </div>
      </div>

      <h2>Install via NPX</h2>
      <div className="install-block">
        <pre><code>{installCmd}</code></pre>
        <CopyButton text={installCmd} />
      </div>

      <h2>Install via Claude Code MCP</h2>
      <p>
        After registering the skills-market MCP server in Claude Code, type <code>@skills</code> and select{" "}
        <code>{skill.id}</code>, or run:
      </p>
      <pre><code>{`{ "tool": "install_skill", "arguments": { "id": "${skill.id}", "confirm": true } }`}</code></pre>

      <h2>Tags</h2>
      <div className="chips">
        {skill.tags.map((t) => (
          <span className="chip" key={t}>{t}</span>
        ))}
      </div>

      {skill.homepage && (
        <p style={{ marginTop: 24 }}>
          <a href={skill.homepage} target="_blank" rel="noreferrer">Homepage →</a>
        </p>
      )}
    </section>
  );
}
