/**
 * Zod schemas for runtime validation
 */

import { z } from "zod";

// Basic types
export const ProxyStatusSchema = z.enum(["yes", "no"]);
export const ProxyTypeSchema = z.enum(["VPN", "PUB", "WEB", "TOR", "DCH", "SES"]);
export const BlockStatusSchema = z.enum(["yes", "no", "na"]);
export const BlockReasonSchema = z.enum(["proxy", "vpn", "country", "disposable", "na"]);

// IP Address validation
export const IPAddressSchema = z.string().refine(
  (val) => {
    // IPv4
    const ipv4Regex =
      /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
    // IPv6
    const ipv6Regex =
      /^(([0-9a-fA-F]{1,4}:){7,7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:)|fe80:(:[0-9a-fA-F]{0,4}){0,4}%[0-9a-zA-Z]{1,}|::(ffff(:0{1,4}){0,1}:){0,1}((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])|([0-9a-fA-F]{1,4}:){1,4}:((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9]))$/;
    return ipv4Regex.test(val) || ipv6Regex.test(val);
  },
  {
    message: "Invalid IP address",
  },
);

// Email validation
export const EmailSchema = z.string().email();

// Address can be IP or Email
export const AddressSchema = z.union([IPAddressSchema, EmailSchema]);

// Currency schema
export const CurrencySchema = z.object({
  code: z.string().length(3),
  name: z.string(),
  symbol: z.string(),
});

// Address check result schema
export const AddressCheckResultSchema = z.object({
  proxy: ProxyStatusSchema,
  type: ProxyTypeSchema.optional(),
  risk: z.number().min(0).max(100).optional(),
  country: z.string().optional(),
  isocode: z.string().length(2).optional(),
  city: z.string().optional(),
  region: z.string().optional(),
  continent: z.string().optional(),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  asn: z.string().optional(),
  isp: z.string().optional(),
  organisation: z.string().optional(),
  currency: CurrencySchema.optional(),
  timezone: z.string().optional(),
  mobile: z.boolean().optional(),
  vpn: ProxyStatusSchema.optional(),
  port: z.boolean().optional(),
  seen: z.boolean().optional(),
  disposable: ProxyStatusSchema.optional(),
  // biome-ignore lint/style/useNamingConvention: API response field
  attack_history: z.string().optional(),
  // biome-ignore lint/style/useNamingConvention: API response field
  last_seen: z.string().optional(),
});

// Configuration options schema
export const ProxyCheckOptionsSchema = z.object({
  apiKey: z.string().optional(),
  asnData: z.boolean().optional(),
  allowedCountries: z.array(z.string()).optional(),
  blockedCountries: z.array(z.string()).optional(),
  tlsSecurity: z.boolean().optional(),
  infEngine: z.boolean().optional(),
  riskData: z.union([z.literal(0), z.literal(1), z.literal(2)]).optional(),
  vpnDetection: z.union([z.literal(0), z.literal(1), z.literal(2), z.literal(3)]).optional(),
  dayRestrictor: z.number().positive().optional(),
  queryTagging: z.boolean().optional(),
  customTag: z.string().optional(),
  maskAddress: z.boolean().optional(),
});

// Client configuration schema
export const ClientConfigSchema = z.object({
  apiKey: z.string().min(1, "API key is required"),
  baseUrl: z.string().optional(),
  timeout: z.number().positive().optional(),
  retries: z.number().nonnegative().optional(),
  retryDelay: z.number().nonnegative().optional(),
  tlsSecurity: z.boolean().optional(),
  userAgent: z.string().optional(),
  logging: z
    .object({
      level: z.enum(["debug", "info", "warn", "error", "silent"]).optional(),
      format: z.enum(["json", "pretty"]).optional(),
      timestamp: z.boolean().optional(),
      colors: z.boolean().optional(),
      output: z.function().optional(),
    })
    .optional(),
});

// List options schema
export const ListOptionsSchema = z.object({
  apiKey: z.string().optional(),
  tlsSecurity: z.boolean().optional(),
  listSelection: z.enum(["whitelist", "blacklist"]),
  listAction: z.enum(["add", "remove", "set", "get"]),
  listEntries: z.array(z.string()).optional(),
});

// Rule options schema
export const RuleOptionsSchema = z.object({
  apiKey: z.string().optional(),
  tlsSecurity: z.boolean().optional(),
  ruleSelection: z.string().optional(),
  ruleAction: z.enum(["add", "remove", "set", "get", "test"]),
  ruleEntries: z.string().optional(),
});

// Stats options schema
export const StatsOptionsSchema = z.object({
  apiKey: z.string().optional(),
  tlsSecurity: z.boolean().optional(),
  statSelection: z.enum(["detections", "queries", "usage"]),
  limit: z.number().positive().max(1000).optional(),
  offset: z.number().nonnegative().optional(),
});
