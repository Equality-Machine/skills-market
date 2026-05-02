import { getRegistry } from "./lib/registry";
import BrowseClient from "./browse-client";

export default async function HomePage() {
  const registry = await getRegistry();
  return (
    <>
      <section className="hero">
        <h1>Skills for Claude Code.</h1>
        <p>
          A community-maintained catalog. Install with one CLI command, or pipe through
          the MCP server with <code>@skills</code> inside Claude Code.
        </p>
      </section>
      <BrowseClient registry={registry} />
    </>
  );
}
