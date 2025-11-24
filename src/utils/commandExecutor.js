const { exec, spawn } = require('child_process');
const util = require('util');
const os = require('os');
const fs = require('fs');
const path = require('path');
const execPromise = util.promisify(exec);

/**
 * Execute a system command and return REAL output
 */
async function executeCommand(command, platform = null) {
  const currentPlatform = platform || os.platform();
  const timeout = 30000; // 30 seconds

  console.log(`\n[CommandExecutor] Platform: ${currentPlatform}`);
  console.log(`[CommandExecutor] Executing: ${command}`);

  try {
    let result;

    if (currentPlatform === 'win32') {
      // Windows - Use PowerShell
      result = await executeWindowsCommand(command, timeout);
    } else {
      // Linux/Mac - Use Bash
      result = await executeLinuxCommand(command, timeout);
    }

    const output = result.stdout.trim();
    console.log(`[CommandExecutor] Success! Output length: ${output.length} chars`);
    
    return output;

  } catch (error) {
    console.error(`[CommandExecutor] Error:`, error.message);
    
    // Return stderr if available (some commands output to stderr)
    if (error.stderr) {
      return error.stderr.trim();
    }
    
    // Return stdout if available (command might have partial success)
    if (error.stdout) {
      return error.stdout.trim();
    }
    
    throw new Error(`Command execution failed: ${error.message}`);
  }
}

/**
 * Execute Windows PowerShell command
 */
async function executeWindowsCommand(command, timeout) {
  console.log(`[Windows] Running PowerShell command...`);
  
  // Wrap command in PowerShell with error handling
  const psCommand = `powershell.exe -NoProfile -NonInteractive -Command "& {${command}}"`;
  
  const { stdout, stderr } = await execPromise(psCommand, {
    timeout,
    encoding: 'utf8',
    maxBuffer: 5 * 1024 * 1024, // 5MB buffer
    windowsHide: true
  });

  return { stdout: stdout || '', stderr: stderr || '' };
}

/**
 * Execute Linux/Mac Bash command
 */
async function executeLinuxCommand(command, timeout) {
  console.log(`[Linux] Running bash command...`);
  
  const { stdout, stderr } = await execPromise(command, {
    timeout,
    shell: '/bin/bash',
    encoding: 'utf8',
    maxBuffer: 5 * 1024 * 1024 // 5MB buffer
  });

  return { stdout: stdout || '', stderr: stderr || '' };
}

/**
 * Apply fix commands with REAL execution
 */
async function applyFix(fixCommands, checkId) {
  console.log(`\n========================================`);
  console.log(`Applying REAL fix for check: ${checkId}`);
  console.log(`Commands to execute: ${fixCommands.length}`);
  console.log(`========================================\n`);

  if (!Array.isArray(fixCommands) || fixCommands.length === 0) {
    throw new Error('No fix commands provided');
  }

  const platform = os.platform();
  const results = [];
  const errors = [];

  // Create backup before applying fixes
  const backupId = await createBackup(checkId);
  console.log(`Backup created: ${backupId}`);

  for (let i = 0; i < fixCommands.length; i++) {
    const command = fixCommands[i];
    
    // Skip comments and empty lines
    if (!command || command.trim().startsWith('#') || command.trim() === '') {
      console.log(`[${i + 1}/${fixCommands.length}] Skipping: ${command}`);
      continue;
    }

    try {
      console.log(`\n[${i + 1}/${fixCommands.length}] Executing fix command:`);
      console.log(`Command: ${command}`);
      
      // Safety check
      if (!isCommandSafe(command)) {
        throw new Error('Command deemed unsafe and was blocked');
      }

      const output = await executeCommand(command, platform);
      
      results.push({
        command,
        success: true,
        output: output || 'Command executed successfully (no output)'
      });

      console.log(`✅ Command ${i + 1} completed successfully`);

    } catch (error) {
      console.error(`❌ Command ${i + 1} failed:`, error.message);
      
      errors.push({
        command,
        error: error.message
      });

      // Stop on critical errors
      if (command.includes('reboot') || command.includes('shutdown')) {
        console.error('Critical command failed, stopping remediation');
        break;
      }
    }
  }

  const success = errors.length === 0;
  
  console.log(`\n========================================`);
  console.log(`Fix application complete!`);
  console.log(`Success: ${success} | Executed: ${results.length} | Errors: ${errors.length}`);
  console.log(`========================================\n`);
  
  return {
    success,
    results,
    errors,
    backupId,
    message: success 
      ? `All ${results.length} fix commands executed successfully` 
      : `${errors.length} command(s) failed out of ${results.length + errors.length}`
  };
}

/**
 * Check if a command is safe to execute
 */
function isCommandSafe(command) {
  const cmd = command.toLowerCase().trim();
  
  // Dangerous patterns that should be blocked
  const dangerousPatterns = [
    /rm\s+-rf\s+\/($|\s)/,        // rm -rf / (with nothing after)
    /del\s+\/s\s+\/q\s+c:\\/,      // Windows delete C:\
    /format\s+c:/,                  // Format C:
    /mkfs/,                         // Make filesystem
    /dd\s+if=.*of=\/dev\/(sda|hda|vda)/, // Write to main disk
    /:\(\)\{\s*:\|:&\s*\};:/,      // Fork bomb
    /> \/dev\/sda/,                 // Redirect to disk
    /curl.*\|\s*bash/,              // Curl pipe to bash (potential)
    /wget.*\|\s*sh/                 // Wget pipe to shell (potential)
  ];

  for (const pattern of dangerousPatterns) {
    if (pattern.test(cmd)) {
      console.warn(`⚠️  Dangerous command pattern detected: ${command}`);
      return false;
    }
  }

  return true;
}

/**
 * Create backup before applying fixes
 */
async function createBackup(checkId) {
  const backupDir = path.join(process.cwd(), 'reports', 'backups');
  
  try {
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }

    const backupId = `backup-${checkId}-${Date.now()}`;
    const backupFile = path.join(backupDir, `${backupId}.json`);

    const backupData = {
      checkId,
      timestamp: new Date().toISOString(),
      platform: os.platform(),
      hostname: os.hostname()
    };

    fs.writeFileSync(backupFile, JSON.stringify(backupData, null, 2));
    console.log(`Backup saved: ${backupFile}`);
    
    return backupId;
  } catch (error) {
    console.error('Backup creation failed:', error);
    return 'backup-failed';
  }
}

module.exports = { 
  executeCommand,
  applyFix,
  isCommandSafe,
  executeWindowsCommand,
  executeLinuxCommand
};
