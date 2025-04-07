# Cache Catch - Chrome Extension

A Chrome extension that allows you to view cookies, local storage, and session storage data for the current website you're visiting.

## Features

- View all cookies for the current domain
- Inspect local storage data
- Check session storage contents
- Clean, modern interface with tabbed navigation
- Real-time data updates

## Installation

1. Clone or download this repository
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" in the top right corner
4. Click "Load unpacked" and select the directory containing this extension
5. The Cache Catch icon should now appear in your Chrome toolbar

## Usage

1. Click the Cache Catch icon in your Chrome toolbar while on any website
2. The popup will show three tabs:
   - Cookies: Shows all cookies for the current domain
   - Local Storage: Displays all local storage entries
   - Session Storage: Shows all session storage data
3. Click between tabs to view different types of storage data
4. All data is displayed in a key-value format for easy reading

## Permissions

This extension requires the following permissions:
- `activeTab`: To access the current tab's URL
- `cookies`: To read cookie data
- `storage`: To access storage APIs
- `<all_urls>`: To work on any website

## Security

This extension only reads storage data and does not modify or transmit any information. All data processing happens locally in your browser.

## Development

To modify or enhance the extension:
1. Make your changes to the source files
2. Go to `chrome://extensions/`
3. Click the refresh icon on the extension card
4. Your changes will be immediately reflected

## License

MIT License - Feel free to use and modify as needed. 