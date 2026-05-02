import { getRegistry } from "./lib/registry";
import BrowseClient from "./browse-client";

export default async function HomePage() {
  const registry = await getRegistry();
  return (
    <>
      <section className="hero">
        <h1>Skills for Claude Code, in one place.</h1>
        <p>
          Browse community skills, copy an NPX install command, or hook this catalog into Claude Code through the
          skills-market MCP server and discover them with <code>@skills</code>.
        </p>
      </section>
      <BrowseClient registry={registry} />
    </>
  );
}
