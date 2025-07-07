/**
 * Modern structured logging system for ProxyCheck SDK
 */

export type LogLevel = "debug" | "info" | "warn" | "error" | "silent";

export interface LogContext {
  operation?: string;
  service?: string;
  requestId?: string;
  duration?: number;
  statusCode?: number;
  url?: string;
  method?: string;
  retryAttempt?: number;
  [key: string]: unknown;
}

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: LogContext;
  error?: {
    name: string;
    message: string;
    code?: string;
    stack?: string;
  };
}

export interface Logger {
  debug(message: string, context?: LogContext): void;
  info(message: string, context?: LogContext): void;
  warn(message: string, context?: LogContext): void;
  error(message: string, error?: Error, context?: LogContext): void;
  setLevel(level: LogLevel): void;
  getLevel(): LogLevel;
  isEnabled(level: LogLevel): boolean;
}

export interface LoggerOptions {
  level?: LogLevel;
  format?: "json" | "pretty";
  timestamp?: boolean;
  colors?: boolean;
  output?: (entry: LogEntry) => void;
}

/**
 * Default console logger implementation
 */
export class ConsoleLogger implements Logger {
  private _level: LogLevel;
  private _options: Required<LoggerOptions>;
  private readonly _levelOrder: Record<LogLevel, number> = {
    debug: 0,
    info: 1,
    warn: 2,
    error: 3,
    silent: 4,
  };

  constructor(options: LoggerOptions = {}) {
    this._level = options.level || "info";
    this._options = {
      level: this._level,
      format: options.format || "pretty",
      timestamp: options.timestamp ?? true,
      colors: options.colors ?? true,
      output: options.output || this.defaultOutput.bind(this),
    };
  }

  debug(message: string, context?: LogContext): void {
    this.log("debug", message, context);
  }

  info(message: string, context?: LogContext): void {
    this.log("info", message, context);
  }

  warn(message: string, context?: LogContext): void {
    this.log("warn", message, context);
  }

  error(message: string, error?: Error, context?: LogContext): void {
    const errorContext = error
      ? {
          name: error.name,
          message: error.message,
          ...((error as Error & { code?: string }).code !== undefined && {
            code: (error as Error & { code?: string }).code,
          }),
          ...(error.stack !== undefined && { stack: error.stack }),
        }
      : undefined;

    this.log("error", message, context, errorContext);
  }

  setLevel(level: LogLevel): void {
    this._level = level;
  }

  getLevel(): LogLevel {
    return this._level;
  }

  isEnabled(level: LogLevel): boolean {
    return this._levelOrder[level] >= this._levelOrder[this._level];
  }

  private log(
    level: LogLevel,
    message: string,
    context?: LogContext,
    error?: LogEntry["error"],
  ): void {
    if (!this.isEnabled(level)) {
      return;
    }

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      ...(context !== undefined && { context }),
      ...(error !== undefined && { error }),
    };

    this._options.output(entry);
  }

  private defaultOutput(entry: LogEntry): void {
    if (this._options.format === "json") {
      // biome-ignore lint/suspicious/noConsole: This is the intended output method for the logger
      console.log(JSON.stringify(entry));
      return;
    }

    // Pretty format
    const timestamp = this._options.timestamp ? `[${entry.timestamp}] ` : "";
    const levelColor = this.getLevelColor(entry.level);
    const level = this._options.colors
      ? `${levelColor}${entry.level.toUpperCase()}${this._colors.reset}`
      : entry.level.toUpperCase();

    let output = `${timestamp}${level}: ${entry.message}`;

    if (entry.context && Object.keys(entry.context).length > 0) {
      const contextStr = Object.entries(entry.context)
        .map(([key, value]) => `${key}=${value}`)
        .join(" ");
      output += ` (${contextStr})`;
    }

    if (entry.error) {
      output += `\n  Error: ${entry.error.name}: ${entry.error.message}`;
      if (entry.error.code) {
        output += ` [${entry.error.code}]`;
      }
      if (entry.error.stack && entry.level === "error") {
        output += `\n  Stack: ${entry.error.stack}`;
      }
    }

    // biome-ignore lint/suspicious/noConsole: This is the intended output method for the logger
    console.log(output);
  }

  private getLevelColor(level: LogLevel): string {
    if (!this._options.colors) {
      return "";
    }

    switch (level) {
      case "debug":
        return this._colors.gray;
      case "info":
        return this._colors.blue;
      case "warn":
        return this._colors.yellow;
      case "error":
        return this._colors.red;
      default:
        return "";
    }
  }

  private _colors = {
    reset: "\x1b[0m",
    red: "\x1b[31m",
    yellow: "\x1b[33m",
    blue: "\x1b[34m",
    gray: "\x1b[90m",
  };
}

/**
 * No-op logger for when logging is disabled
 */
export class NoOpLogger implements Logger {
  debug(): void {
    // No operation
  }
  info(): void {
    // No operation
  }
  warn(): void {
    // No operation
  }
  error(): void {
    // No operation
  }
  setLevel(): void {
    // No operation
  }
  getLevel(): LogLevel {
    return "silent";
  }
  isEnabled(): boolean {
    return false;
  }
}

/**
 * Logger factory
 */
export function createLogger(options: LoggerOptions = {}): Logger {
  if (options.level === "silent") {
    return new NoOpLogger();
  }
  return new ConsoleLogger(options);
}
