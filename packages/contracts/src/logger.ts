type LogLevel = "debug" | "info" | "warn" | "error";

interface LogEntry {
  level: LogLevel;
  message: string;
  service?: string;
  tenantId?: string | null;
  [key: string]: unknown;
}

function log(entry: LogEntry) {
  const payload = {
    timestamp: new Date().toISOString(),
    ...entry,
  };

  const line = JSON.stringify(payload);

  if (entry.level === "error") {
    console.error(line);
  } else if (entry.level === "warn") {
    console.warn(line);
  } else {
    console.log(line);
  }
}

export const logger = {
  debug(message: string, meta?: Record<string, unknown>) {
    log({ level: "debug", message, ...meta });
  },
  info(message: string, meta?: Record<string, unknown>) {
    log({ level: "info", message, ...meta });
  },
  warn(message: string, meta?: Record<string, unknown>) {
    log({ level: "warn", message, ...meta });
  },
  error(message: string, meta?: Record<string, unknown>) {
    log({ level: "error", message, ...meta });
  },
};
