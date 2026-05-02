import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import type { SkillRegistry } from "@skills-market/registry";

const REGISTRY_PATH =
  process.env.SKILLS_MARKET_REGISTRY_PATH ??
  resolve(process.cwd(), "..", "..", "registry", "skills.json");

export async function getRegistry(): Promise<SkillRegistry> {
  const raw = await readFile(REGISTRY_PATH, "utf-8");
  return JSON.parse(raw) as SkillRegistry;
}
