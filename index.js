#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

const GITEE_TOKEN = process.env.GITEE_PERSONAL_ACCESS_TOKEN;
const GITEE_API = process.env.GITEE_API_BASE_URL || "https://gitee.com/api/v5";

if (!GITEE_TOKEN) {
  console.error("Error: GITEE_PERSONAL_ACCESS_TOKEN environment variable is required");
  process.exit(1);
}

async function giteeApi(endpoint, options = {}) {
  const url = `${GITEE_API}${endpoint}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      "Authorization": `token ${GITEE_TOKEN}`,
      ...options.headers,
    },
  });
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Gitee API error: ${response.status} - ${error}`);
  }
  return response.json();
}

const server = new McpServer({ name: "gitee-mcp-server", version: "1.0.0" });

server.tool("get_user_info", "获取当前Gitee用户信息", {}, async () => {
  const data = await giteeApi("/user");
  return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
});

server.tool("list_repos", "列出用户的仓库列表", {
  page: z.number().optional().default(1),
  per_page: z.number().optional().default(20),
}, async ({ page, per_page }) => {
  const data = await giteeApi(`/user/repos?page=${page}&per_page=${per_page}&sort=updated`);
  const repos = data.map(r => `${r.full_name} - ${r.description || "无描述"} (⭐${r.stargazers_count})`);
  return { content: [{ type: "text", text: repos.join("\n") }] };
});

server.tool("get_repo", "获取仓库详细信息", {
  owner: z.string(),
  repo: z.string(),
}, async ({ owner, repo }) => {
  const data = await giteeApi(`/repos/${owner}/${repo}`);
  return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
});

server.tool("list_contents", "列出仓库目录内容", {
  owner: z.string(),
  repo: z.string(),
  path: z.string().optional().default(""),
  ref: z.string().optional().default("master"),
}, async ({ owner, repo, path, ref }) => {
  const data = await giteeApi(`/repos/${owner}/${repo}/contents/${path}?ref=${ref}`);
  const contents = Array.isArray(data)
    ? data.map(f => `${f.type === "dir" ? "📁" : "📄"} ${f.name}`)
    : [`📄 ${data.name}`];
  return { content: [{ type: "text", text: contents.join("\n") }] };
});

server.tool("get_file", "获取文件内容", {
  owner: z.string(),
  repo: z.string(),
  path: z.string(),
  ref: z.string().optional().default("master"),
}, async ({ owner, repo, path, ref }) => {
  const data = await giteeApi(`/repos/${owner}/${repo}/contents/${path}?ref=${ref}`);
  const content = Buffer.from(data.content, "base64").toString("utf-8");
  return { content: [{ type: "text", text: content }] };
});

server.tool("create_or_update_file", "创建或更新仓库文件", {
  owner: z.string(),
  repo: z.string(),
  path: z.string(),
  content: z.string(),
  message: z.string(),
  branch: z.string().optional().default("master"),
  sha: z.string().optional(),
}, async ({ owner, repo, path, content, message, branch, sha }) => {
  const body = { content: Buffer.from(content).toString("base64"), message, branch };
  if (sha) body.sha = sha;
  const data = await giteeApi(`/repos/${owner}/${repo}/contents/${path}`, {
    method: "PUT",
    body: JSON.stringify(body),
  });
  return { content: [{ type: "text", text: `文件 ${path} 已${sha ? "更新" : "创建"}` }] };
});

server.tool("create_repo", "创建新仓库", {
  name: z.string(),
  description: z.string().optional(),
  private: z.boolean().optional().default(false),
}, async ({ name, description, private: isPrivate }) => {
  const data = await giteeApi("/user/repos", {
    method: "POST",
    body: JSON.stringify({ name, description, private: isPrivate }),
  });
  return { content: [{ type: "text", text: `仓库已创建: ${data.html_url}` }] };
});

server.tool("list_issues", "列出仓库的Issue", {
  owner: z.string(),
  repo: z.string(),
  state: z.enum(["open", "closed", "all"]).optional().default("open"),
}, async ({ owner, repo, state }) => {
  const data = await giteeApi(`/repos/${owner}/${repo}/issues?state=${state}`);
  const issues = data.map(i => `#${i.number} [${i.state}] ${i.title}`);
  return { content: [{ type: "text", text: issues.length ? issues.join("\n") : "暂无Issue" }] };
});

server.tool("fork_repo", "Fork仓库到当前用户", {
  owner: z.string(),
  repo: z.string(),
}, async ({ owner, repo }) => {
  const data = await giteeApi(`/repos/${owner}/${repo}/forks`, { method: "POST" });
  return { content: [{ type: "text", text: `Fork成功: ${data.html_url}` }] };
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Gitee MCP Server running on stdio");
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});