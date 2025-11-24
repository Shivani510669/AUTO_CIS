const fs = require('fs');
const path = require('path');
const os = require('os');

/**
 * Generate compliance report in JSON format
 */
async function generateReport(data) {
  console.log('Generating compliance report...');

  try {
    const { systemInfo, checks, timestamp } = data;

    // Calculate summary statistics
    const summary = {
      total: checks.length,
      passed: checks.filter(c => c.status === 'pass').length,
      failed: checks.filter(c => c.status === 'fail').length,
      errors: checks.filter(c => c.status === 'error').length,
      remediated: checks.filter(c => c.remediated).length,
      complianceScore: checks.length > 0 
        ? Math.round((checks.filter(c => c.status === 'pass').length / checks.length) * 100)
        : 0
    };

    // Build report structure
    const report = {
      metadata: {
        reportTitle: 'AutoCIS Guard - Compliance Report',
        generatedAt: timestamp || new Date().toISOString(),
        generatedBy: 'AutoCIS Guard v1.0.0',
        reportId: `AUTOCIS-${Date.now()}`
      },
      systemInformation: {
        operatingSystem: systemInfo.os,
        version: systemInfo.version,
        hostname: systemInfo.hostname,
        username: systemInfo.user,
        platform: systemInfo.platform,
        architecture: systemInfo.arch,
        cpus: systemInfo.cpus || 'N/A',
        totalMemory: systemInfo.totalMemory || 'N/A',
        uptime: systemInfo.uptime || 'N/A'
      },
      executiveSummary: {
        complianceScore: `${summary.complianceScore}%`,
        totalChecks: summary.total,
        passedChecks: summary.passed,
        failedChecks: summary.failed,
        erroredChecks: summary.errors,
        remediatedChecks: summary.remediated,
        status: summary.complianceScore >= 90 ? 'EXCELLENT' :
                summary.complianceScore >= 75 ? 'GOOD' :
                summary.complianceScore >= 60 ? 'NEEDS IMPROVEMENT' :
                'CRITICAL'
      },
      detailedFindings: {
        passed: checks.filter(c => c.status === 'pass').map(formatCheck),
        failed: checks.filter(c => c.status === 'fail').map(formatCheck),
        errors: checks.filter(c => c.status === 'error').map(formatCheck)
      },
      remediationLog: checks
        .filter(c => c.remediated)
        .map(c => ({
          checkId: c.id,
          title: c.title,
          severity: c.severity,
          remediationApplied: true,
          aiSuggestion: c.aiSuggestion ? {
            rootCause: c.aiSuggestion.rootCause,
            fixCommands: c.aiSuggestion.fixCommands
          } : null
        })),
      recommendations: generateRecommendations(checks),
      complianceBreakdown: {
        bySeverity: {
          high: {
            total: checks.filter(c => c.severity === 'high').length,
            passed: checks.filter(c => c.severity === 'high' && c.status === 'pass').length,
            failed: checks.filter(c => c.severity === 'high' && c.status === 'fail').length
          },
          medium: {
            total: checks.filter(c => c.severity === 'medium').length,
            passed: checks.filter(c => c.severity === 'medium' && c.status === 'pass').length,
            failed: checks.filter(c => c.severity === 'medium' && c.status === 'fail').length
          },
          low: {
            total: checks.filter(c => c.severity === 'low').length,
            passed: checks.filter(c => c.severity === 'low' && c.status === 'pass').length,
            failed: checks.filter(c => c.severity === 'low' && c.status === 'fail').length
          }
        }
      }
    };

    // Create reports directory if it doesn't exist
    const reportsDir = path.join(process.cwd(), 'reports');
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }

    // Save report to file
    const filename = `autocis-report-${Date.now()}.json`;
    const filepath = path.join(reportsDir, filename);
    fs.writeFileSync(filepath, JSON.stringify(report, null, 2), 'utf8');

    console.log(`Report saved to: ${filepath}`);
    return filepath;

  } catch (error) {
    console.error('Report generation error:', error);
    throw error;
  }
}

/**
 * Format check for report
 */
function formatCheck(check) {
  return {
    id: check.id,
    title: check.title,
    severity: check.severity,
    status: check.status,
    description: check.description || 'N/A',
    checkCommand: check.check_command,
    expectedOutput: check.expected,
    actualOutput: check.actualOutput,
    remediated: check.remediated || false,
    timestamp: check.timestamp || null
  };
}

/**
 * Generate recommendations based on failed checks
 */
function generateRecommendations(checks) {
  const failedChecks = checks.filter(c => c.status === 'fail' && !c.remediated);
  const recommendations = [];

  // Priority recommendations
  const highSeverityFailed = failedChecks.filter(c => c.severity === 'high');
  if (highSeverityFailed.length > 0) {
    recommendations.push({
      priority: 'CRITICAL',
      message: `${highSeverityFailed.length} high-severity checks have failed. Immediate remediation is required.`,
      affectedChecks: highSeverityFailed.map(c => c.id)
    });
  }

  const mediumSeverityFailed = failedChecks.filter(c => c.severity === 'medium');
  if (mediumSeverityFailed.length > 0) {
    recommendations.push({
      priority: 'HIGH',
      message: `${mediumSeverityFailed.length} medium-severity checks have failed. Schedule remediation soon.`,
      affectedChecks: mediumSeverityFailed.map(c => c.id)
    });
  }

  const lowSeverityFailed = failedChecks.filter(c => c.severity === 'low');
  if (lowSeverityFailed.length > 0) {
    recommendations.push({
      priority: 'MEDIUM',
      message: `${lowSeverityFailed.length} low-severity checks have failed. Address during next maintenance window.`,
      affectedChecks: lowSeverityFailed.map(c => c.id)
    });
  }

  // General recommendations
  if (failedChecks.length === 0) {
    recommendations.push({
      priority: 'INFO',
      message: 'All checks passed! System is compliant with CIS benchmarks.',
      affectedChecks: []
    });
  } else {
    recommendations.push({
      priority: 'INFO',
      message: 'Use the AI-powered remediation feature to automatically fix failed checks.',
      affectedChecks: []
    });
  }

  return recommendations;
}

module.exports = { 
  generateReport 
};