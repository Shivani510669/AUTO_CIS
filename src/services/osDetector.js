const os = require('os');
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

/**
 * Detect the operating system type and version
 */
async function detectOS() {
  const platform = os.platform();
  let osInfo = {
    type: platform,
    name: '',
    version: '',
    kernel: os.release(),
    distro: ''
  };

  try {
    if (platform === 'linux') {
      // Detect Linux distribution
      try {
        const { stdout } = await execPromise('cat /etc/os-release');
        const lines = stdout.split('\n');
        
        for (const line of lines) {
          if (line.startsWith('NAME=')) {
            osInfo.name = line.split('=')[1].replace(/"/g, '').trim();
          }
          if (line.startsWith('VERSION=')) {
            osInfo.version = line.split('=')[1].replace(/"/g, '').trim();
          }
          if (line.startsWith('ID=')) {
            osInfo.distro = line.split('=')[1].replace(/"/g, '').trim();
          }
        }
      } catch (error) {
        console.error('Failed to read /etc/os-release:', error);
        osInfo.name = 'Linux';
        osInfo.version = 'Unknown';
      }
    } else if (platform === 'win32') {
      // Detect Windows version
      osInfo.name = 'Windows';
      try {
        const { stdout } = await execPromise('wmic os get Caption /value', { shell: 'powershell.exe' });
        const match = stdout.match(/Caption=(.*)/);
        if (match) {
          osInfo.version = match[1].trim();
        }
      } catch (error) {
        console.error('Failed to get Windows version:', error);
        osInfo.version = os.release();
      }
    } else if (platform === 'darwin') {
      // Detect macOS version
      osInfo.name = 'macOS';
      try {
        const { stdout } = await execPromise('sw_vers -productVersion');
        osInfo.version = stdout.trim();
      } catch (error) {
        console.error('Failed to get macOS version:', error);
        osInfo.version = os.release();
      }
    }
  } catch (error) {
    console.error('OS detection error:', error);
  }

  return osInfo;
}

/**
 * Get comprehensive system information
 */
async function getSystemInfo() {
  const osInfo = await detectOS();
  
  return {
    os: osInfo.name || osInfo.type,
    version: osInfo.version || 'Unknown',
    kernel: osInfo.kernel,
    distro: osInfo.distro || '',
    hostname: os.hostname(),
    user: os.userInfo().username,
    platform: os.platform(),
    arch: os.arch(),
    cpus: os.cpus().length,
    totalMemory: Math.round(os.totalmem() / (1024 * 1024 * 1024)) + ' GB',
    freeMemory: Math.round(os.freemem() / (1024 * 1024 * 1024)) + ' GB',
    uptime: Math.round(os.uptime() / 3600) + ' hours',
    timestamp: new Date().toLocaleString()
  };
}

/**
 * Check if running with administrator/root privileges
 */
async function checkPrivileges() {
  try {
    const platform = os.platform();
    
    if (platform === 'linux' || platform === 'darwin') {
      const { stdout } = await execPromise('id -u');
      return stdout.trim() === '0';
    } else if (platform === 'win32') {
      try {
        await execPromise('net session', { shell: 'powershell.exe' });
        return true;
      } catch {
        return false;
      }
    }
  } catch (error) {
    console.error('Privilege check error:', error);
    return false;
  }
}

module.exports = { 
  detectOS, 
  getSystemInfo,
  checkPrivileges
};