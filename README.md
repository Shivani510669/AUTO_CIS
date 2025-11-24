# AutoCIS Guard 🛡️

AI-Powered CIS Benchmark Compliance & Auto-Remediation Tool

## Features

- ✅ Automatic OS Detection (Linux/Windows)
- ✅ CIS Benchmark Compliance Checking
- ✅ AI-Powered Remediation (Claude AI)
- ✅ Auto-Fix Failed Checks
- ✅ Professional Admin Dashboard
- ✅ Export Reports (JSON/PDF/CSV)

## Installation
```bash
git clone https://github.com/yourusername/autocis-guard.git
cd autocis-guard
npm install
```

## Usage

### Development
```bash
npm start
```

### Production Build
```bash
npm run build
npm run package
```

### Platform-Specific Builds
```bash
npm run package-linux   # Linux (.deb, .AppImage)
npm run package-win     # Windows (.exe)
```

## Requirements

- Node.js 16+
- Administrator/Root privileges
- Claude AI API access (handled automatically)

## Tech Stack

- **Frontend**: React 18, Tailwind CSS
- **Desktop**: Electron 28
- **AI**: Claude Sonnet 4 API
- **Security**: CIS Benchmarks

## License

MIT License - See LICENSE file

## Author

Your Name - 2024