import "./globals.css";
import type { ReactNode } from "react";
import Link from "next/link";

export const metadata = {
  title: "skills-market — Claude Code skills",
  description: "An open marketplace for Claude Code skills.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <header className="topbar">
          <div className="container topbar-inner">
            <Link href="/" className="brand">
              <span className="brand-mark" aria-hidden>
                ◆
              </span>
              <span>skills-market</span>
            </Link>
            <nav>
              <Link href="/">Browse</Link>
              <a
                href="https://github.com/Equality-Machine/skills-market"
                target="_blank"
                rel="noreferrer"
              >
                GitHub ↗
              </a>
            </nav>
          </div>
        </header>
        <main className="container">{children}</main>
        <footer>
          <div className="container">
            <span className="muted">
              Install <code>git clone …skills-market</code>
              {" · "}
              Update <code>skills-market update</code>
              {" · "}
              <a
                href="https://github.com/Equality-Machine/skills-market/blob/main/CONTRIBUTING.md"
                target="_blank"
                rel="noreferrer"
              >
                Contribute a skill
              </a>
            </span>
          </div>
        </footer>
      </body>
    </html>
  );
}
