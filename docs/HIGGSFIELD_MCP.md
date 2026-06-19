# Higgs Field MCP Connector - Setup Guide

## ✅ Verified Working

The Higgs Field MCP connector has been tested and confirmed working with **20 tools**.

## Quick Setup

### 1. Get API Keys

1. Go to [cloud.higgsfield.ai/api-keys](https://cloud.higgsfield.ai/api-keys)
2. Create an account or sign in
3. Generate your API key and secret

### 2. Configure Environment

```bash
# Add to your .env file
export HF_API_KEY=your_api_key_here
export HF_SECRET=your_secret_here
```

### 3. Configure OpenCode Studio

Edit `.opencode/mcp-servers.json`:

```json
{
  "version": "1.0",
  "mcpServers": {
    "higgsfield": {
      "name": "higgsfield",
      "description": "Higgsfield AI - Cinematic image and video generation",
      "command": "npx",
      "args": ["-y", "higgsfield-mcp"],
      "env": {
        "HF_API_KEY": "${HF_API_KEY}",
        "HF_SECRET": "${HF_SECRET}"
      },
      "enabled": true
    }
  }
}
```

## Available Tools (20 total)

### Image Generation
| Tool | Model | Description |
|------|-------|-------------|
| `generate_image` | Soul | High-quality images with style presets |
| `generate_image_reve` | Reve | Alternative image model |
| `generate_image_seedream` | Seedream v4 | ByteDance model |
| `edit_image_seedream` | Seedream v4 Edit | Edit existing images |

### Video Generation
| Tool | Model | Description |
|------|-------|-------------|
| `generate_video` | DoP | 5-second cinematic video |
| `generate_video_kling` | Kling v2.1 Pro | Professional video |
| `generate_video_seedance` | Seedance v1 Pro | ByteDance video |
| `generate_video_dop_standard` | DoP Standard | Standard quality video |

### Talking Head
| Tool | Description |
|------|-------------|
| `generate_talking_head` | Lip-sync video from image + WAV audio |

### Characters
| Tool | Description |
|------|-------------|
| `create_character` | Create reusable character (40 credits) |
| `list_characters` | List all characters |
| `get_character` | Get character by ID |
| `delete_character` | Delete a character |

### Utilities
| Tool | Description |
|------|-------------|
| `list_styles` | Available style presets |
| `list_motions` | Available motion presets |
| `get_generation_status` | Poll job status |
| `get_request_status` | Poll new-API status |
| `cancel_request` | Cancel queued job |
| `upload_image` | Upload image for generation |

## Usage Examples

### Generate an Image
```
opencode chat "Generate a cinematic portrait of a cyberpunk warrior using Higgs Field"
```

### Create a Talking Head Video
```
opencode chat "Create a talking head video - use the character_id abc123, upload my portrait.jpg and speech.wav"
```

### Generate a Video from Image
```
opencode chat "Convert the generated hero-image.png into a video with slow camera pan left"
```

## Pricing

| Operation | Credits | USD |
|-----------|---------|-----|
| Image 720p | 1.5 | $0.09 |
| Image 1080p | 3 | $0.19 |
| Video lite | 2 | $0.13 |
| Video turbo | 6.5 | $0.41 |
| Video standard | 9 | $0.56 |
| Character | 40 | $2.50 |

## Troubleshooting

### Missing API Keys

```
Warning: Missing HF_API_KEY and/or HF_SECRET environment variables
```

**Fix**: Set the environment variables:
```bash
export HF_API_KEY=your_key
export HF_SECRET=your_secret
```

### MCP Server Not Starting

```bash
# Test manually
npx -y higgsfield-mcp

# Check tools
echo '{"jsonrpc":"2.0","id":1,"method":"tools/list"}' | npx -y higgsfield-mcp
```

### Check Available Styles/Motions

```javascript
// In OpenCode Studio, ask:
"List all available Higgs Field styles"
"List all available Higgs Field motions"
```

## Integration with OpenCode Studio

Once configured, you can use natural language:

```
"Generate a futuristic cityscape image with Higgs Field"
"Create a video from the hero banner with dramatic camera movement"
"Make a talking head video using my uploaded portrait"
"Show me the Higgs Field style presets"
```

## Files Created

- `.opencode/mcp-servers.json` - Server configuration
- `scripts/test-higgsfield.js` - Test script
- `scripts/mcp-manager.js` - MCP server manager
