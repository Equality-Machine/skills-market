#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListResourcesRequestSchema,
  ListToolsRequestSchema,
  ReadResourceRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import {
  loadRegistry,
  searchSkills,
  getSkill,
  listCategories,
  type Skill,
  type SkillRegistry,
} from "@skills-market/registry";
import { spawn } from "node:child_process";
import { resolve } from "node:path";

const REGISTRY_URL = process.env.SKILLS_MARKET_REGISTRY_URL;
const REGISTRY_PATH =
  process.env.SKILLS_MARKET_REGISTRY_PATH ??
  resolve(process.cwd(), "registry", "skills.json");

async function fetchRegistry(): Promise<SkillRegistry> {
  if (REGISTRY_URL) {
    const res = await fetch(REGISTRY_URL);
    if (!res.ok) throw new Error(`Failed to fetch registry: ${res.status}`);
    return (await res.json()) as SkillRegistry;
  }
  return await loadRegistry(REGISTRY_PATH);
}

function skillSummary(s: Skill): string {
  return `- ${s.displayName ?? s.name} (${s.id}) v${s.version} — ${s.description}\n  category: ${s.category}, tags: ${s.tags.join(", ")}, install: \`${s.install.command ?? s.install.package ?? s.install.type}\``;
}

function skillDetail(s: Skill): string {
  return [
    `# ${s.displayName ?? s.name} (${s.id})`,
    "",
    s.description,
    "",
    `- **version:** ${s.version}`,
    `- **author:** ${s.author.name}${s.author.email ? ` <${s.author.email}>` : ""}`,
    `- **category:** ${s.category}`,
    `- **tags:** ${s.tags.join(", ")}`,
    `- **license:** ${s.license ?? "unspecified"}`,
    `- **homepage:** ${s.homepage ?? "n/a"}`,
    `- **verified:** ${s.verified ? "yes" : "no"}`,
    `- **downloads:** ${s.downloads}`,
    "",
    "## Install",
    "",
    "```bash",
    s.install.command ?? `npx -y ${s.install.package ?? s.name} install`,
    "```",
  ].join("\n");
}

const server = new Server(
  {
    name: "skills-market",
    version: "0.1.0",
  },
  {
    capabilities: {
      tools: {},
      resources: {},
    },
  }
);

server.setRequestHandler(ListResourcesRequestSchema, async () => {
  const registry = await fetchRegistry();
  return {
    resources: [
      {
        uri: "skills-market://registry",
        name: "Full skills registry",
        description: `Catalog of ${registry.skills.length} skills available on skills-market.`,
        mimeType: "application/json",
      },
      ...registry.skills.map((s) => ({
        uri: `skills-market://skill/${s.id}`,
        name: s.displayName ?? s.name,
        description: s.description,
        mimeType: "text/markdown",
      })),
    ],
  };
});

server.setRequestHandler(ReadResourceRequestSchema, async (req) => {
  const uri = req.params.uri;
  const registry = await fetchRegistry();
  if (uri === "skills-market://registry") {
    return {
      contents: [
        {
          uri,
          mimeType: "application/json",
          text: JSON.stringify(registry, null, 2),
        },
      ],
    };
  }
  const match = uri.match(/^skills-market:\/\/skill\/(.+)$/);
  if (match) {
    const skill = getSkill(registry, match[1]);
    if (!skill) {
      throw new Error(`Skill not found: ${match[1]}`);
    }
    return {
      contents: [
        {
          uri,
          mimeType: "text/markdown",
          text: skillDetail(skill),
        },
      ],
    };
  }
  throw new Error(`Unknown resource: ${uri}`);
});

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: "list_skills",
      description:
        "List all skills available on skills-market. Returns a markdown summary of every skill with its NPX install command.",
      inputSchema: {
        type: "object",
        properties: {
          category: {
            type: "string",
            description: "Optional category filter (e.g. development, design).",
          },
        },
        additionalProperties: false,
      },
    },
    {
      name: "search_skills",
      description:
        "Full-text search across the skill catalog by name, description, category, and tags.",
      inputSchema: {
        type: "object",
        properties: {
          query: { type: "string", description: "Free-text query." },
        },
        required: ["query"],
        additionalProperties: false,
      },
    },
    {
      name: "get_skill",
      description: "Fetch full metadata and install command for a single skill by id or name.",
      inputSchema: {
        type: "object",
        properties: {
          id: { type: "string", description: "Skill id or name." },
        },
        required: ["id"],
        additionalProperties: false,
      },
    },
    {
      name: "install_skill",
      description:
        "Run the NPX install command for a given skill. By default returns the command without executing; pass `confirm: true` to actually run it on the user's machine.",
      inputSchema: {
        type: "object",
        properties: {
          id: { type: "string", description: "Skill id or name." },
          confirm: {
            type: "boolean",
            description: "Set to true to execute the install command on this machine.",
            default: false,
          },
        },
        required: ["id"],
        additionalProperties: false,
      },
    },
    {
      name: "list_categories",
      description: "List all categories present in the registry.",
      inputSchema: { type: "object", properties: {}, additionalProperties: false },
    },
  ],
}));

