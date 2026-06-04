export class TrackerTelemetry {
  constructor(config) {
    this.config = config;
  }

  updateConfig(config) {
    this.config = config;
  }

  get baseUrl() {
    return this.config.apiUrl?.replace(/\/$/, "") ?? "http://localhost:3000";
  }

  async post(pathname, payload) {
    if (!this.config.userId || !this.config.organizationId) {
      return { ok: false, skipped: true };
    }

    const response = await fetch(`${this.baseUrl}${pathname}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(this.config.accessToken ? { Authorization: `Bearer ${this.config.accessToken}` } : {})
      },
      body: JSON.stringify(payload)
    });

    return { ok: response.ok, status: response.status };
  }

  async sendActivity(payload) {
    return this.post("/api/activity", payload);
  }

  async sendScreenshot(payload) {
    return this.post("/api/screenshots", payload);
  }

  async getConsent() {
    if (!this.config.userId || !this.config.organizationId) {
      return { ok: false, skipped: true, consentStatus: "PENDING" };
    }

    const params = new URLSearchParams({
      userId: this.config.userId,
      organizationId: this.config.organizationId
    });

    const response = await fetch(`${this.baseUrl}/api/tracker/consent?${params.toString()}`, {
      method: "GET",
      headers: {
        ...(this.config.accessToken ? { Authorization: `Bearer ${this.config.accessToken}` } : {})
      }
    });

    if (!response.ok) {
      return { ok: false, status: response.status, consentStatus: "PENDING" };
    }

    const data = await response.json();
    return {
      ok: true,
      consentStatus: data.consentStatus ?? "PENDING"
    };
  }
}
