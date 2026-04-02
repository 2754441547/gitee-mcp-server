# Gitee MCP Server

Gitee 官方 MCP 服务，支持仓库管理、文件操作、Issue 管理等功能。

## 安装

```bash
pkg install nodejs git
mkdir -p ~/mcp && cd ~/mcp
git clone https://github.com/2754441547/gitee-mcp-server.git
cd gitee-mcp-server
npm install
```

## 配置

1. 获取 Gitee Token：https://gitee.com/personal_access_tokens
2. 设置环境变量并启动：

```bash
export GITEE_PERSONAL_ACCESS_TOKEN=你的Token
node index.js
```

## 功能

- `get_user_info` - 获取用户信息
- `list_repos` - 列出仓库
- `get_repo` - 获取仓库详情
- `list_contents` - 列出目录内容
- `get_file` - 获取文件内容
- `create_or_update_file` - 创建/更新文件
- `create_repo` - 创建仓库
- `list_issues` - 列出 Issue
- `fork_repo` - Fork 仓库