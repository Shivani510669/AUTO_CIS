const os = require('os');

/**
 * Get AI-powered remediation from Claude API with REAL command generation
 */
async function getAIRemediation(check, systemInfo) {
  console.log(`\n========================================`);
  console.log(`Getting AI remediation for: ${check.id}`);
  console.log(`========================================\n`);

  const platform = os.platform();
  const isWindows = platform === 'win32';
  const shellType = isWindows ? 'PowerShell' : 'Bash';

  try {
    const prompt = buildRemediationPrompt(check, systemInfo, shellType);
    
    console.log('Calling Claude AI API...');
    
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 2000,
        temperature: 0.3, // Lower temperature for more consistent commands
        messages: [
          {
            role: "user",
            content: prompt
          }
        ]
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API request failed: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    const aiText = data.content?.find(c => c.type === 'text')?.text || '';
    
    if (!aiText) {
      throw new Error('Empty response from Claude AI');
    }

    console.log('AI Response received, parsing...');
    console.log(`Response length: ${aiText.length} characters`);

    // Parse the AI response
    const parsedResponse = parseAIResponse(aiText, isWindows);
    
    // Validate commands
    validateCommands(parsedResponse.fixCommands, isWindows);

    console.log('✅ AI remediation generated successfully');
    console.log(`Commands: ${parsedResponse.fixCommands.length}`);
    console.log(`========================================\n`);

    return parsedResponse;

  } catch (error) {
    console.error('❌ AI Remediation Error:', error.message);
    
    // Return fallback with manual fix instructions
    return generateFallbackRemediation(check, systemInfo, isWindows);
  }
}

/**
 * Build detailed prompt for Claude AI
 */
function buildRemediationPrompt(check, systemInfo, shellType) {
  return `You are a cybersecurity expert specializing in CIS benchmark compliance for ${systemInfo.platform === 'win32' ? 'Windows' : 'Linux'} systems.

**System Information:**
- Operating System: ${systemInfo.os}
- Version: ${systemInfo.version}
- Platform: ${systemInfo.platform}
- Architecture: ${systemInfo.arch}
- Shell Type: ${shellType}

**Failed CIS Benchmark Check:**
- CIS ID: ${check.id}
- Title: ${check.title}
- Description: ${check.description || 'N/A'}
- Severity Level: ${check.severity}
- Category: ${check.category || 'General'}

**Check Command Executed:**
\`\`\`
${check.check_command}
\`\`\`

**Expected Output:**
\`\`\`
${check.expected}
\`\`\`

**Actual Output (FAILED):**
\`\`\`
${check.actualOutput}
\`\`\`

**Your Task:**
Provide a remediation solution in STRICT JSON format with these EXACT keys:

{
  "rootCause": "Explain in 2-3 sentences WHY this check failed based on the actual output",
  "securityImpact": "Explain the security risks of leaving this unfixed (2-3 sentences)",
  "fixCommands": [
    "actual ${shellType} command 1 that will fix this issue",
    "actual ${shellType} command 2 if needed",
    "actual ${shellType} command 3 if needed"
  ],
  "verificationSteps": [
    "Step to verify the fix worked",
    "How to confirm compliance",
    "What to check after remediation"
  ]
}

**CRITICAL REQUIREMENTS:**
1. Return ONLY valid JSON - no markdown, no backticks, no explanations
2. fixCommands MUST be real, executable ${shellType} commands
3. Commands must be production-safe and tested
4. Commands should be specific to ${systemInfo.platform === 'win32' ? 'Windows' : 'Linux'}
5. Include 2-5 commands that will actually fix the issue
6. Do NOT use placeholder commands like "run-fix-command"
7. Commands should handle the difference between expected "${check.expected}" and actual "${check.actualOutput}"

${systemInfo.platform === 'win32' ? `
**Windows PowerShell Examples:**
- Registry: Set-ItemProperty -Path "HKLM:\\Path" -Name "Value" -Value 1
- Service: Stop-Service ServiceName; Set-Service ServiceName -StartupType Disabled
- Firewall: Set-NetFirewallProfile -Profile Domain -Enabled True
- User: Disable-LocalUser -Name "Administrator"
- Policy: secedit /configure /db secedit.sdb /cfg C:\\policy.inf
` : `
**Linux Bash Examples:**
- File: echo "install cramfs /bin/true" | sudo tee -a /etc/modprobe.d/cramfs.conf
- Permission: sudo chmod 600 /etc/ssh/sshd_config
- Service: sudo systemctl disable servicename.service
- Sysctl: echo "net.ipv4.ip_forward = 0" | sudo tee -a /etc/sysctl.conf && sudo sysctl -p
- Package: sudo apt-get install -y auditd (or yum/dnf)
`}

Generate the JSON response NOW:`;
}

/**
 * Parse AI response and extract JSON
 */
