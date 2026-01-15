import { homedir } from "os";
import { join } from "path";
import { mkdir, readFile, writeFile } from "fs/promises";
import { existsSync } from "fs";

export interface Config {
  client_id: string;
  client_secret: string;
  access_token: string;
  refresh_token: string;
  expiry: string; // ISO date string
}

const CONFIG_DIR = join(homedir(), ".config", "oura-cli");
const CONFIG_FILE = join(CONFIG_DIR, "config.json");

export function getConfigDir(): string {
  return CONFIG_DIR;
}

export function getConfigPath(): string {
  return CONFIG_FILE;
}

export async function loadConfig(): Promise<Config> {
  const defaultConfig: Config = {
    client_id: "",
    client_secret: "",
    access_token: "",
    refresh_token: "",
    expiry: "",
  };

  try {
    if (!existsSync(CONFIG_FILE)) {
      return defaultConfig;
    }
    const content = await readFile(CONFIG_FILE, "utf-8");
    return { ...defaultConfig, ...JSON.parse(content) };
  } catch {
    return defaultConfig;
  }
}

export async function saveConfig(config: Config): Promise<void> {
  // Create config directory if it doesn't exist
  if (!existsSync(CONFIG_DIR)) {
    await mkdir(CONFIG_DIR, { recursive: true });
  }

  await writeFile(CONFIG_FILE, JSON.stringify(config, null, 2), "utf-8");
}

export function isTokenExpired(config: Config): boolean {
  if (!config.expiry) {
    return true;
  }
  const expiryDate = new Date(config.expiry);
  // Consider token expired if it expires within 5 minutes
  return expiryDate.getTime() - Date.now() < 5 * 60 * 1000;
}
