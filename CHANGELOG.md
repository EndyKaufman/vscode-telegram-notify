# Changelog

All notable changes to the "Telegram Notify" extension will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - 2026-05-29

### Added
- Initial release of Telegram Notify extension
- Forward VS Code notifications to Telegram
- Interactive button support with callback synchronization
- Configuration wizard for bot setup
- Secure storage of bot tokens using VS Code secrets
- Filter notifications by severity (error, warning, info)
- Exclude specific notification sources
- Status bar indicator showing connection status
- Commands for setup, testing, toggling, and statistics
- Message formatting with Markdown support
- Button timeout and automatic cleanup
- Comprehensive logging to Output panel
- Test notification command
- Programmatic API for other extensions

### Features
- 🔔 Real-time notification forwarding to Telegram
- 🔘 Interactive inline keyboard buttons in Telegram
- 🔄 Bidirectional button sync (Telegram → VS Code)
- 🎛️ Configurable severity and source filters
- 🔒 Secure credential storage
- 📊 Notification statistics tracking
- ⚡ Status bar integration
- 📝 Comprehensive logging and error handling

### Known Limitations
- VS Code does not provide direct API to intercept all notifications
- Notifications must be sent via extension command
- Buttons require VS Code to be running when clicked
- Full automatic interception would require VS Code modifications
