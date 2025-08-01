# Biirbal Chrome Extension

A Chrome extension that allows you to quickly save any webpage to your Biirbal team for AI-powered audio summaries.

## Features

- 🚀 **One-click save**: Save any webpage to your Biirbal team with a single click
- 🔐 **Seamless authentication**: Uses your existing biirbal.ai login session
- 👥 **Team selection**: Choose which team to save the link to
- ⌨️ **Keyboard shortcut**: Press `Ctrl+Shift+B` to quickly save the current page
- 🎯 **Context menu**: Right-click on any page or link to save to Biirbal
- 📱 **Responsive UI**: Clean, modern interface that works across all screen sizes

## Installation

### From Chrome Web Store (Coming Soon)
1. Visit the Chrome Web Store
2. Search for "Biirbal Link Saver"
3. Click "Add to Chrome"

### Developer Installation
1. Download or clone this repository
2. Open Chrome and go to `chrome://extensions/`
3. Enable "Developer mode" in the top right
4. Click "Load unpacked" and select the `chrome-extension` folder
5. The extension will be added to your Chrome toolbar

## Usage

### First Time Setup
1. Make sure you're logged in to [biirbal.ai](https://biirbal.ai)
2. Click the Biirbal extension icon in your Chrome toolbar
3. Select your team from the dropdown
4. Click "Save Link" to save the current webpage

### Saving Links
There are multiple ways to save links:

1. **Extension Popup**: Click the extension icon and press "Save Link"
2. **Keyboard Shortcut**: Press `Ctrl+Shift+B` on any webpage
3. **Context Menu**: Right-click on any page or link and select "Save to Biirbal"

### Authentication
The extension automatically uses your biirbal.ai login session. If you're not logged in:
1. Click "Open Biirbal" in the extension popup
2. Log in to your account
3. Return to the extension to start saving links

## API Integration

The extension integrates with the Biirbal API:
- **Endpoint**: `POST /api/extension/save-link`
- **Authentication**: Uses cookies from biirbal.ai domain
- **Team Management**: Fetches teams from `GET /api/team/members`

## Privacy & Security

- The extension only accesses the current tab when you explicitly save a link
- Authentication is handled through secure cookies from biirbal.ai
- No personal data is stored locally in the extension
- All communications use HTTPS

## Troubleshooting

### "Please log in to biirbal.ai first"
- Make sure you're logged in to biirbal.ai in the same Chrome profile
- Try refreshing the biirbal.ai page and logging in again
- Clear your browser cache and cookies for biirbal.ai

### "No teams found"
- Ensure you're a member of at least one Biirbal team
- Contact your team admin if you should have access but don't see any teams

### Links not processing
- Check your internet connection
- Verify the URL is accessible and not behind authentication
- Some websites may block automated processing

## Development

### Project Structure
```
chrome-extension/
├── manifest.json       # Extension configuration
├── popup.html         # Extension popup interface
├── popup.css          # Popup styling
├── popup.js           # Popup functionality
├── background.js      # Background service worker
├── content.js         # Content script for page integration
├── icons/             # Extension icons
└── README.md          # This file
```

### Building
The extension is built with vanilla JavaScript and requires no build process.

### Contributing
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## Version History

### v1.0.0
- Initial release
- Basic link saving functionality
- Team selection
- Authentication integration
- Keyboard shortcuts
- Context menu integration

## Support

For support, please:
1. Check the troubleshooting section above
2. Visit [biirbal.ai](https://biirbal.ai) for general support
3. Report bugs through the Chrome Web Store reviews

## License

This extension is part of the Biirbal platform. All rights reserved.