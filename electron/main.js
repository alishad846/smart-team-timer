import { app, BrowserWindow, ipcMain } from "electron";
import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { ActivityCollector } from "./tracker/collector.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let mainWindow;
let collector;

function getUserDataFile() {
  return path.join(app.getPath("userData"), "tracker-config.json");
}

async function loadDotEnv() {
  const envPath = path.join(process.cwd(), ".env");

  try {
    const raw = await fs.readFile(envPath, "utf8");
    const parsed = {};

    for (const line of raw.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;

      const equalsIndex = trimmed.indexOf("=");
      if (equalsIndex < 0) continue;

      const key = trimmed.slice(0, equalsIndex).trim();
      let value = trimmed.slice(equalsIndex + 1).trim();

      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }

      if (key && !(key in process.env)) {
        parsed[key] = value;
      }
    }

    Object.assign(process.env, parsed);
  } catch {
    // Optional. The tracker can still be configured manually through the UI.
  }
}

async function loadConfig() {
  const defaultConfig = {
    apiUrl: process.env.TRACKER_API_URL ?? "https://smart-team-timer.vercel.app",
    accessToken: process.env.TRACKER_SHARED_SECRET ?? process.env.SUPABASE_SERVICE_ROLE_KEY ?? "",
    userId: process.env.TRACKER_USER_ID ?? "",
    organizationId: process.env.TRACKER_ORGANIZATION_ID ?? "",
    teamId: process.env.TRACKER_TEAM_ID ?? "",
    captureScreenshots: true,
    screenshotIntervalMinutes: 5
  };

  try {
    const raw = await fs.readFile(getUserDataFile(), "utf8");
    const config = JSON.parse(raw);
    const savedAccessToken =
      typeof config.accessToken === "string" && config.accessToken.trim().length > 0
        ? config.accessToken
        : defaultConfig.accessToken;

    return {
      ...defaultConfig,
      ...config,
      accessToken: savedAccessToken,
      captureScreenshots: config.captureScreenshots ?? defaultConfig.captureScreenshots,
      screenshotIntervalMinutes: defaultConfig.screenshotIntervalMinutes
    };
  } catch {
    return defaultConfig;
  }
}

async function saveConfig(nextConfig) {
  await fs.mkdir(path.dirname(getUserDataFile()), { recursive: true });
  await fs.writeFile(getUserDataFile(), JSON.stringify(nextConfig, null, 2), "utf8");
  return nextConfig;
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 520,
    height: 680,
    minWidth: 460,
    minHeight: 620,
    backgroundColor: "#020617",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  mainWindow.loadFile(path.join(__dirname, "renderer", "index.html"));
  mainWindow.webContents.openDevTools();
}

async function bootTracker() {
  const config = await loadConfig();
  collector = new ActivityCollector({
    config,
    onStatusChange: (status) => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send("tracker:status", status);
      }
    }
  });

  await collector.start();
}

app.whenReady().then(async () => {
  await loadDotEnv();
  createWindow();
  await bootTracker();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

ipcMain.handle("tracker:get-config", async () => loadConfig());

ipcMain.handle("tracker:save-config", async (_event, nextConfig) => {
  await saveConfig(nextConfig);
  if (collector) {
    await collector.updateConfig(nextConfig);
  }
  return { ok: true };
});

ipcMain.handle("tracker:login", async (_event, credentials) => {
  try {
    const { apiUrl, email, password } = credentials;
    const response = await fetch(`${apiUrl}/api/tracker/auth`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, password }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return { ok: false, error: errorData.error || "Login failed" };
    }

    const data = await response.json();
    
    // Save to config and start tracker
    const nextConfig = {
      ...(await loadConfig()),
      apiUrl,
      userId: data.userId,
      organizationId: data.organizationId,
      teamId: data.teamId,
      accessToken: data.accessToken,
    };
    
    await saveConfig(nextConfig);
    if (collector) {
      await collector.updateConfig(nextConfig);
    }

    return { ok: true };
  } catch (error) {
    return { ok: false, error: error.message };
  }
});

ipcMain.handle("tracker:logout", async () => {
  const currentConfig = await loadConfig();
  const nextConfig = {
    ...currentConfig,
    userId: "",
    organizationId: "",
    teamId: "",
    accessToken: "",
  };
  await saveConfig(nextConfig);
  if (collector) {
    await collector.updateConfig(nextConfig);
  }
  return { ok: true };
});

ipcMain.handle("tracker:toggle-pause", async () => {
  if (!collector) return { paused: false };
  return collector.togglePause();
});

ipcMain.handle("tracker:send-sample", async () => {
  if (!collector) return { ok: false };
  return collector.collectOnce();
});
