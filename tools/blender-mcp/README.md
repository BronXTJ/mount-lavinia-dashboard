---
uid: 3245985e-efb5-4249-9ff8-853d966f90d3
kind: element
title: Blender MCP setup (Cursor)
domain: tools
---

# Blender MCP setup (Cursor)

Blender MCP lets Cursor control Blender for 3D modeling and rendering.

## Files

- `addon.py` — install this inside Blender (required)

## One-time Blender setup

1. Open **Blender 5.1** (`C:\Program Files\Blender Foundation\Blender 5.1`).
2. **Edit → Preferences → Add-ons → Install from Disk…**
3. Select this file:
   `e:\mount-lavinia-dashboard\tools\blender-mcp\addon.py`
4. Enable **Interface: Blender MCP**.
5. In the 3D View, press **N** → open the **BlenderMCP** tab → click **Connect to Claude**.

## Cursor side

- MCP server `blender` is already in `C:\Users\User\.cursor\mcp.json`.
- Fully quit and reopen Cursor after first install so it picks up `uvx`.
- In Cursor Settings → MCP, confirm `blender` shows as connected/green.

## Usage

With Blender open and **Connect** clicked, ask Cursor things like:

- "Get the current Blender scene info"
- "Create a simple urban block massing on a ground plane"
- "Set up a sun light and camera, then render"

## Notes

- Keep only one Blender MCP client running (Cursor **or** Claude Desktop, not both).
- Telemetry is disabled in the MCP env (`DISABLE_TELEMETRY=true`).
