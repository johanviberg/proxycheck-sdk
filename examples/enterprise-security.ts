/**
 * Enterprise Security Examples
 *
 * This example demonstrates enterprise-grade security implementations,
 * compliance features, and advanced threat protection using the ProxyCheck.io SDK.
 */

import { ProxyCheckClient } from "../src";

// Enterprise Security Manager
class EnterpriseSecurityManager {
  private client: ProxyCheckClient;
  private securityPolicies: Array<SecurityPolicy>;
  private auditLog: Array<AuditEntry> = [];
  private complianceSettings: ComplianceSettings;

  constructor(config: EnterpriseConfig) {
    this.client = new ProxyCheckClient({
      apiKey: config.apiKey,
      tlsSecurity: true,
      userAgent: `${config.organizationName}-Security/${config.version}`,
      logging: {
        level: config.logLevel || "info",
        format: "json",
        timestamp: true,
      },
    });

    this.securityPolicies = config.securityPolicies;
    this.complianceSettings = config.complianceSettings;
  }

  async validateAccess(request: AccessRequest): Promise<AccessDecision> {
    const startTime = Date.now();
    const auditId = `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    try {
      // Log access attempt
      this.auditAccess(auditId, "access_attempt", request);

      // Apply security policies
      const policyResults = await this.evaluateSecurityPolicies(request);

      // Check for immediate blocks
      const blockedPolicy = policyResults.find((result) => result.action === "block");
      if (blockedPolicy) {
        const decision: AccessDecision = {
          allowed: false,
          reason: blockedPolicy.reason,
          policy: blockedPolicy.policy.name,
          riskScore: 100,
          auditId,
          responseTime: Date.now() - startTime,
        };

        this.auditAccess(auditId, "access_denied", request, decision);
        return decision;
      }

      // Perform detailed threat analysis
      const threatAnalysis = await this.performThreatAnalysis(request);

      // Calculate final risk score
      const riskScore = this.calculateRiskScore(policyResults, threatAnalysis);

      // Make access decision
      const decision: AccessDecision = {
        allowed: riskScore < this.complianceSettings.riskThreshold,
        reason:
          riskScore >= this.complianceSettings.riskThreshold
            ? "High risk score"
            : "Passed security validation",
        riskScore,
        threatDetails: threatAnalysis,
        auditId,
        responseTime: Date.now() - startTime,
      };

      this.auditAccess(
        auditId,
        decision.allowed ? "access_granted" : "access_denied",
        request,
        decision,
      );
      return decision;
    } catch (error) {
      const decision: AccessDecision = {
        allowed: false,
        reason: `Security validation error: ${error.message}`,
        riskScore: 100,
        auditId,
        responseTime: Date.now() - startTime,
      };

      this.auditAccess(auditId, "validation_error", request, decision, error.message);
      return decision;
    }
  }

  private async evaluateSecurityPolicies(request: AccessRequest): Promise<Array<PolicyResult>> {
    const results: Array<PolicyResult> = [];

    for (const policy of this.securityPolicies) {
      if (!policy.enabled) {
        continue;
      }

      try {
        const result = await this.evaluatePolicy(policy, request);
        results.push(result);
      } catch (error) {
        results.push({
          policy,
          action: "error",
          reason: `Policy evaluation failed: ${error.message}`,
          riskScore: 50,
        });
      }
    }

    return results;
  }

  private async evaluatePolicy(
    policy: SecurityPolicy,
    request: AccessRequest,
  ): Promise<PolicyResult> {
    // This would contain actual policy evaluation logic
    // For demonstration, we'll simulate different policy types

    switch (policy.type) {
      case "geolocation":
        return this.evaluateGeolocationPolicy(policy, request);
      case "proxy_detection":
        return this.evaluateProxyPolicy(policy, request);
      case "risk_assessment":
        return this.evaluateRiskPolicy(policy, request);
      case "time_based":
        return this.evaluateTimePolicy(policy, request);
      default:
        return {
          policy,
          action: "allow",
          reason: "Unknown policy type",
          riskScore: 0,
        };
    }
  }

  private async evaluateGeolocationPolicy(
    policy: SecurityPolicy,
    request: AccessRequest,
  ): Promise<PolicyResult> {
    try {
      const result = await this.client.check.checkAddress(request.sourceIP, {
        asnData: true,
      });

      const ipData = result[request.sourceIP];
      if (ipData && typeof ipData === "object") {
        const country = ipData.isocode || "unknown";

        if (policy.blockedCountries?.includes(country)) {
          return {
            policy,
            action: "block",
            reason: `Access from blocked country: ${country}`,
            riskScore: 90,
          };
        }

        if (policy.allowedCountries && !policy.allowedCountries.includes(country)) {
          return {
            policy,
            action: "block",
            reason: `Access from non-allowed country: ${country}`,
            riskScore: 85,
          };
        }
      }

      return {
        policy,
        action: "allow",
        reason: "Geolocation check passed",
        riskScore: 0,
      };
    } catch (error) {
      return {
        policy,
        action: "flag",
        reason: `Geolocation check failed: ${error.message}`,
        riskScore: 30,
      };
    }
  }

  private async evaluateProxyPolicy(
    policy: SecurityPolicy,
    request: AccessRequest,
  ): Promise<PolicyResult> {
    try {
      const result = await this.client.check.checkAddress(request.sourceIP, {
        vpnDetection: 3,
        riskData: 2,
      });

      const ipData = result[request.sourceIP];
      if (ipData && typeof ipData === "object") {
        if (ipData.proxy === "yes") {
          const severity = ipData.type === "TOR" ? 95 : ipData.type === "VPN" ? 60 : 75;

          return {
            policy,
            action: policy.blockProxies ? "block" : "flag",
            reason: `Proxy detected: ${ipData.type || "unknown"}`,
            riskScore: severity,
          };
        }
      }

      return {
        policy,
        action: "allow",
        reason: "No proxy detected",
        riskScore: 0,
      };
    } catch (error) {
      return {
        policy,
        action: "flag",
        reason: `Proxy check failed: ${error.message}`,
        riskScore: 25,
      };
    }
  }

  private async evaluateRiskPolicy(
    policy: SecurityPolicy,
    request: AccessRequest,
  ): Promise<PolicyResult> {
    try {
      const result = await this.client.check.checkAddress(request.sourceIP, {
        riskData: 2,
        asnData: true,
      });

      const ipData = result[request.sourceIP];
      if (ipData && typeof ipData === "object") {
        const riskScore = ipData.risk || 0;

        if (riskScore >= (policy.riskThreshold || 80)) {
          return {
            policy,
            action: "block",
            reason: `High risk score: ${riskScore}%`,
            riskScore,
          };
        }

        if (riskScore >= (policy.warningThreshold || 50)) {
          return {
            policy,
            action: "flag",
            reason: `Medium risk score: ${riskScore}%`,
            riskScore,
          };
        }
      }

      return {
        policy,
        action: "allow",
        reason: "Risk assessment passed",
        riskScore: 0,
      };
    } catch (error) {
      return {
        policy,
        action: "flag",
        reason: `Risk assessment failed: ${error.message}`,
        riskScore: 20,
      };
    }
  }

  private evaluateTimePolicy(policy: SecurityPolicy, _request: AccessRequest): PolicyResult {
    const now = new Date();
    const currentHour = now.getUTCHours();
    const currentDay = now.getUTCDay(); // 0 = Sunday, 1 = Monday, etc.

    // Check if current time is within allowed business hours
    if (policy.businessHoursOnly) {
      const isWeekday = currentDay >= 1 && currentDay <= 5;
      const isBusinessHours = currentHour >= 9 && currentHour <= 17;

      if (!(isWeekday && isBusinessHours)) {
        return {
          policy,
          action: "flag",
          reason: "Access outside business hours",
          riskScore: 30,
        };
      }
    }

    return {
      policy,
      action: "allow",
      reason: "Time-based policy passed",
      riskScore: 0,
    };
  }

  private async performThreatAnalysis(request: AccessRequest): Promise<ThreatAnalysis> {
    try {
      const result = await this.client.check.checkAddress(request.sourceIP, {
        vpnDetection: 3,
        riskData: 2,
        asnData: true,
      });

      const ipData = result[request.sourceIP];
      if (ipData && typeof ipData === "object") {
        return {
          isProxy: ipData.proxy === "yes",
          proxyType: ipData.type,
          riskScore: ipData.risk || 0,
          country: ipData.country,
          isocode: ipData.isocode,
          asn: ipData.asn,
          isp: ipData.isp,
          lastSeen: ipData.last_seen,
          attackHistory: ipData.attack_history,
        };
      }

      return {
        isProxy: false,
        riskScore: 0,
      };
    } catch (error) {
      return {
        isProxy: false,
        riskScore: 50, // Assume medium risk on error
        error: error.message,
      };
    }
  }

  private calculateRiskScore(
    policyResults: Array<PolicyResult>,
    threatAnalysis: ThreatAnalysis,
  ): number {
    // Calculate weighted risk score
    let totalRisk = 0;
    let weight = 0;

    // Policy-based risk
    policyResults.forEach((result) => {
      const policyWeight = result.policy.weight || 1;
      totalRisk += result.riskScore * policyWeight;
      weight += policyWeight;
    });

    // Threat analysis risk
    totalRisk += (threatAnalysis.riskScore || 0) * 2; // Higher weight for actual threat data
    weight += 2;

    return weight > 0 ? Math.min(100, Math.round(totalRisk / weight)) : 0;
  }

  private auditAccess(
    auditId: string,
    event: string,
    request: AccessRequest,
    decision?: AccessDecision,
    error?: string,
  ): void {
    const entry: AuditEntry = {
      auditId,
      timestamp: new Date(),
      event,
      sourceIP: request.sourceIP,
      userAgent: request.userAgent,
      userId: request.userId,
      resource: request.resource,
      decision,
      error,
      compliance: {
        gdprApplicable: this.complianceSettings.gdprCompliance,
        dataRetentionDays: this.complianceSettings.dataRetentionDays,
        anonymized: this.complianceSettings.anonymizeData,
      },
    };

    this.auditLog.push(entry);

    // In production, this would be sent to a secure logging system
    if (this.complianceSettings.realTimeAuditLogging) {
      console.log("AUDIT:", JSON.stringify(entry));
    }
  }

  getAuditLog(): Array<AuditEntry> {
    return [...this.auditLog];
  }

  generateComplianceReport(): ComplianceReport {
    const totalAccess = this.auditLog.length;
    const deniedAccess = this.auditLog.filter(
      (entry) => entry.decision && !entry.decision.allowed,
    ).length;

    return {
      reportDate: new Date(),
      totalAccessAttempts: totalAccess,
      deniedAccessAttempts: deniedAccess,
      successRate: totalAccess > 0 ? ((totalAccess - deniedAccess) / totalAccess) * 100 : 0,
      averageResponseTime:
        this.auditLog
          .filter((entry) => entry.decision?.responseTime)
          .reduce((sum, entry) => sum + (entry.decision?.responseTime || 0), 0) / totalAccess,
      complianceSettings: this.complianceSettings,
      dataRetentionStatus: "compliant",
      gdprCompliance: this.complianceSettings.gdprCompliance,
    };
  }
}

// Type definitions
interface EnterpriseConfig {
  apiKey: string;
  organizationName: string;
  version: string;
  logLevel?: "debug" | "info" | "warn" | "error";
  securityPolicies: Array<SecurityPolicy>;
  complianceSettings: ComplianceSettings;
}

interface SecurityPolicy {
  name: string;
  type: "geolocation" | "proxy_detection" | "risk_assessment" | "time_based";
  enabled: boolean;
  weight?: number;
  blockedCountries?: Array<string>;
  allowedCountries?: Array<string>;
  blockProxies?: boolean;
  riskThreshold?: number;
  warningThreshold?: number;
  businessHoursOnly?: boolean;
}

interface ComplianceSettings {
  gdprCompliance: boolean;
  dataRetentionDays: number;
  anonymizeData: boolean;
  riskThreshold: number;
  realTimeAuditLogging: boolean;
}

interface AccessRequest {
  sourceIP: string;
  userAgent?: string;
  userId?: string;
  resource?: string;
  timestamp?: Date;
}

interface AccessDecision {
  allowed: boolean;
  reason: string;
  policy?: string;
  riskScore: number;
  threatDetails?: ThreatAnalysis;
  auditId: string;
  responseTime: number;
}

interface PolicyResult {
  policy: SecurityPolicy;
  action: "allow" | "block" | "flag" | "error";
  reason: string;
  riskScore: number;
}

interface ThreatAnalysis {
  isProxy: boolean;
  proxyType?: string;
  riskScore: number;
  country?: string;
  isocode?: string;
  asn?: string;
  isp?: string;
  lastSeen?: string;
  attackHistory?: string;
  error?: string;
}

interface AuditEntry {
  auditId: string;
  timestamp: Date;
  event: string;
  sourceIP: string;
  userAgent?: string;
  userId?: string;
  resource?: string;
  decision?: AccessDecision;
  error?: string;
  compliance: {
    gdprApplicable: boolean;
    dataRetentionDays: number;
    anonymized: boolean;
  };
}

interface ComplianceReport {
  reportDate: Date;
  totalAccessAttempts: number;
  deniedAccessAttempts: number;
  successRate: number;
  averageResponseTime: number;
  complianceSettings: ComplianceSettings;
  dataRetentionStatus: string;
  gdprCompliance: boolean;
}

async function enterpriseSecurityExamples() {
  console.log("🏢 ProxyCheck.io TypeScript SDK - Enterprise Security Examples\n");

  // Example 1: Enterprise Security Manager Setup
  console.log("1. Setting up Enterprise Security Manager...");

  const enterpriseConfig: EnterpriseConfig = {
    apiKey: process.env.PROXYCHECK_API_KEY || "your-api-key-here",
    organizationName: "AcmeCorp",
    version: "1.0.0",
    logLevel: "info",
    securityPolicies: [
      {
        name: "Geographic Restrictions",
        type: "geolocation",
        enabled: true,
        weight: 3,
        blockedCountries: ["CN", "RU", "KP"], // China, Russia, North Korea
      },
      {
        name: "Proxy Detection",
        type: "proxy_detection",
        enabled: true,
        weight: 4,
        blockProxies: true,
      },
      {
        name: "Risk Assessment",
        type: "risk_assessment",
        enabled: true,
        weight: 3,
        riskThreshold: 80,
        warningThreshold: 50,
      },
      {
        name: "Business Hours Policy",
        type: "time_based",
        enabled: true,
        weight: 1,
        businessHoursOnly: false, // Set to true for strict business hours
      },
    ],
    complianceSettings: {
      gdprCompliance: true,
      dataRetentionDays: 90,
      anonymizeData: true,
      riskThreshold: 70,
      realTimeAuditLogging: true,
    },
  };

  const securityManager = new EnterpriseSecurityManager(enterpriseConfig);
  console.log("✅ Enterprise Security Manager initialized");
  console.log("");

  // Example 2: Access Validation Scenarios
  console.log("2. Testing Access Validation Scenarios...");

  const testScenarios: Array<AccessRequest> = [
    {
      sourceIP: "8.8.8.8",
      userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      userId: "user123",
      resource: "/api/sensitive-data",
    },
    {
      sourceIP: "171.245.231.241", // Known proxy
      userAgent: "curl/7.68.0",
      userId: "user456",
      resource: "/admin/dashboard",
    },
    {
      sourceIP: "185.220.101.1", // Tor node
      userAgent: "Tor Browser",
      userId: "anonymous",
      resource: "/api/public",
    },
    {
      sourceIP: "3.96.211.99", // Clean hosting IP
      userAgent: "PostmanRuntime/7.28.0",
      userId: "api_user",
      resource: "/api/data",
    },
  ];

  for (const [index, scenario] of testScenarios.entries()) {
    console.log(`  Scenario ${index + 1}: ${scenario.sourceIP}`);
    const decision = await securityManager.validateAccess(scenario);

    const status = decision.allowed ? "✅ ALLOWED" : "❌ DENIED";
    console.log(`    Result: ${status}`);
    console.log(`    Reason: ${decision.reason}`);
    console.log(`    Risk Score: ${decision.riskScore}%`);
    console.log(`    Response Time: ${decision.responseTime}ms`);
    console.log(`    Audit ID: ${decision.auditId}`);

    if (decision.threatDetails) {
      console.log(
        `    Threat Details: Proxy=${decision.threatDetails.isProxy}, Type=${decision.threatDetails.proxyType || "none"}`,
      );
    }
    console.log("");
  }

  // Example 3: Compliance Reporting
  console.log("3. Generating Compliance Report...");
  const complianceReport = securityManager.generateComplianceReport();

  console.log("Compliance Report:");
  console.log(`  Report Date: ${complianceReport.reportDate.toISOString()}`);
  console.log(`  Total Access Attempts: ${complianceReport.totalAccessAttempts}`);
  console.log(`  Denied Access Attempts: ${complianceReport.deniedAccessAttempts}`);
  console.log(`  Success Rate: ${complianceReport.successRate.toFixed(2)}%`);
  console.log(`  Average Response Time: ${complianceReport.averageResponseTime.toFixed(0)}ms`);
  console.log(`  GDPR Compliance: ${complianceReport.gdprCompliance ? "✅" : "❌"}`);
  console.log(`  Data Retention: ${complianceReport.complianceSettings.dataRetentionDays} days`);
  console.log(
    `  Data Anonymization: ${complianceReport.complianceSettings.anonymizeData ? "✅" : "❌"}`,
  );
  console.log("");

  // Example 4: Audit Log Review
  console.log("4. Audit Log Review...");
  const auditLog = securityManager.getAuditLog();

  console.log(`Total Audit Entries: ${auditLog.length}`);
  console.log("\nRecent Audit Entries:");

  auditLog.slice(-3).forEach((entry, index) => {
    console.log(`  Entry ${auditLog.length - 2 + index}:`);
    console.log(`    Event: ${entry.event}`);
    console.log(`    Source IP: ${entry.sourceIP}`);
    console.log(`    User ID: ${entry.userId || "unknown"}`);
    console.log(`    Timestamp: ${entry.timestamp.toISOString()}`);
    console.log(`    GDPR Applicable: ${entry.compliance.gdprApplicable ? "✅" : "❌"}`);
  });
  console.log("");

  // Example 5: Security Incident Response
  console.log("5. Security Incident Response Simulation...");

  const suspiciousActivity = {
    sourceIP: "171.245.231.241",
    userAgent: "automated-scanner/1.0",
    resource: "/admin/users",
    userId: "unknown",
  };

  console.log(`Investigating suspicious activity from ${suspiciousActivity.sourceIP}...`);
  const incidentAnalysis = await securityManager.validateAccess(suspiciousActivity);

  if (!incidentAnalysis.allowed) {
    console.log("🚨 SECURITY INCIDENT DETECTED");
    console.log(
      `   Threat Level: ${incidentAnalysis.riskScore >= 90 ? "CRITICAL" : incidentAnalysis.riskScore >= 70 ? "HIGH" : "MEDIUM"}`,
    );
    console.log("   Recommended Action: Immediate IP block");
    console.log(`   Investigation Priority: ${incidentAnalysis.riskScore >= 90 ? "P1" : "P2"}`);

    // Simulate incident response actions
    const responseActions = [
      "IP address added to security blacklist",
      "Security team notified via alert system",
      "Incident logged in SIEM system",
      "Automated threat intelligence feed updated",
      "Compliance team notified for audit purposes",
    ];

    console.log("   Automated Response Actions:");
    responseActions.forEach((action) => console.log(`     - ${action}`));
  }
}

// Run examples
async function main() {
  await enterpriseSecurityExamples();

  console.log("\n🎯 Enterprise Security Examples Complete!");
  console.log(
    "💡 Tip: Implement comprehensive logging, monitoring, and incident response procedures for production systems.",
  );
}

if (require.main === module) {
  main().catch(console.error);
}

export { main as runEnterpriseSecurityExamples };
