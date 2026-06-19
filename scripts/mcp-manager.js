#!/usr/bin/env node
// MCP Server Manager for OpenCode Studio
// Add, remove, and manage MCP connectors

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));

// MCP Server Registry - All available connectors
const MCP_SERVER_REGISTRY = {
  // AI & Media
  higgsfield: {
    name: 'higgsfield',
    description: 'Higgsfield AI - Cinematic image and video generation',
    command: 'npx',
    args: ['-y', 'higgsfield-mcp'],
    env: ['HF_API_KEY', 'HF_SECRET'],
    npmPackage: 'higgsfield-mcp',
    category: 'ai-media',
    tools: 20
  },
  
  // Version Control
  github: {
    name: 'github',
    description: 'GitHub - Issues, PRs, repos, and code search',
    command: 'npx',
    args: ['-y', '@modelcontextprotocol/server-github'],
    env: ['GITHUB_TOKEN'],
    npmPackage: '@modelcontextprotocol/server-github',
    category: 'vcs',
    tools: 15
  },
  gitlab: {
    name: 'gitlab',
    description: 'GitLab - Issues, MRs, and repos',
    command: 'npx',
    args: ['-y', '@modelcontextprotocol/server-gitlab'],
    env: ['GITLAB_TOKEN'],
    npmPackage: '@modelcontextprotocol/server-gitlab',
    category: 'vcs',
    tools: 12
  },
  
  // Productivity
  slack: {
    name: 'slack',
    description: 'Slack - Messaging and channel management',
    command: 'npx',
    args: ['-y', '@modelcontextprotocol/server-slack'],
    env: ['SLACK_BOT_TOKEN', 'SLACK_TEAM_ID'],
    npmPackage: '@modelcontextprotocol/server-slack',
    category: 'productivity',
    tools: 8
  },
  linear: {
    name: 'linear',
    description: 'Linear - Project management and issues',
    command: 'npx',
    args: ['-y', '@modelcontextprotocol/server-linear'],
    env: ['LINEAR_API_KEY'],
    npmPackage: '@modelcontextprotocol/server-linear',
    category: 'productivity',
    tools: 15
  },
  notion: {
    name: 'notion',
    description: 'Notion - Notes and documentation',
    command: 'npx',
    args: ['-y', '@modelcontextprotocol/server-notion'],
    env: ['NOTION_TOKEN'],
    npmPackage: '@modelcontextprotocol/server-notion',
    category: 'productivity',
    tools: 12
  },
  jira: {
    name: 'jira',
    description: 'Jira - Issue tracking and project management',
    command: 'npx',
    args: ['-y', '@modelcontextprotocol/server-jira'],
    env: ['JIRA_URL', 'JIRA_TOKEN', 'JIRA_EMAIL'],
    npmPackage: '@modelcontextprotocol/server-jira',
    category: 'productivity',
    tools: 15
  },
  
  // Databases
  postgres: {
    name: 'postgres',
    description: 'PostgreSQL - Database queries',
    command: 'npx',
    args: ['-y', '@modelcontextprotocol/server-postgres'],
    env: ['DATABASE_URL'],
    npmPackage: '@modelcontextprotocol/server-postgres',
    category: 'database',
    tools: 5
  },
  sqlite: {
    name: 'sqlite',
    description: 'SQLite - Local database queries',
    command: 'npx',
    args: ['-y', '@modelcontextprotocol/server-sqlite'],
    env: ['DATABASE_PATH'],
    npmPackage: '@modelcontextprotocol/server-sqlite',
    category: 'database',
    tools: 5
  },
  memory: {
    name: 'memory',
    description: 'Memory - Persistent knowledge graph',
    command: 'npx',
    args: ['-y', '@modelcontextprotocol/server-memory'],
    env: [],
    npmPackage: '@modelcontextprotocol/server-memory',
    category: 'database',
    tools: 5
  },
  
  // Cloud Services
  aws_kb: {
    name: 'aws-kb',
    description: 'AWS Knowledge Base - Bedrock RAG',
    command: 'npx',
    args: ['-y', '@modelcontextprotocol/server-aws-kb-retrieval-server'],
    env: ['AWS_ACCESS_KEY_ID', 'AWS_SECRET_ACCESS_KEY', 'AWS_REGION'],
    npmPackage: '@modelcontextprotocol/server-aws-kb-retrieval-server',
    category: 'cloud',
    tools: 5
  },
  google_maps: {
    name: 'google-maps',
    description: 'Google Maps - Locations and directions',
    command: 'npx',
    args: ['-y', '@modelcontextprotocol/server-google-maps'],
    env: ['GOOGLE_MAPS_API_KEY'],
    npmPackage: '@modelcontextprotocol/server-google-maps',
    category: 'cloud',
    tools: 8
  },
  brave_search: {
    name: 'brave-search',
    description: 'Brave Search - Web search',
    command: 'npx',
    args: ['-y', '@modelcontextprotocol/server-brave-search'],
    env: ['BRAVE_API_KEY'],
    npmPackage: '@modelcontextprotocol/server-brave-search',
    category: 'cloud',
    tools: 3
  },
  
  // Files & Browser
  filesystem: {
    name: 'filesystem',
    description: 'Filesystem - Read, write, and manage files',
    command: 'npx',
    args: ['-y', '@modelcontextprotocol/server-filesystem'],
    env: [],
    npmPackage: '@modelcontextprotocol/server-filesystem',
    category: 'files',
    tools: 10
  },
  fetch: {
    name: 'fetch',
    description: 'Fetch - HTTP requests and web scraping',
    command: 'npx',
    args: ['-y', '@modelcontextprotocol/server-fetch'],
    env: [],
    npmPackage: '@modelcontextprotocol/server-fetch',
    category: 'files',
    tools: 3
  },
  puppeteer: {
    name: 'puppeteer',
    description: 'Puppeteer - Browser automation',
    command: 'npx',
    args: ['-y', '@modelcontextprotocol/server-puppeteer'],
    env: [],
    npmPackage: '@modelcontextprotocol/server-puppeteer',
    category: 'files',
    tools: 10
  },
  everart: {
    name: 'everart',
    description: 'EverArt - AI image generation',
    command: 'npx',
    args: ['-y', '@modelcontextprotocol/server-everart'],
    env: ['EVERART_API_TOKEN'],
    npmPackage: '@modelcontextprotocol/server-everart',
    category: 'ai-media',
    tools: 5
  },
  sentry: {
    name: 'sentry',
    description: 'Sentry - Error tracking and monitoring',
    command: 'npx',
    args: ['-y', '@modelcontextprotocol/server-sentry'],
    env: ['SENTRY_AUTH_TOKEN', 'SENTRY_ORGANIZATION', 'SENTRY_PROJECT'],
    npmPackage: '@modelcontextprotocol/server-sentry',
    category: 'monitoring',
    tools: 8
  },
  
  // Sequential Thinking
  sequential_thinking: {
    name: 'sequential-thinking',
    description: 'Sequential Thinking - Chain of thought reasoning',
    command: 'npx',
    args: ['-y', '@modelcontextprotocol/server-sequential-thinking'],
    env: [],
    npmPackage: '@modelcontextprotocol/server-sequential-thinking',
    category: 'ai',
    tools: 3
  },
  
  // Everything
  everything: {
    name: 'everything',
    description: 'Everything - File search on Windows',
    command: 'npx',
    args: ['-y', '@modelcontextprotocol/server-everything'],
    env: [],
    npmPackage: '@modelcontextprotocol/server-everything',
    category: 'files',
    tools: 5
  }
};

