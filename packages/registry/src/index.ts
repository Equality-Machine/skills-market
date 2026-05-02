import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

export type SkillCategory =
  | "demo"
  | "development"
  | "design"
  | "devops"
  | "writing"
  | "data"
  | "security"
  | "productivity"
  | "other";

export interface SkillAuthor {
  name: string;
  email?: string;
  url?: string;
}

export interface SkillInstall {
  type: "npx" | "git" | "local";
  package?: string;
  version?: string;
  command?: string;
  url?: string;
}

export interface SkillSource {
  type: "github" | "url" | "local";
  repo?: string;
  url?: string;
  path?: string;
  ref?: string;
}

export interface Skill {
  id: string;
  name: string;
  displayName?: string;
  description: string;
  version: string;
  author: SkillAuthor;
  category: SkillCategory;
  tags: string[];
  install: SkillInstall;
  source: SkillSource;
  homepage?: string;
  license?: string;
  createdAt: string;
  downloads: number;
  verified: boolean;
}

export interface SkillRegistry {
  $schema?: string;
  name: string;
  version: string;
  description?: string;
  owner?: SkillAuthor;
  updatedAt: string;
  skills: Skill[];
}

const HERE = dirname(fileURLToPath(import.meta.url));

/** Default registry path resolved relative to this package's compiled dist folder. */
export const DEFAULT_REGISTRY_PATH = resolve(HERE, "..", "..", "..", "registry", "skills.json");

export async function loadRegistry(path: string = DEFAULT_REGISTRY_PATH): Promise<SkillRegistry> {
  const raw = await readFile(path, "utf-8");
  return JSON.parse(raw) as SkillRegistry;
}

export function searchSkills(registry: SkillRegistry, query: string): Skill[] {
  const q = query.trim().toLowerCase();
  if (!q) return registry.skills;
  return registry.skills.filter((s) => {
    const haystack = [
      s.id,
      s.name,
      s.displayName ?? "",
      s.description,
      s.category,
      ...s.tags,
    ]
      .join(" ")
      .toLowerCase();
    return haystack.includes(q);
  });
}

export function getSkill(registry: SkillRegistry, id: string): Skill | undefined {
  return registry.skills.find((s) => s.id === id || s.name === id);
}

export function listCategories(registry: SkillRegistry): SkillCategory[] {
  return Array.from(new Set(registry.skills.map((s) => s.category))).sort() as SkillCategory[];
}
