import { getActiveWindowState, sampleActivity, startInputHooks } from "./sensors.js";
import { TrackerTelemetry } from "./telemetry.js";
import { mkdir } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";

const SAMPLE_INTERVAL_MS = 30_000;
const DEFAULT_SCREENSHOT_INTERVAL_MS = 5 * 60 * 1000;
const WINDOW_POLL_INTERVAL_MS = 5_000;
const IDLE_THRESHOLD_SECONDS = 60;

export class ActivityCollector {
  constructor({ config, onStatusChange }) {
    this.config = config;
    this.onStatusChange = onStatusChange;
    this.telemetry = new TrackerTelemetry(config);
    this.sampleTimer = null;
    this.screenshotTimer = null;
    this.windowMonitorTimer = null;
    this.paused = false;
    this.screenshotBusy = false;
    this.consentStatus = "PENDING";
    this.lastConsentCheckAt = 0;
    this.lastWindowSignature = "";
    this.lastStatus = {
      trackingState: "CONSENT_REQUIRED",
      lastSync: null,
      lastApp: "Unknown",
      lastError: null
    };
  }

  async updateConfig(config) {
    this.config = config;
    this.telemetry.updateConfig(config);
  }

  async start() {
    this.sampleTimer = setInterval(() => {
      void this.collectOnce();
    }, SAMPLE_INTERVAL_MS);

    if (this.config.captureScreenshots && this.config.userId && this.config.organizationId) {
      this.screenshotTimer = setInterval(() => {
        void this.captureScreenshot();
      }, DEFAULT_SCREENSHOT_INTERVAL_MS);

      this.windowMonitorTimer = setInterval(() => {
        void this.monitorActiveWindow();
      }, WINDOW_POLL_INTERVAL_MS);
      void this.monitorActiveWindow();
    }

    void this.collectOnce();
  }

  stopTimers() {
    if (this.sampleTimer) clearInterval(this.sampleTimer);
    if (this.screenshotTimer) clearInterval(this.screenshotTimer);
    if (this.windowMonitorTimer) clearInterval(this.windowMonitorTimer);
  }

  async togglePause() {
    this.paused = !this.paused;
    const nextState = this.paused ? "PAUSED" : "ACTIVE";
    this.emitStatus({ trackingState: nextState });
    return { paused: this.paused };
  }

  async refreshConsent(force = false) {
    if (!this.config.userId || !this.config.organizationId) {
      this.consentStatus = "PENDING";
      this.emitStatus({
        trackingState: "CONFIG_REQUIRED",
        lastError: "Tracker config is missing userId or organizationId."
      });
      return this.consentStatus;
    }

    const now = Date.now();
    if (!force && now - this.lastConsentCheckAt < 15_000) {
      return this.consentStatus;
    }

    this.lastConsentCheckAt = now;

    try {
      const result = await this.telemetry.getConsent();
      this.consentStatus = result.consentStatus ?? "PENDING";

      if (this.consentStatus === "ACCEPTED") {
        await startInputHooks();
        this.emitStatus({
          trackingState: this.paused ? "PAUSED" : "ACTIVE",
          lastError: null
        });
      } else {
        this.emitStatus({
          trackingState: "CONSENT_REQUIRED",
          lastError: "Waiting for employee permission to take screenshots and track activity."
        });
      }

      return this.consentStatus;
    } catch {
      this.consentStatus = "PENDING";
      this.emitStatus({
        trackingState: "DISCONNECTED",
        lastError: "Unable to read consent from the app server."
      });
      return this.consentStatus;
    }
  }

