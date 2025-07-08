/**
 * Test vectors for live API integration tests
 * 
 * These are carefully selected IP addresses and emails that have been verified
 * to have stable classifications. However, classifications can change over time,
 * so tests should handle potential changes gracefully.
 */

export interface TestVector {
  description: string;
  value: string;
  expectedProxy?: 'yes' | 'no';
  expectedType?: string;
  notes?: string;
}

export interface TestVectorSet {
  ips: Array<TestVector>;
  emails: Array<TestVector>;
}

export const TEST_VECTORS = {
  // Clean IPs - verified clean IPs with 0% risk
  clean: {
    ips: [
      {
        description: 'Google Public DNS (Clean)',
        value: '8.8.8.8',
        expectedProxy: 'no',
        notes: 'United States - 0% risk - No proxy'
      },
      {
        description: 'Cloudflare DNS',
        value: '1.1.1.1',
        expectedProxy: 'no',
        notes: 'Cloudflare public DNS'
      },
      {
        description: 'OpenDNS',
        value: '208.67.222.222',
        expectedProxy: 'no',
        notes: 'OpenDNS resolver'
      }
    ],
    emails: [
      {
        description: 'Gmail address',
        value: 'test@gmail.com',
        notes: 'Standard Gmail domain'
      },
      {
        description: 'Outlook address',
        value: 'test@outlook.com',
        notes: 'Microsoft email domain'
      },
      {
        description: 'Temp Mail (Currently Non-Disposable)',
        value: 'test@tempmail.org',
        notes: 'API currently reports as non-disposable - classification may change'
      }
    ]
  },

  // Known proxy IPs with high risk
  proxy: {
    ips: [
      {
        description: 'Vietnam Proxy - High Risk',
        value: '171.245.231.241',
        expectedProxy: 'yes',
        expectedType: 'PROXY',
        notes: 'Vietnam - 100% risk - Confirmed proxy'
      },
      {
        description: 'Known Tor Exit Node',
        value: '185.220.101.1',
        expectedProxy: 'yes',
        expectedType: 'TOR',
        notes: 'May change - Tor exit nodes rotate'
      }
    ],
    emails: []
  },

  // VPN/Hosting Provider IPs
  vpn: {
    ips: [
      {
        description: 'Canada Hosting Provider (Currently Clean)',
        value: '3.96.211.99',
        expectedProxy: 'no',
        expectedType: undefined,
        notes: 'Canada - Currently 0% risk - Classification may change'
      },
      {
        description: 'Known VPN Server',
        value: '134.195.196.26',
        expectedProxy: 'yes',
        expectedType: 'VPN',
        notes: 'Commercial VPN provider'
      }
    ],
    emails: []
  },

  // Disposable email domains
  disposableEmail: {
    ips: [],
    emails: [
      {
        description: 'Example.com domain (API reports as disposable)',
        value: 'johndoe@example.com',
        notes: 'Example domain - API currently considers this disposable'
      },
      {
        description: 'Mailinator - Disposable',
        value: 'johndoe@mailinator.com',
        notes: 'Well-known disposable email service'
      },
      {
        description: '10 Minute Mail',
        value: 'test@10minutemail.com',
        notes: 'Popular disposable email service'
      },
      {
        description: 'Guerrilla Mail',
        value: 'test@guerrillamail.com',
        notes: 'Disposable email provider'
      }
    ]
  },

  // High-risk IPs (known for malicious activity)
  highRisk: {
    ips: [
      {
        description: 'Vietnam Proxy - Maximum Risk',
        value: '171.245.231.241',
        notes: 'Vietnam - 100% risk score - Confirmed proxy'
      }
    ],
    emails: []
  },

  // IPs from specific countries for testing country blocking
  countrySpecific: {
    ips: [
      {
        description: 'US IP (Google DNS)',
        value: '8.8.8.8',
        notes: 'United States - Clean IP'
      },
      {
        description: 'Vietnam IP (Proxy)',
        value: '171.245.231.241',
        notes: 'Vietnam - 100% risk proxy'
      },
      {
        description: 'Canada IP (Hosting)',
        value: '3.96.211.99',
        notes: 'Canada - 66% risk hosting/VPN'
      }
    ],
    emails: []
  }
};

// Helper function to get all test IPs
export function getAllTestIPs(): Array<TestVector> {
  return Object.values(TEST_VECTORS).flatMap(category => category.ips);
}

// Helper function to get all test emails
export function getAllTestEmails(): Array<TestVector> {
  return Object.values(TEST_VECTORS).flatMap(category => category.emails);
}

// Rate limit helper - wait between requests
export async function rateLimitDelay(ms = 1000): Promise<void> {
  await new Promise(resolve => setTimeout(resolve, ms));
}