function getConfigPath() {
  return join(__dirname, '..', '.opencode', 'mcp-servers.json');
}

function loadConfig() {
  const configPath = getConfigPath();
  if (existsSync(configPath)) {
    return JSON.parse(readFileSync(configPath, 'utf-8'));
  }
  return { version: '1.0', mcpServers: {} };
}

function saveConfig(config) {
  const configPath = getConfigPath();
  const dir = join(__dirname, '..', '.opencode');
  if (!existsSync(dir)) {
    import('fs').then(fs => fs.mkdirSync(dir, { recursive: true }));
  }
  writeFileSync(configPath, JSON.stringify(config, null, 2));
}

function addServer(serverName, options = {}) {
  const config = loadConfig();
  const serverDef = MCP_SERVER_REGISTRY[serverName];
  
  if (!serverDef && !options.command) {
    console.log(`❌ Unknown server: ${serverName}`);
    console.log('Run `mcp-manager.js registry` to see available servers');
    return;
  }
  
  if (serverDef) {
    // Registry server
    config.mcpServers[serverName] = {
      name: serverDef.name,
      description: serverDef.description,
      command: serverDef.command,
      args: serverDef.args,
      env: serverDef.env.reduce((acc, key) => ({ ...acc, [key]: process.env[key] || '' }), {}),
      enabled: true,
      ...options
    };
  } else {
    // Custom server
    config.mcpServers[serverName] = {
      name: serverName,
      ...options
    };
  }
  
  saveConfig(config);
  console.log(`✅ Added MCP server: ${serverName}`);
  if (serverDef?.env?.length) {
    console.log(`   Required env vars: ${serverDef.env.join(', ')}`);
  }
}