function parseAIResponse(aiText, isWindows) {
  try {
    // Remove markdown code blocks
    let cleanText = aiText
      .replace(/```json\s*/g, '')
      .replace(/```\s*/g, '')
      .trim();
    
    // Find JSON object
    const jsonMatch = cleanText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON found in AI response');
    }

    const parsed = JSON.parse(jsonMatch[0]);
    
    // Validate structure
    if (!parsed.rootCause || !parsed.fixCommands || !Array.isArray(parsed.fixCommands)) {
      throw new Error('Invalid JSON structure from AI');
    }

    // Clean up commands (remove any remaining markdown)
    parsed.fixCommands = parsed.fixCommands.map(cmd => 
      cmd.replace(/`/g, '').trim()
    ).filter(cmd => cmd.length > 0);

    return parsed;

  } catch (parseError) {
    console.error('JSON parse error:', parseError.message);
    console.log('Raw AI text sample:', aiText.substring(0, 500));
    
    // Try alternative parsing
    return extractDataFromText(aiText, isWindows);
  }
}

/**
 * Extract data from unstructured text (fallback)
 */
function extractDataFromText(text, isWindows) {
  const shellType = isWindows ? 'powershell' : 'bash';
  
  return {
    rootCause: extractSection(text, ['root cause', 'why', 'reason']) || 
               'Configuration does not meet CIS benchmark requirements.',
    
    securityImpact: extractSection(text, ['security impact', 'risk', 'vulnerability']) || 
                    'This misconfiguration may expose the system to security vulnerabilities.',
    
    fixCommands: extractCommands(text, isWindows) || 
                 [`# Manual fix required - check CIS documentation for ${shellType} commands`],
    
    verificationSteps: extractSteps(text) || [
      'Re-run the compliance check',
      'Verify output matches expected value',
      'Check system logs for errors'
    ]
  };
}

/**
 * Extract section from text
 */
function extractSection(text, keywords) {
  for (const keyword of keywords) {
    const regex = new RegExp(`${keyword}[:\\s]+(.*?)(?=\\n\\n|security|fix|verification|\\{|$)`, 'is');
    const match = text.match(regex);
    if (match && match[1]) {
      return match[1].trim().substring(0, 400);
    }
  }
  return null;
}

/**
 * Extract commands from text
 */
function extractCommands(text, isWindows) {
  const commands = [];
  const lines = text.split('\n');
  
  const commandPrefixes = isWindows 
    ? ['Set-', 'Get-', 'Enable-', 'Disable-', 'New-', 'Remove-', 'secedit', 'reg add']
    : ['sudo', 'echo', 'chmod', 'chown', 'systemctl', 'apt-get', 'yum', 'modprobe'];
  
  for (const line of lines) {
    const trimmed = line.trim().replace(/^[-*]\s*/, '').replace(/`/g, '');
    
    for (const prefix of commandPrefixes) {
      if (trimmed.startsWith(prefix)) {
        commands.push(trimmed);
        break;
      }
    }
  }
  
  return commands.length > 0 ? commands.slice(0, 5) : null;
}

/**
 * Extract steps from text
 */
function extractSteps(text) {
  const steps = [];
  const lines = text.split('\n');
  
  for (const line of lines) {
    const trimmed = line.trim();
    if (/^\d+\./.test(trimmed) || trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      const step = trimmed
        .replace(/^\d+\.\s*/, '')
        .replace(/^[-*]\s*/, '')
        .trim();
      
      if (step.length > 10 && step.length < 200) {
        steps.push(step);
      }
    }
  }
  
  return steps.length > 0 ? steps.slice(0, 5) : null;
}

/**
 * Validate generated commands
 */
function validateCommands(commands, isWindows) {
  if (!Array.isArray(commands) || commands.length === 0) {
    throw new Error('No commands generated');
  }

  for (const cmd of commands) {
    if (cmd.includes('placeholder') || cmd.includes('example') || cmd.includes('TODO')) {
      console.warn(`Warning: Command appears to be a placeholder: ${cmd}`);
    }
    
    if (cmd.length < 5) {
      throw new Error(`Command too short: ${cmd}`);
    }
  }
}

/**
 * Generate fallback remediation when AI fails
 */
function generateFallbackRemediation(check, systemInfo, isWindows) {
  console.log('Generating fallback remediation...');
  
  return {
    rootCause: `The check "${check.title}" failed because the actual system output "${check.actualOutput}" does not match the expected CIS benchmark value "${check.expected}". This indicates a configuration gap.`,
    
    securityImpact: `This is a ${check.severity} severity issue that may expose the system to security risks. ${check.severity === 'high' || check.severity === 'critical' ? 'Immediate attention is strongly recommended.' : 'Should be addressed in the next maintenance window.'}`,
    
    fixCommands: isWindows ? [
      `# Windows PowerShell command needed for: ${check.title}`,
      `# Check the CIS Benchmark documentation for ${check.id}`,
      `# Expected value: ${check.expected}`,
      `# Current value: ${check.actualOutput}`
    ] : [
      `# Linux Bash command needed for: ${check.title}`,
      `# Check the CIS Benchmark documentation for ${check.id}`,
      `# Expected value: ${check.expected}`,
      `# Current value: ${check.actualOutput}`
    ],
    
    verificationSteps: [
      `Re-run the check command: ${check.check_command}`,
      `Verify the output matches: ${check.expected}`,
      'Review CIS benchmark documentation for manual steps',
      'Test in a non-production environment first',
      'Check system logs after applying changes'
    ],
    
    fallback: true,
    error: 'AI service unavailable - manual remediation required'
  };
}

module.exports = { 
  getAIRemediation 
};
