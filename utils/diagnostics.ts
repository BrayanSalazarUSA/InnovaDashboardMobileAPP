import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
import { Platform } from "react-native";

const DIAGNOSTICS_STORAGE_KEY = "@innova/mobile-diagnostics/v1";
const MAX_DIAGNOSTIC_ENTRIES = 80;

export type DiagnosticLevel = "error" | "warning" | "info";

export type DiagnosticEntry = {
  id: string;
  level: DiagnosticLevel;
  source: string;
  message: string;
  stack?: string;
  extra?: string;
  timestamp: string;
  appVersion: string;
  platform: string;
};

let writeChain: Promise<void> = Promise.resolve();

function trimText(value: string, maxLength = 1400) {
  if (value.length <= maxLength) {
    return value;
  }

  return `${value.slice(0, maxLength - 1)}...`;
}

function stringifyUnknown(value: unknown) {
  if (value instanceof Error) {
    return value.message;
  }

  if (typeof value === "string") {
    return value;
  }

  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

export function getAppVersionLabel() {
  const version =
    Constants.expoConfig?.version || Constants.nativeAppVersion || "dev";
  const build = Constants.nativeBuildVersion;

  return build ? `v${version} (${build})` : `v${version}`;
}

async function readDiagnosticsUnsafe() {
  const raw = await AsyncStorage.getItem(DIAGNOSTICS_STORAGE_KEY);

  if (!raw) {
    return [] as DiagnosticEntry[];
  }

  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as DiagnosticEntry[]) : [];
  } catch {
    return [];
  }
}

function enqueueWrite(task: () => Promise<void>) {
  writeChain = writeChain.then(task).catch(() => undefined);
  return writeChain;
}

export function recordDiagnostic({
  level = "error",
  source,
  message,
  error,
  extra,
}: {
  level?: DiagnosticLevel;
  source: string;
  message: string;
  error?: unknown;
  extra?: unknown;
}) {
  const normalizedError = error instanceof Error ? error : null;

  const entry: DiagnosticEntry = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    level,
    source,
    message: trimText(message),
    stack: normalizedError?.stack
      ? trimText(normalizedError.stack, 2200)
      : undefined,
    extra:
      extra !== undefined ? trimText(stringifyUnknown(extra), 2200) : undefined,
    timestamp: new Date().toISOString(),
    appVersion: getAppVersionLabel(),
    platform: `${Platform.OS} ${String(Platform.Version ?? "")}`.trim(),
  };

  void enqueueWrite(async () => {
    const current = await readDiagnosticsUnsafe();
    const next = [entry, ...current].slice(0, MAX_DIAGNOSTIC_ENTRIES);
    await AsyncStorage.setItem(
      DIAGNOSTICS_STORAGE_KEY,
      JSON.stringify(next),
    );
  });

  return entry;
}

export async function getDiagnosticEntries() {
  const entries = await readDiagnosticsUnsafe();
  return entries.filter((entry) => entry.level === "error");
}

export async function clearDiagnosticEntries() {
  await AsyncStorage.removeItem(DIAGNOSTICS_STORAGE_KEY);
}

export function initializeDiagnostics() {
  const globalScope = globalThis as typeof globalThis & {
    __innovaDiagnosticsInstalled?: boolean;
    __innovaOriginalConsoleError?: typeof console.error;
    ErrorUtils?: {
      getGlobalHandler?: () => ((error: Error, isFatal?: boolean) => void) | undefined;
      setGlobalHandler?: (
        handler: (error: Error, isFatal?: boolean) => void,
      ) => void;
    };
  };

  if (globalScope.__innovaDiagnosticsInstalled) {
    return;
  }

  globalScope.__innovaDiagnosticsInstalled = true;

  const originalConsoleError =
    globalScope.__innovaOriginalConsoleError || console.error.bind(console);

  globalScope.__innovaOriginalConsoleError = originalConsoleError;

  console.error = (...args: unknown[]) => {
    recordDiagnostic({
      level: "error",
      source: "console.error",
      message: trimText(args.map((arg) => stringifyUnknown(arg)).join(" | ")),
      error: args.find((arg) => arg instanceof Error),
    });

    originalConsoleError(...args);
  };

  const previousHandler = globalScope.ErrorUtils?.getGlobalHandler?.();

  globalScope.ErrorUtils?.setGlobalHandler?.((error, isFatal) => {
    recordDiagnostic({
      level: "error",
      source: isFatal ? "js.fatal" : "js.unhandled",
      message: error?.message || "Error JavaScript no controlado",
      error,
      extra: { isFatal },
    });

    previousHandler?.(error, isFatal);
  });
}