function removeServer(serverName) {
  const config = loadConfig();
  if (config.mcpServers[serverName]) {
    delete config.mcpServers[serverName];
    saveConfig(config);
    console.log(`✅ Removed MCP server: ${serverName}`);
  } else {
    console.log(`❌ Server not found: ${serverName}`);
  }
}

function listServers() {
  const config = loadConfig();
  console.log('\n📦 MCP Servers in OpenCode Studio:\n');
  
  const servers = Object.entries(config.mcpServers || {});
  if (servers.length === 0) {
    console.log('   No MCP servers configured.');
    console.log('   Run `mcp-manager.js add <name>` to add one.');
  }
  
  for (const [name, server] of servers) {
    const status = server.enabled ? '✅' : '❌';
    console.log(`  ${status} ${name}`);
    console.log(`     ${server.description || 'No description'}`);
    console.log(`     Command: ${server.command} ${(server.args || []).join(' ')}`);
    if (server.env) {
      const envKeys = Object.keys(server.env).filter(k => server.env[k]);
      if (envKeys.length) {
        console.log(`     Env vars set: ${envKeys.join(', ')}`);
      } else {
        console.log(`     ⚠️  No env vars set`);
      }
    }
    console.log();
  }
}

function listByCategory() {
  const categories = {};
  
  for (const [name, def] of Object.entries(MCP_SERVER_REGISTRY)) {
    if (!categories[def.category]) {
      categories[def.category] = [];
    }
    categories[def.category].push({ name, ...def });
  }
  
  const categoryNames = {
    'ai-media': '🤖 AI & Media',
    'vcs': '📂 Version Control',
    'productivity': '📋 Productivity',
    'database': '💾 Databases',
    'cloud': '☁️ Cloud Services',
    'files': '📁 Files & Browser',
    'monitoring': '📊 Monitoring',
    'ai': '🧠 AI Tools'
  };
  
  console.log('\n📦 Available MCP Servers by Category:\n');
  
  for (const [cat, servers] of Object.entries(categories)) {
    console.log(`\n${categoryNames[cat] || cat}:`);
    for (const s of servers) {
      console.log(`   • ${s.name} (${s.tools} tools) - ${s.description}`);
    }
  }
  console.log();
}

function generateEnvExample() {
  const config = loadConfig();
  console.log('\n# Add these to your .env file:\n');
  
  for (const server of Object.values(config.mcpServers || {})) {
    if (server.env) {
      for (const key of Object.keys(server.env)) {
        console.log(`# ${key}`);
        console.log(`${key}=your_${key.toLowerCase()}_here`);
        console.log();
      }
    }
  }
}

