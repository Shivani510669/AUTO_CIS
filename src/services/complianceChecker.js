const { executeCommand } = require('../utils/commandExecutor');
const path = require('path');
const fs = require('fs');
const os = require('os');

/**
 * Load CIS benchmark data for the given OS
 */
function loadBenchmarks(osType) {
  try {
    const platform = os.platform();
    const isWindows = platform === 'win32';
    const filename = isWindows ? 'cisWindows.json' : 'cisLinux.json';
    const benchmarkPath = path.join(__dirname, '../data', filename);
    
    console.log(`Loading benchmarks from: ${benchmarkPath}`);
    
    if (fs.existsSync(benchmarkPath)) {
      const data = fs.readFileSync(benchmarkPath, 'utf8');
      const benchmarks = JSON.parse(data);
      console.log(`Loaded ${benchmarks.length} benchmark checks`);
      return benchmarks;
    } else {
      console.error(`Benchmark file not found: ${benchmarkPath}`);
      return [];
    }
  } catch (error) {
    console.error('Error loading benchmarks:', error);
    return [];
  }
}

/**
 * Run compliance checks against the ACTUAL system
 */
async function runComplianceCheck(osType) {
  console.log(`\n========================================`);
  console.log(`Starting REAL compliance check for: ${osType}`);
  console.log(`========================================\n`);
  
  const benchmarks = loadBenchmarks(osType);
  
  if (benchmarks.length === 0) {
    console.error('No benchmarks loaded. Cannot run compliance check.');
    return [{
      id: 'ERROR',
      title: 'No benchmarks loaded',
      status: 'error',
      actualOutput: 'Failed to load CIS benchmark data',
      expected: 'N/A',
      severity: 'high',
      remediated: false
    }];
  }

  const results = [];
  const platform = os.platform();

  for (const check of benchmarks) {
    console.log(`\n--- Checking: ${check.id} ---`);
    console.log(`Title: ${check.title}`);
    console.log(`Command: ${check.check_command}`);
    
    try {
      // Execute the actual command on the system
      const output = await executeCommand(check.check_command, platform);
      
      console.log(`Raw Output: "${output}"`);
      console.log(`Expected: "${check.expected}"`);
      
      // Compare actual output with expected
      const status = compareOutput(output, check.expected, check.comparison_type);
      
      console.log(`Status: ${status.toUpperCase()}`);

      results.push({
        ...check,
        status: status,
        actualOutput: output || '(empty output)',
        remediated: false,
        aiSuggestion: null,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error(`Error executing check ${check.id}:`, error.message);
      
      results.push({
        ...check,
        status: 'error',
        actualOutput: `Error: ${error.message}`,
        remediated: false,
        aiSuggestion: null,
        timestamp: new Date().toISOString()
      });
    }
  }

  console.log(`\n========================================`);
  console.log(`Compliance check complete!`);
  console.log(`Total: ${results.length} | Pass: ${results.filter(r => r.status === 'pass').length} | Fail: ${results.filter(r => r.status === 'fail').length} | Error: ${results.filter(r => r.status === 'error').length}`);
  console.log(`========================================\n`);

  return results;
}

/**
 * Compare actual output with expected output
 * Supports multiple comparison types
 */
function compareOutput(actual, expected, comparisonType = 'contains') {
  if (!actual && !expected) {
    return 'error';
  }

  const actualClean = String(actual || '').trim().toLowerCase();
  const expectedClean = String(expected || '').trim().toLowerCase();

  console.log(`Comparison Type: ${comparisonType}`);
  console.log(`Comparing: "${actualClean}" vs "${expectedClean}"`);

  // Handle different comparison types
  switch (comparisonType) {
    case 'exact':
      return actualClean === expectedClean ? 'pass' : 'fail';
    
    case 'contains':
      return actualClean.includes(expectedClean) ? 'pass' : 'fail';
    
    case 'not_contains':
      return !actualClean.includes(expectedClean) ? 'pass' : 'fail';
    
    case 'regex':
      try {
        const regex = new RegExp(expectedClean, 'i');
        return regex.test(actualClean) ? 'pass' : 'fail';
      } catch (e) {
        console.error('Invalid regex:', e);
        return 'error';
      }
    
    case 'empty':
      return actualClean === '' ? 'pass' : 'fail';
    
    case 'not_empty':
      return actualClean !== '' ? 'pass' : 'fail';
    
    case 'greater_than':
      const actualNum = parseFloat(actualClean);
      const expectedNum = parseFloat(expectedClean);
      return !isNaN(actualNum) && !isNaN(expectedNum) && actualNum > expectedNum ? 'pass' : 'fail';
    
    case 'equals':
      return actualClean === expectedClean ? 'pass' : 'fail';
    
    default:
      // Default: contains match
      if (actualClean.includes(expectedClean)) {
        return 'pass';
      }
      // Also try exact match
      if (actualClean === expectedClean) {
        return 'pass';
      }
      return 'fail';
  }
}

module.exports = { 
  runComplianceCheck,
  loadBenchmarks,
  compareOutput
};
