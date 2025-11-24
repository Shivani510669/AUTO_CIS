// ---------------------------
// IMPORTS
// ---------------------------
const { app, BrowserWindow, ipcMain, dialog } = require("electron");
const path = require("path");
const fs = require("fs");

// Services
const { detectOS, getSystemInfo } = require("../src/services/osDetector");
const { runComplianceCheck } = require("../src/services/complianceChecker");
const { getAIRemediation } = require("../src/services/aiRemediation");
const { applyFix } = require("../src/utils/commandExecutor");
const { generateReport } = require("../src/services/reportGenerator");


// ---------------------------
// GPU FIX FLAGS
// ---------------------------
app.commandLine.appendSwitch("no-sandbox");
app.commandLine.appendSwitch("disable-gpu");
app.commandLine.appendSwitch("disable-software-rasterizer");
app.commandLine.appendSwitch("in-process-gpu");
app.commandLine.appendSwitch("use-gl", "swiftshader");

let mainWindow;


// ---------------------------
// PRIVILEGE CHECK HANDLER
// ---------------------------
ipcMain.handle("check-privileges", async () => {
  return {
    ok: true,
    message: "Privilege check executed from main process"
  };
});


// ---------------------------
// CREATE MAIN WINDOW
// ---------------------------
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1000,
    minHeight: 700,
    backgroundColor: "#0f172a",
    show: false,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  if (!app.isPackaged) {
    mainWindow.loadURL("http://localhost:3000");
    mainWindow.webContents.openDevTools();
  } else {
    const index = `file://${path.join(__dirname, "../build/index.html")}`;
    mainWindow.loadURL(index);
  }

  mainWindow.once("ready-to-show", () => mainWindow.show());
  mainWindow.on("closed", () => (mainWindow = null));
}


// ---------------------------
// APP READY
// ---------------------------
app.whenReady().then(() => {
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});


// ---------------------------
// IPC HANDLERS
// ---------------------------
ipcMain.handle("detect-os", async () => {
  try { return await detectOS(); }
  catch (err) { return { error: err.message }; }
});

ipcMain.handle("get-system-info", async () => {
  try { return await getSystemInfo(); }
  catch (err) { return { error: err.message }; }
});

ipcMain.handle("run-compliance-check", async (_, osType) => {
  try { return await runComplianceCheck(osType); }
  catch (err) { return { error: err.message }; }
});

ipcMain.handle("get-ai-remediation", async (_, check, systemInfo) => {
  try { return await getAIRemediation(check, systemInfo); }
  catch (err) {
    return {
      error: err.message,
      rootCause: "Unable to contact AI service",
      securityImpact: "Manual review required",
      fixCommands: ["Check network connection"],
      verificationSteps: ["Retry process"]
    };
  }
});

ipcMain.handle("apply-fix", async (_, cmds, id) => {
  try { return await applyFix(cmds, id); }
  catch (err) { return { success: false, error: err.message }; }
});

ipcMain.handle("generate-report", async (_, data) => {
  try {
    const localPath = await generateReport(data);

    const { filePath } = await dialog.showSaveDialog(mainWindow, {
      title: "Save Report",
      defaultPath: path.join(app.getPath("downloads"), `autocis-${Date.now()}.json`)
    });

    if (filePath) {
      fs.copyFileSync(localPath, filePath);
      return { success: true, path: filePath };
    }

    return { success: false, cancelled: true };

  } catch (err) {
    return { success: false, error: err.message };
  }
});

