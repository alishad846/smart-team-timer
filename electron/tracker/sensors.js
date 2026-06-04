import { powerMonitor } from "electron";

let keyboardEvents = 0;
let mouseEvents = 0;
let hookStarted = false;
let lastInputAt = Date.now();

export async function startInputHooks() {
  if (hookStarted) return;
  hookStarted = true;

  try {
    const iohookModule = await import("iohook");
    const iohook = iohookModule.default ?? iohookModule;
    const markInput = () => {
      lastInputAt = Date.now();
    };

    iohook.on("keydown", () => {
      markInput();
      keyboardEvents += 1;
    });
    iohook.on("mousedown", () => {
      markInput();
      mouseEvents += 1;
    });
    iohook.on("mousemove", () => {
      markInput();
      mouseEvents += 1;
    });
    iohook.start();
  } catch {
    // Optional dependency. The tracker still works with idle and active window data only.
  }
}

export async function getActiveWindowState() {
  try {
    const windowsModule = await import("get-windows");
    const activeWindow = windowsModule.activeWindow ?? windowsModule.default?.activeWindow;
    const active = activeWindow ? await activeWindow() : undefined;
    return {
      app: active?.owner?.name ?? "Unknown",
      title: active?.title ?? "",
      website: active?.url ?? ""
    };
  } catch {
    return {
      app: "Unknown",
      title: "",
      website: ""
    };
  }
}

export function sampleActivity(intervalSeconds = 30) {
  const systemIdleSeconds = powerMonitor.getSystemIdleTime();
  const hookIdleSeconds = Math.max(0, Math.round((Date.now() - lastInputAt) / 1000));
  const idleSeconds = Math.max(systemIdleSeconds, hookIdleSeconds);
  const keyboardPercent = Math.min(100, Math.round((keyboardEvents / Math.max(intervalSeconds * 10, 1)) * 100));
  const mousePercent = Math.min(100, Math.round((mouseEvents / Math.max(intervalSeconds * 10, 1)) * 100));

  keyboardEvents = 0;
  mouseEvents = 0;

  return {
    idleSeconds,
    keyboardPercent,
    mousePercent
  };
}
