const apiUrlInput = document.getElementById("apiUrl");
const loginEmailInput = document.getElementById("loginEmail");
const loginPasswordInput = document.getElementById("loginPassword");
const loginBtn = document.getElementById("loginBtn");
const loginErrorText = document.getElementById("loginError");
const logoutBtn = document.getElementById("logoutBtn");

const loginView = document.getElementById("loginView");
const trackerView = document.getElementById("trackerView");

const stateText = document.getElementById("trackerState");
const lastSyncText = document.getElementById("lastSync");
const lastAppText = document.getElementById("lastApp");
const lastErrorText = document.getElementById("lastError");
const toggleButton = document.getElementById("toggle");
const sampleButton = document.getElementById("sample");

let currentConfig = null;

const setStatus = (status) => {
  stateText.textContent = status.trackingState ?? "ACTIVE";
  lastSyncText.textContent = status.lastSync ?? "Waiting for first upload...";
  lastAppText.textContent = status.lastApp ?? "Unknown";
  lastErrorText.textContent = status.lastError ?? "None";
  toggleButton.textContent = status.trackingState === "PAUSED" ? "Resume tracking" : "Pause tracking";
};

const updateView = () => {
  if (currentConfig?.userId && currentConfig?.organizationId) {
    loginView.classList.add("hidden");
    trackerView.classList.remove("hidden");
  } else {
    loginView.classList.remove("hidden");
    trackerView.classList.add("hidden");
  }
};

async function hydrate() {
  currentConfig = await window.trackerAPI.getConfig();
  apiUrlInput.value = currentConfig.apiUrl ?? "";
  updateView();
}

loginBtn.addEventListener("click", async () => {
  loginBtn.textContent = "Logging in...";
  loginBtn.disabled = true;
  loginErrorText.textContent = "";

  const result = await window.trackerAPI.login({
    apiUrl: apiUrlInput.value,
    email: loginEmailInput.value,
    password: loginPasswordInput.value,
  });

  loginBtn.textContent = "Log In";
  loginBtn.disabled = false;

  if (result.ok) {
    loginPasswordInput.value = "";
    await hydrate();
  } else {
    loginErrorText.textContent = result.error || "Login failed";
  }
});

logoutBtn.addEventListener("click", async () => {
  await window.trackerAPI.logout();
  await hydrate();
});

toggleButton.addEventListener("click", async () => {
  const result = await window.trackerAPI.togglePause();
  setStatus({
    trackingState: result.paused ? "PAUSED" : "ACTIVE",
    lastSync: lastSyncText.textContent,
    lastApp: lastAppText.textContent
  });
});

sampleButton.addEventListener("click", async () => {
  await window.trackerAPI.sendSample();
});

window.trackerAPI.onStatus(setStatus);
await hydrate();
