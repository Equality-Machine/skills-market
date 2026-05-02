import "./globals.css";
import type { ReactNode } from "react";

export const metadata = {
  title: "skills-market — Claude Code skills marketplace",
  description: "An open marketplace for Claude Code skills.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <header className="topbar">
          <a href="/" className="brand">
            skills-market
          </a>
          <nav>
            <a href="/">Browse</a>
            <a href="https://github.com/Mel0day/skills-market" target="_blank" rel="noreferrer">
              GitHub
            </a>
          </nav>
        </header>
        <main>{children}</main>
        <footer>
          <small>
            Install with <code>npx -y skills-market install &lt;id&gt;</code> or use the MCP server in Claude Code with{" "}
            <code>@skills</code>.
          </small>
        </footer>
      </body>
    </html>
  );
}
