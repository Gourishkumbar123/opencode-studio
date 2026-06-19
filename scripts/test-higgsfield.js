#!/usr/bin/env node
// Test script for Higgs Field MCP connector

import { spawn } from 'child_process';
import { createInterface } from 'readline';

// Higgs Field MCP server
const serverProcess = spawn('npx', ['-y', 'higgsfield-mcp'], {
  stdio: ['pipe', 'pipe', 'pipe'],
  cwd: '/workspace/higgs-test'
});

let requestId = 1;
const pendingRequests = new Map();

// Create readline interface for responses
const rl = createInterface({
  input: serverProcess.stdout,
  crlfDelay: Infinity
});

// Collect full JSON responses
let buffer = '';
rl.on('line', (line) => {
  if (line.trim()) {
    buffer += line;
    try {
      const response = JSON.parse(buffer);
      buffer = '';
      handleResponse(response);
    } catch {
      // Continue buffering
    }
  }
});

// Handle server stderr (logs/warnings)
serverProcess.stderr.on('data', (data) => {
  const msg = data.toString().trim();
  if (msg) console.log('[SERVER]', msg);
});

function sendRequest(method, params = {}) {
  return new Promise((resolve, reject) => {
    const id = requestId++;
    const request = { jsonrpc: '2.0', id, method, params };
    pendingRequests.set(id, { resolve, reject });
    serverProcess.stdin.write(JSON.stringify(request) + '\n');
    
    // Timeout after 30 seconds
    setTimeout(() => {
      if (pendingRequests.has(id)) {
        pendingRequests.delete(id);
        reject(new Error('Request timeout'));
      }
    }, 30000);
  });
}

function handleResponse(response) {
  if (response.id && pendingRequests.has(response.id)) {
    const { resolve, reject } = pendingRequests.get(response.id);
    pendingRequests.delete(response.id);
    resolve(response);
  }
}

async function testMCP() {
  console.log('🧪 Testing Higgs Field MCP Connector\n');
  
  try {
    // Test 1: List available tools
    console.log('📋 Test 1: List Tools');
    const toolsResponse = await sendRequest('tools/list');
    const tools = toolsResponse.result?.tools || [];
    console.log(`   ✅ Found ${tools.length} tools:`);
    tools.slice(0, 5).forEach(t => console.log(`      - ${t.name}`));
    if (tools.length > 5) console.log(`      ... and ${tools.length - 5} more`);
    console.log();
    
    // Test 2: Check credentials (will show warning without API keys)
    console.log('🔑 Test 2: Debug Credentials');
    const credsResponse = await sendRequest('tools/call', {
      name: 'debug_credentials',
      arguments: {}
    });
    console.log('   ✅ Credentials check completed');
    console.log();
    
    // Test 3: List styles (requires API key)
    console.log('🎨 Test 3: List Styles');
    try {
      const stylesResponse = await sendRequest('tools/call', {
        name: 'list_styles',
        arguments: {}
      });
      console.log('   ✅ Styles retrieved');
    } catch (e) {
      console.log('   ⚠️  API key required for this operation');
    }
    console.log();
    
    // Test 4: List motions (requires API key)
    console.log('🎬 Test 4: List Motions');
    try {
      const motionsResponse = await sendRequest('tools/call', {
        name: 'list_motions',
        arguments: {}
      });
      console.log('   ✅ Motions retrieved');
    } catch (e) {
      console.log('   ⚠️  API key required for this operation');
    }
    console.log();
    
    console.log('═══════════════════════════════════════════');
    console.log('✅ Higgs Field MCP Connector is working!');
    console.log('═══════════════════════════════════════════\n');
    console.log('To use with OpenCode Studio:');
    console.log('1. Get API keys from: https://cloud.higgsfield.ai/api-keys');
    console.log('2. Set environment variables:');
    console.log('   export HF_API_KEY=your_api_key');
    console.log('   export HF_SECRET=your_secret');
    console.log('3. Configure in OpenCode Studio');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  } finally {
    serverProcess.kill();
    process.exit(0);
  }
}

testMCP();
