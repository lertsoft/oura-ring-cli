import { createServer, type Server } from "http";
import open from "open";
import { Config, saveConfig, loadConfig } from "../config/config";
import type { TokenResponse } from "../api/types";

const AUTH_URL = "https://cloud.ouraring.com/oauth/authorize";
const TOKEN_URL = "https://api.ouraring.com/oauth/token";
const REDIRECT_URI = "http://localhost:8080/callback";

const SCOPES = [
  "email",
  "personal",
  "daily",
  "heartrate",
  "workout",
  "tag",
  "session",
  "spo2",
  "stress",
  "ring_configuration",
  "cardiovascular",
  "heart_health",
];

export async function authenticate(
  clientId: string,
  clientSecret: string
): Promise<void> {
  console.log("Starting OAuth2 authentication flow...");

  // Build authorization URL
  const authParams = new URLSearchParams({
    response_type: "code",
    client_id: clientId,
    redirect_uri: REDIRECT_URI,
    scope: SCOPES.join(" "),
  });

  const authUrl = `${AUTH_URL}?${authParams.toString()}`;

  // Create a promise that resolves when we receive the callback
  const authCode = await new Promise<string>((resolve, reject) => {
    let server: Server;

    const timeoutId = setTimeout(() => {
      server?.close();
      reject(new Error("Authentication timed out after 5 minutes"));
    }, 5 * 60 * 1000);

    server = createServer((req, res) => {
      const url = new URL(req.url || "", `http://${req.headers.host}`);

      if (url.pathname === "/callback") {
        const code = url.searchParams.get("code");
        const error = url.searchParams.get("error");

        if (error) {
          res.writeHead(400, { "Content-Type": "text/html" });
          res.end(`
            <html>
              <body style="font-family: sans-serif; text-align: center; padding-top: 50px;">
                <h1>Authentication Failed</h1>
                <p>Error: ${error}</p>
                <p>You can close this window.</p>
              </body>
            </html>
          `);
          clearTimeout(timeoutId);
          server.close();
          reject(new Error(`OAuth error: ${error}`));
          return;
        }

        if (code) {
          res.writeHead(200, { "Content-Type": "text/html" });
          res.end(`
            <html>
              <body style="font-family: sans-serif; text-align: center; padding-top: 50px;">
                <h1>Authentication Successful!</h1>
                <p>You can close this window and return to the terminal.</p>
              </body>
            </html>
          `);
          clearTimeout(timeoutId);
          server.close();
          resolve(code);
        }
      }
    });

    server.listen(8080, () => {
      console.log("\nOpening browser for authentication...");
      console.log(`If the browser doesn't open, visit:\n${authUrl}\n`);
      open(authUrl).catch(() => {
        console.log("Could not open browser automatically.");
        console.log("Please copy and paste the URL above into your browser.");
      });
    });

    server.on("error", (err: NodeJS.ErrnoException) => {
      clearTimeout(timeoutId);
      if (err.code === "EADDRINUSE") {
        reject(
          new Error(
            "Port 8080 is already in use. Please close other applications using this port."
          )
        );
      } else {
        reject(err);
      }
    });
  });

  console.log("Received authorization code, exchanging for tokens...");

  // Exchange code for tokens
  const tokenResponse = await fetch(TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code: authCode,
      redirect_uri: REDIRECT_URI,
      client_id: clientId,
      client_secret: clientSecret,
    }),
  });

  if (!tokenResponse.ok) {
    const errorText = await tokenResponse.text();
    throw new Error(`Failed to exchange code for tokens: ${errorText}`);
  }

  const tokens: TokenResponse = await tokenResponse.json();

  // Calculate expiry time
  const expiry = new Date(Date.now() + tokens.expires_in * 1000).toISOString();

  // Save to config
  const config: Config = {
    client_id: clientId,
    client_secret: clientSecret,
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token,
    expiry,
  };

  await saveConfig(config);
  console.log("\nAuthentication successful! Tokens saved to config.");
}

export async function refreshAccessToken(config: Config): Promise<Config> {
  console.log("Refreshing access token...");

  const tokenResponse = await fetch(TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: config.refresh_token,
      client_id: config.client_id,
      client_secret: config.client_secret,
    }),
  });

  if (!tokenResponse.ok) {
    const errorText = await tokenResponse.text();
    throw new Error(
      `Failed to refresh token: ${errorText}. Please re-authenticate with 'oura auth'.`
    );
  }

  const tokens: TokenResponse = await tokenResponse.json();

  // Calculate expiry time
  const expiry = new Date(Date.now() + tokens.expires_in * 1000).toISOString();

  // Update config
  const newConfig: Config = {
    ...config,
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token || config.refresh_token,
    expiry,
  };

  await saveConfig(newConfig);
  console.log("Token refreshed successfully.");

  return newConfig;
}