async function testServer(serverName) {
  const config = loadConfig();
  const server = config.mcpServers?.[serverName];
  
  if (!server) {
    console.log(`❌ Server not found: ${serverName}`);
    return;
  }
  
  console.log(`\n🧪 Testing MCP server: ${serverName}\n`);
  
  return new Promise((resolve) => {
    const proc = spawn(server.command, server.args, {
      stdio: ['pipe', 'pipe', 'pipe']
    });
    
    let buffer = '';
    
    proc.stdout.on('data', (data) => {
      buffer += data.toString();
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';
      
      for (const line of lines) {
        if (line.trim()) {
          try {
            const resp = JSON.parse(line);
            if (resp.result?.tools) {
              console.log(`✅ Server responded with ${resp.result.tools.length} tools`);
              proc.kill();
              resolve(true);
            }
          } catch {}
        }
      }
    });
    
    proc.stderr.on('data', (data) => {
      const msg = data.toString().trim();
      if (msg && !msg.includes('Warning')) {
        console.log(`[SERVER] ${msg}`);
      }
    });
    
    // Send tools/list request
    setTimeout(() => {
      proc.stdin.write(JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/list' }) + '\n');
    }, 500);
    
    // Timeout
    setTimeout(() => {
      console.log('❌ Server test timed out');
      proc.kill();
      resolve(false);
    }, 10000);
  });
}

async function installAllServers() {
  console.log('\n📦 Installing all MCP server packages...\n');
  
  const packages = new Set();
  for (const def of Object.values(MCP_SERVER_REGISTRY)) {
    if (def.npmPackage) {
      packages.add(def.npmPackage);
    }
  }
  
  for (const pkg of packages) {
    console.log(`Installing ${pkg}...`);
    try {
      await new Promise((resolve, reject) => {
        const proc = spawn('npm', ['install', '-g', pkg], { stdio: 'inherit' });
        proc.on('close', (code) => code === 0 ? resolve() : reject());
      });
      console.log(`✅ ${pkg}`);
    } catch {
      console.log(`⚠️  ${pkg} (may need API keys)`);
    }
  }
  
  console.log('\n✅ Installation complete!');
}

// CLI Interface
const args = process.argv.slice(2);
const command = args[0];

async function main() {
  switch (command) {
    case 'add':
      addServer(args[1], args[2] ? JSON.parse(args[2]) : {});
      break;
    case 'remove':
      removeServer(args[1]);
      break;
    case 'list':
      listServers();
      break;
    case 'env':
      generateEnvExample();
      break;
    case 'registry':
    case 'browse':
      listByCategory();
      break;
    case 'test':
      await testServer(args[1] || 'higgsfield');
      break;
    case 'install':
      await installAllServers();
      break;
    case 'init':
      // Add recommended servers
      addServer('higgsfield');
      addServer('github');
      addServer('filesystem');
      addServer('memory');
      console.log('\n✅ Added Higgsfield, GitHub, Filesystem, and Memory servers');
      break;
    case 'quick':
      // Quick start with just Higgs Field
      addServer('higgsfield');
      console.log('\n✅ Added Higgs Field! Get your API keys at https://cloud.higgsfield.ai/api-keys');
      break;
    default:
      console.log(`
🔧 OpenCode Studio MCP Manager

Usage:
  mcp-manager.js add <name>              Add server from registry
  mcp-manager.js remove <name>           Remove server
  mcp-manager.js list                    List configured servers
  mcp-manager.js registry                 Browse available servers
  mcp-manager.js env                     Generate .env variables
  mcp-manager.js test <name>            Test a server connection
  mcp-manager.js install                 Install all MCP packages
  mcp-manager.js init                    Add recommended servers
  mcp-manager.js quick                   Add Higgs Field only

Examples:
  mcp-manager.js quick                    # Start with Higgs Field
  mcp-manager.js init                    # Add recommended servers
  mcp-manager.js add github              # Add GitHub
  mcp-manager.js add postgres             # Add PostgreSQL
  mcp-manager.js list                    # See what's configured
  mcp-manager.js test higgsfield         # Test Higgs Field
`);
  }
}

main();
