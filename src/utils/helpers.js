/**
 * Format bytes to human readable format
 */
function formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  }
  
  /**
   * Format uptime to human readable format
   */
  function formatUptime(seconds) {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    const parts = [];
    if (days > 0) parts.push(`${days}d`);
    if (hours > 0) parts.push(`${hours}h`);
    if (minutes > 0) parts.push(`${minutes}m`);
    
    return parts.join(' ') || '0m';
  }
  
  /**
   * Sanitize command for safe execution
   */
  function sanitizeCommand(command) {
    return command
      .trim()
      .replace(/[;&|`$()]/g, '') // Remove shell operators
      .substring(0, 500); // Limit length
  }
  
  /**
   * Parse severity level
   */
  function parseSeverity(severity) {
    const normalized = (severity || 'medium').toLowerCase();
    if (['critical', 'high'].includes(normalized)) return 'high';
    if (['medium', 'moderate'].includes(normalized)) return 'medium';
    return 'low';
  }
  
  /**
   * Generate unique ID
   */
  function generateId() {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }
  
  /**
   * Sleep/delay function
   */
  function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  
  /**
   * Truncate text to length
   */
  function truncate(text, maxLength = 100) {
    if (!text || text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  }
  
  /**
   * Deep clone object
   */
  function deepClone(obj) {
    return JSON.parse(JSON.stringify(obj));
  }
  
  module.exports = {
    formatBytes,
    formatUptime,
    sanitizeCommand,
    parseSeverity,
    generateId,
    sleep,
    truncate,
    deepClone
  };