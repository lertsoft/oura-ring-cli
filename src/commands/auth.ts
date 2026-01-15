import { Command } from "commander";
import { input, password, confirm } from "@inquirer/prompts";
import chalk from "chalk";
import { authenticate } from "../auth/oauth";
import { loadConfig, getConfigPath } from "../config/config";

const DEVELOPER_PORTAL_URL = "https://developer.ouraring.com";

export function createAuthCommand(): Command {
  const authCommand = new Command("auth")
    .description("Authenticate with Oura Ring API via OAuth2")
    .option("--client-id <id>", "OAuth2 Client ID")
    .option("--client-secret <secret>", "OAuth2 Client Secret")
    .action(async (options) => {
      try {
        // Load existing config to check for saved credentials
        const existingConfig = await loadConfig();
        const configPath = getConfigPath();

        // Get credentials from options, environment variables, or existing config
        let clientId =
          options.clientId ||
          process.env.OURA_CLIENT_ID ||
          existingConfig.client_id;

        let clientSecret =
          options.clientSecret ||
          process.env.OURA_CLIENT_SECRET ||
          existingConfig.client_secret;

        // Interactive prompt for Client ID if not provided
        if (!clientId) {
          console.log("\n" + chalk.cyan.bold("🔐 Oura Ring Authentication Setup\n"));
          console.log(
            chalk.dim("To authenticate with the Oura API, you need OAuth2 credentials.")
          );
          console.log(
            chalk.dim("If you don't have them yet, get them from the Oura Developer Portal:\n")
          );
          console.log(chalk.blue.underline(`  ${DEVELOPER_PORTAL_URL}\n`));
          console.log(
            chalk.dim(
              "1. Sign in or create a developer account\n" +
                "2. Create a new application\n" +
                "3. Set the redirect URI to: " +
                chalk.yellow("http://localhost:8080/callback") +
                "\n" +
                "4. Copy your Client ID and Client Secret\n"
            )
          );

          clientId = await input({
            message: "Enter your Oura Client ID:",
            validate: (value) => {
              if (!value.trim()) {
                return "Client ID is required";
              }
              return true;
            },
          });
        } else if (existingConfig.client_id) {
          // Show that we're using existing credentials
          const maskedId = maskCredential(clientId);
          console.log(
            chalk.dim(`\nUsing saved Client ID: ${maskedId}`)
          );
          
          const useExisting = await confirm({
            message: "Use the saved Client ID?",
            default: true,
          });

          if (!useExisting) {
            clientId = await input({
              message: "Enter your new Oura Client ID:",
              validate: (value) => {
                if (!value.trim()) {
                  return "Client ID is required";
                }
                return true;
              },
            });
          }
        }

        // Interactive prompt for Client Secret if not provided
        if (!clientSecret) {
          clientSecret = await password({
            message: "Enter your Oura Client Secret:",
            mask: "*",
            validate: (value) => {
              if (!value.trim()) {
                return "Client Secret is required";
              }
              return true;
            },
          });
        } else if (existingConfig.client_secret) {
          // Show that we're using existing credentials
          const maskedSecret = maskCredential(clientSecret);
          console.log(
            chalk.dim(`Using saved Client Secret: ${maskedSecret}`)
          );

          const useExisting = await confirm({
            message: "Use the saved Client Secret?",
            default: true,
          });

          if (!useExisting) {
            clientSecret = await password({
              message: "Enter your new Oura Client Secret:",
              mask: "*",
              validate: (value) => {
                if (!value.trim()) {
                  return "Client Secret is required";
                }
                return true;
              },
            });
          }
        }

        // Start authentication
        await authenticate(clientId, clientSecret);

        // Show where credentials are saved
        console.log("\n" + chalk.green.bold("✓ Authentication complete!\n"));
        console.log(chalk.dim("Your credentials and tokens are saved at:"));
        console.log(chalk.cyan(`  ${configPath}\n`));
        console.log(
          chalk.dim(
            "To update your credentials in the future, run " +
              chalk.yellow("oura auth") +
              " again,\nor edit the config file directly."
          )
        );
      } catch (error) {
        if (error instanceof Error && error.name === "ExitPromptError") {
          // User cancelled the prompt (Ctrl+C)
          console.log(chalk.yellow("\n\nAuthentication cancelled."));
          process.exit(0);
        }
        console.error(
          chalk.red("\nAuthentication failed:"),
          error instanceof Error ? error.message : error
        );
        process.exit(1);
      }
    });

  return authCommand;
}

/**
 * Mask a credential for display, showing only first 4 and last 4 characters
 */
function maskCredential(value: string): string {
  if (value.length <= 8) {
    return "*".repeat(value.length);
  }
  const first = value.slice(0, 4);
  const last = value.slice(-4);
  return `${first}${"*".repeat(Math.min(value.length - 8, 8))}${last}`;
}
