const { contextBridge, ipcRenderer } = require("electron");

// Expose APIs to the renderer safely
contextBridge.exposeInMainWorld("api", {
  // ---------- OS & System Info ----------
  detectOS: () => ipcRenderer.invoke("detect-os"),
  getSystemInfo: () => ipcRenderer.invoke("get-system-info"),

  // ---------- Compliance Checking ----------
  runComplianceCheck: (osType) =>
    ipcRenderer.invoke("run-compliance-check", osType),

  // ---------- AI Remediation ----------
  getAIRremediation: (check, systemInfo) =>
    ipcRenderer.invoke("get-ai-remediation", check, systemInfo),

  // ---------- Apply Fix Commands ----------
  applyFix: (fixCommands, checkId) =>
    ipcRenderer.invoke("apply-fix", fixCommands, checkId),

  // ---------- Report Generation ----------
  generateReport: (data) => ipcRenderer.invoke("generate-report", data),

  // ---------- Privilege Checker (NEW & FIXED) ----------
  checkPrivileges: () => ipcRenderer.invoke("check-privileges"),

  // ---------- Logging ----------
  logMessage: (message) => ipcRenderer.send("log-message", message),

  // ---------- Environment Info ----------
  isElectron: true,
  platform: process.platform
});

// Debug
console.log("▶ Preload loaded: window.api is ready");

