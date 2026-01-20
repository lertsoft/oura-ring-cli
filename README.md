# Oura Ring CLI (TypeScript/Bun)

A command-line interface for accessing your Oura Ring data, built with TypeScript and Bun.


## Quick Install

### One-line installer (macOS/Linux)

```bash
curl -fsSL https://raw.githubusercontent.com/lertsoft/oura-ring-cli/main/install.sh | sh
```

### Manual Download

Download the appropriate binary for your platform from the [Releases](https://github.com/lertsoft/oura-ring-cli/releases) page:

| Platform | Architecture | File |
|----------|--------------|------|
| macOS | Apple Silicon (M1/M2/M3) | `oura-darwin-arm64` |
| macOS | Intel | `oura-darwin-x64` |
| Linux | x64 | `oura-linux-x64` |
| Linux | ARM64 | `oura-linux-arm64` |
| Windows | x64 | `oura-windows-x64.exe` |

Then make it executable and move to your PATH:

```bash
chmod +x oura-darwin-arm64
sudo mv oura-darwin-arm64 /usr/local/bin/oura
```

### Build from Source

Requires [Bun](https://bun.sh) runtime:

```bash
cd oura-ring-cli
bun install
bun run build
./oura --help
```

## Getting Started

### 1. Get OAuth Credentials

Visit the [Oura Developer website](https://developer.ouraring.com) to create an application and get your Client ID and Secret.

> **Important**: Set your redirect URI to `http://localhost:8080/callback`

### 2. Authenticate

Run the interactive authentication:

```bash
oura auth
```

The CLI will guide you through:
- Entering your Client ID
- Entering your Client Secret
- Opening your browser to authorize the app

Your credentials and tokens are saved to `~/.config/oura-cli/config.json`.

### 3. Get Your Data

Run the interactive data explorer:

```bash
oura get
```

This shows a menu of all available data types organized by category:

```
📊 Oura Ring Data Explorer

? What data would you like to get?
👤 Personal
❯ Personal Info
  Ring Configuration

😴 Sleep
  Daily Sleep
  Sleep Details
  Optimal Bedtime

🏃 Activity
  Daily Activity
  Workouts
  Sessions

❤️ Heart & Body
  Heart Rate
  Blood Oxygen (SpO2)
  Cardiovascular Age
  VO2 Max

🧘 Wellness
  Readiness
  Stress
  Resilience
  Rest Mode
```

## Direct Commands

For automation or scripting, use direct commands:

```bash
# Personal information
oura get personal

# Sleep data with date range
oura get sleep --start 2024-01-01 --end 2024-01-07

# Activity data (short flags)
oura get activity -s 2024-01-01 -e 2024-01-07

# Other commands
oura get readiness
oura get heartrate
oura get workout
oura get spo2
oura get sleep-details
oura get sessions
oura get sleep-times
oura get stress
oura get resilience
oura get cv-age
oura get vo2-max
oura get ring-config
oura get rest-mode
oura get tags
```

## Building for All Platforms

Build binaries for all supported platforms:

```bash
bun run build:all
```

This creates binaries in the `dist/` folder:
- `dist/oura-darwin-arm64` (macOS Apple Silicon)
- `dist/oura-darwin-x64` (macOS Intel)
- `dist/oura-linux-x64` (Linux x64)
- `dist/oura-linux-arm64` (Linux ARM64)
- `dist/oura-windows-x64.exe` (Windows x64)

## Project Structure

```
oura-ring-cli/
├── package.json
├── tsconfig.json
├── install.sh              # One-line installer script
├── src/
│   ├── index.ts            # Entry point, CLI setup
│   ├── commands/
│   │   ├── auth.ts         # Interactive OAuth authentication
│   │   └── get.ts          # Interactive data explorer + commands
│   ├── api/
│   │   ├── client.ts       # OuraClient with fetch + token refresh
│   │   └── types.ts        # TypeScript interfaces for API responses
│   ├── auth/
│   │   └── oauth.ts        # OAuth2 flow implementation
│   └── config/
│       └── config.ts       # Configuration management
└── README.md
```

## Configuration

Configuration is stored in `~/.config/oura-cli/config.json`:

```json
{
  "client_id": "...",
  "client_secret": "...",
  "access_token": "...",
  "refresh_token": "...",
  "expiry": "2024-01-01T00:00:00.000Z"
}
```

## License

MIT