server.setRequestHandler(CallToolRequestSchema, async (req) => {
  const { name, arguments: args } = req.params;
  const registry = await fetchRegistry();

  switch (name) {
    case "list_skills": {
      const category = (args?.category as string | undefined)?.toLowerCase();
      const skills = category
        ? registry.skills.filter((s) => s.category.toLowerCase() === category)
        : registry.skills;
      const text = skills.length
        ? `Found ${skills.length} skill(s):\n\n${skills.map(skillSummary).join("\n\n")}`
        : "No skills matched.";
      return { content: [{ type: "text", text }] };
    }

    case "search_skills": {
      const query = String(args?.query ?? "");
      const skills = searchSkills(registry, query);
      const text = skills.length
        ? `Found ${skills.length} skill(s) for "${query}":\n\n${skills.map(skillSummary).join("\n\n")}`
        : `No skills matched "${query}".`;
      return { content: [{ type: "text", text }] };
    }

    case "get_skill": {
      const id = String(args?.id ?? "");
      const skill = getSkill(registry, id);
      if (!skill) {
        return {
          isError: true,
          content: [{ type: "text", text: `Skill not found: ${id}` }],
        };
      }
      return { content: [{ type: "text", text: skillDetail(skill) }] };
    }

    case "install_skill": {
      const id = String(args?.id ?? "");
      const confirm = Boolean(args?.confirm);
      const skill = getSkill(registry, id);
      if (!skill) {
        return {
          isError: true,
          content: [{ type: "text", text: `Skill not found: ${id}` }],
        };
      }
      const cmd = skill.install.command ?? `npx -y ${skill.install.package ?? skill.name} install`;
      if (!confirm) {
        return {
          content: [
            {
              type: "text",
              text: `Ready to install **${skill.displayName ?? skill.name}** with:\n\n\`${cmd}\`\n\nRe-run with confirm=true to execute.`,
            },
          ],
        };
      }
      const output = await runShell(cmd);
      return { content: [{ type: "text", text: output }] };
    }

    case "list_categories": {
      const cats = listCategories(registry);
      return {
        content: [
          {
            type: "text",
            text: cats.length ? `Categories:\n- ${cats.join("\n- ")}` : "No categories.",
          },
        ],
      };
    }

    default:
      return {
        isError: true,
        content: [{ type: "text", text: `Unknown tool: ${name}` }],
      };
  }
});

function runShell(command: string): Promise<string> {
  return new Promise((resolvePromise) => {
    const child = spawn("sh", ["-c", command], { stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (b) => (stdout += b.toString()));
    child.stderr.on("data", (b) => (stderr += b.toString()));
    child.on("close", (code) => {
      resolvePromise(
        `Exit ${code}\n\n--- stdout ---\n${stdout || "(empty)"}\n\n--- stderr ---\n${stderr || "(empty)"}`
      );
    });
  });
}

const transport = new StdioServerTransport();
await server.connect(transport);
console.error("[skills-market] MCP server ready on stdio");
