import { Command } from "commander";
import chalk from "chalk";
import { type PackageJson } from "type-fest";
import fs from "fs/promises";
import path from "path";
import os from "os";
import { pipeline } from "stream/promises";
import { createWriteStream } from "fs";
import { Readable } from "stream";

// Hardcoded current version to avoid importing package.json which can cause build issues with some bundlers
import packageJson from "../../package.json";

const REPO_OWNER = "lertsoft";
const REPO_NAME = "oura-ring-cli";
const REPO = `${REPO_OWNER}/${REPO_NAME}`;
const GITHUB_API_URL = `https://api.github.com/repos/${REPO}/releases/latest`;

export function createUpdateCommand(): Command {
    return new Command("update")
        .description("Check for updates and auto-update if available")
        .action(async () => {
            await checkForUpdates();
        });
}

async function checkForUpdates(): Promise<void> {
    console.log(chalk.dim("Checking for updates..."));

    try {
        const response = await fetch(GITHUB_API_URL);
        if (!response.ok) {
            throw new Error(`Failed to fetch release info: ${response.statusText}`);
        }

        const releaseData = await response.json() as any;
        const remoteVersion = releaseData.tag_name?.replace(/^v/, ""); // Remove 'v' prefix if present
        const localVersion = packageJson.version;

        if (!remoteVersion) {
            throw new Error("Could not parse remote version from release data.");
        }

        if (compareVersions(remoteVersion, localVersion) > 0) {
            console.log(chalk.green(`\n🚀 New version available: ${chalk.bold(remoteVersion)}`));
            console.log(chalk.dim(`Current version: ${localVersion}\n`));

            // Check if running as a binary or source
            const isBinary = process.execPath.includes("oura") || !process.argv[1]?.endsWith(".ts");

            if (!isBinary) {
                console.log(chalk.yellow("You seem to be running from source."));
                console.log("To update, run:");
                console.log(chalk.cyan("  git pull && bun install && bun build"));
                return;
            }

            console.log(chalk.cyan(`Automatically upgrading to ${remoteVersion}...`));
            // Pass the full tag name from releaseData if possible, defaulting to remoteVersion if tag_name missing
            const tagName = releaseData.tag_name || remoteVersion;
            await autoUpdate(tagName);

        } else {
            console.log(chalk.green("\n✅ You are up to date."));
            console.log(chalk.dim(`Current version: ${localVersion}`));
        }

    } catch (error) {
        console.error(chalk.red("\nError checking for updates:"), error instanceof Error ? error.message : error);
        process.exit(1);
    }
}

async function autoUpdate(tagName: string): Promise<void> {
    try {
        const platform = process.platform;
        const arch = process.arch;

        // Map to binary names
        // oura-darwin-arm64, oura-darwin-x64, oura-linux-x64, oura-linux-arm64, oura-windows-x64.exe
        let binaryName = "";
        let osName = "";

        if (platform === "darwin") osName = "darwin";
        else if (platform === "linux") osName = "linux";
        else if (platform === "win32") osName = "windows";
        else throw new Error(`Unsupported platform: ${platform}`);

        let archName = "";
        if (arch === "x64") archName = "x64";
        else if (arch === "arm64") archName = "arm64";
        else throw new Error(`Unsupported architecture: ${arch}`);

        binaryName = `oura-${osName}-${archName}`;
        if (platform === "win32") binaryName += ".exe";

        await performUpdate(tagName, binaryName);
    } catch (e) {
        console.error(chalk.red("Update failed:"), e instanceof Error ? e.message : e);
        process.exit(1);
    }
}

// Helper to actually implement the download and replace
// We need to pass the FULL tag name to this function
async function performUpdate(tagName: string, binaryName: string): Promise<void> {
    // Ensure tag has 'v' if it's a version number, though GitHub tags usually do.
    // releaseData.tag_name usually preserves it.
    // We simply use what we got.
    const downloadUrl = `https://github.com/${REPO}/releases/download/${tagName}/${binaryName}`;
    console.log(chalk.dim(`Downloading from: ${downloadUrl}`));

    const response = await fetch(downloadUrl);
    if (!response.ok) {
        throw new Error(`Failed to download binary (Status ${response.status}).\nURL: ${downloadUrl}`);
    }

    if (!response.body) throw new Error("Empty response body");

    // Create temp file
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "oura-update-"));
    const tempFilePath = path.join(tempDir, binaryName);

    // Write stream
    // @ts-ignore
    await pipeline(Readable.fromWeb(response.body as any), createWriteStream(tempFilePath));

    // Make executable
    if (process.platform !== "win32") {
        await fs.chmod(tempFilePath, 0o755);
    }

    // Replace current
    const currentPath = process.execPath;
    console.log(chalk.dim(`Installing to ${currentPath}...`));

    try {
        if (process.platform === "win32") {
            const oldPath = currentPath + ".old";
            try { await fs.unlink(oldPath); } catch { }
            await fs.rename(currentPath, oldPath);
        }

        await fs.rename(tempFilePath, currentPath);
    } catch (err) {
        // Cleanup
        await fs.rm(tempDir, { recursive: true, force: true });
        throw new Error(`Failed to replace binary: ${err instanceof Error ? err.message : err}. You may need sudo.`);
    }

    // Cleanup temp dir
    await fs.rm(tempDir, { recursive: true, force: true });

    console.log(chalk.green(`\n✅ Update complete! Version ${tagName} installed.`));
}


// Simple semver comparison
function compareVersions(v1: string, v2: string): number {
    const cleanV1 = v1.replace(/^v/, "");
    const cleanV2 = v2.replace(/^v/, "");
    const parts1 = cleanV1.split(".").map(Number);
    const parts2 = cleanV2.split(".").map(Number);

    for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
        const p1 = parts1[i] || 0;
        const p2 = parts2[i] || 0;

        if (p1 > p2) return 1;
        if (p1 < p2) return -1;
    }

    return 0;
}