  async collectOnce() {
    if (this.paused) {
      this.emitStatus({ trackingState: "PAUSED" });
      return { skipped: true };
    }

    if (!this.config.userId || !this.config.organizationId) {
      this.emitStatus({
        trackingState: "CONFIG_REQUIRED",
        lastError: "Tracker config is missing userId or organizationId."
      });
      return { skipped: true };
    }

    const consentStatus = await this.refreshConsent();
    if (consentStatus !== "ACCEPTED") {
      return { skipped: true, consentStatus };
    }

    const activeWindow = await getActiveWindowState();
    this.lastWindowSignature = this.buildWindowSignature(activeWindow);
    const input = sampleActivity(30);
    const payload = {
      userId: this.config.userId,
      organizationId: this.config.organizationId,
      teamId: this.config.teamId || undefined,
      activeApp: activeWindow.app,
      activeWindow: activeWindow.title,
      website: activeWindow.website,
      keyboardPercent: input.keyboardPercent,
      mousePercent: input.mousePercent,
      idleSeconds: input.idleSeconds,
      trackingState: input.idleSeconds >= IDLE_THRESHOLD_SECONDS ? "IDLE" : "ACTIVE",
      capturedAt: new Date().toISOString()
    };

    const result = await this.telemetry.sendActivity(payload);
    this.emitStatus({
      trackingState: payload.trackingState,
      lastSync: new Date().toISOString(),
      lastApp: payload.activeApp,
      lastError: result.ok
        ? payload.trackingState === "IDLE"
          ? "Idle detected after 1 minute without mouse or keyboard movement."
          : null
        : "Activity upload failed."
    });

    return { ok: result.ok, payload };
  }

  buildWindowSignature(activeWindow) {
    return [activeWindow.app, activeWindow.title, activeWindow.website].join("|");
  }

  async monitorActiveWindow() {
    if (this.paused || !this.config.captureScreenshots || !this.config.userId || !this.config.organizationId) {
      return { skipped: true };
    }

    const consentStatus = await this.refreshConsent();
    if (consentStatus !== "ACCEPTED") {
      return { skipped: true, consentStatus };
    }

    const activeWindow = await getActiveWindowState();
    const signature = this.buildWindowSignature(activeWindow);

    if (signature !== this.lastWindowSignature) {
      this.lastWindowSignature = signature;
      this.emitStatus({ lastApp: activeWindow.app, lastError: null });
      return this.captureScreenshot(activeWindow);
    }

    return { skipped: true };
  }

  async captureScreenshot(activeWindow = null) {
    if (this.paused || !this.config.captureScreenshots || !this.config.userId || !this.config.organizationId) {
      return { skipped: true };
    }

    const consentStatus = await this.refreshConsent();
    if (consentStatus !== "ACCEPTED") {
      return { skipped: true, consentStatus };
    }

    if (this.screenshotBusy) {
      return { skipped: true };
    }

    this.screenshotBusy = true;

    try {
      const screenshotModule = await import("screenshot-desktop");
      const screenshot = screenshotModule.default ?? screenshotModule;
      const captureDir = path.join(os.tmpdir(), "smart-team-timer");
      await mkdir(captureDir, { recursive: true });
      const filePath = path.join(captureDir, `screenshot-${Date.now()}.png`);
      const savedFile = await screenshot({ filename: filePath, format: "png" });
      const currentWindow = activeWindow ?? (await getActiveWindowState());
      const payload = {
        userId: this.config.userId,
        organizationId: this.config.organizationId,
        teamId: this.config.teamId || undefined,
        imageUrl: pathToFileURL(String(savedFile)).href,
        activeApp: currentWindow.app,
        activeWindow: currentWindow.title,
        capturedAt: new Date().toISOString()
      };

      const result = await this.telemetry.sendScreenshot(payload);
      if (!result.ok) {
        this.emitStatus({
          trackingState: this.paused ? "PAUSED" : this.consentStatus === "ACCEPTED" ? "ACTIVE" : "CONSENT_REQUIRED",
          lastError: "Screenshot upload failed."
        });
      }
      return { ok: result.ok };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Screenshot capture failed";
      this.emitStatus({
        trackingState: this.paused ? "PAUSED" : this.consentStatus === "ACCEPTED" ? "ACTIVE" : "CONSENT_REQUIRED",
        lastError: message
      });
      return {
        ok: false,
        error: message
      };
    } finally {
      this.screenshotBusy = false;
    }
  }

  emitStatus(partial) {
    this.lastStatus = {
      ...this.lastStatus,
      ...partial
    };

    if (typeof this.onStatusChange === "function") {
      this.onStatusChange(this.lastStatus);
    }
  }
}
