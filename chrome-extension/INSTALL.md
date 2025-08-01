# Biirbal Chrome Extension - Installation Guide

## Quick Start

### Step 1: Install the Extension
1. Open Chrome and navigate to `chrome://extensions/`
2. Enable "Developer mode" by toggling the switch in the top right corner
3. Click "Load unpacked" button
4. Select the `chrome-extension` folder from this project
5. The Biirbal extension should now appear in your extensions list and toolbar

### Step 2: Add Extension Icons (Required)
The extension needs icon files to work properly. Create or add these icon files to the `chrome-extension/icons/` folder:

- `icon16.png` (16x16 pixels)
- `icon32.png` (32x32 pixels) 
- `icon48.png` (48x48 pixels)
- `icon128.png` (128x128 pixels)

**Temporary solution**: You can create simple placeholder icons:
1. Create 4 PNG files with the above names and sizes
2. Use any simple blue square or "B" text design
3. Save them in `chrome-extension/icons/`

### Step 3: Test the Extension
1. Make sure you're logged in to [biirbal.ai](https://biirbal.ai)
2. Navigate to any webpage (e.g., a news article)
3. Click the Biirbal extension icon in your Chrome toolbar
4. Select your team from the dropdown
5. Click "Save Link"

## Features

✅ **Save any webpage** - Click the extension icon and save the current page  
✅ **Team selection** - Choose which Biirbal team to save to  
✅ **Keyboard shortcut** - Press `Ctrl+Shift+B` to quick-save  
✅ **Context menu** - Right-click to save current page or links  
✅ **Authentication sync** - Uses your existing biirbal.ai login  

## Troubleshooting

### "Please log in to biirbal.ai first"
- Open biirbal.ai in a new tab and log in
- Refresh the extension popup
- Make sure you're using the same Chrome profile

### "No teams found"
- Ensure you're a member of at least one Biirbal team
- Try refreshing biirbal.ai and the extension

### Extension icon not showing
- Make sure you added the icon files to `/icons/` folder
- Refresh the extension in `chrome://extensions/`

### Links not processing
- Check that the website allows automated access
- Verify your internet connection
- Some sites behind paywalls or authentication may not work

## Development Mode

While using the extension in development mode:
1. Changes to the code require clicking "Reload" on the extension in `chrome://extensions/`
2. The extension will persist across browser restarts
3. Updates to `manifest.json` require a full reload

## Going to Production

To publish this extension:
1. Add proper icon files (PNG format, correct sizes)
2. Test thoroughly across different websites
3. Create a Chrome Web Store developer account
4. Package the extension as a .zip file
5. Submit to Chrome Web Store for review

## API Integration

The extension integrates with these Biirbal endpoints:
- `POST /api/extension/save-link` - Save webpage to team
- `GET /api/team/members` - Get user's teams  
- `GET /api/profile` - Verify authentication

Make sure the Biirbal backend is deployed and accessible at biirbal.ai for the extension to work properly.