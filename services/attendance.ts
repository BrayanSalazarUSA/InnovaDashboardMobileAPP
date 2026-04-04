import {
  AttendanceDashboard,
  AttendanceEmployee,
  AttendanceLookupResponse,
  AttendanceOvertimeRequest,
  AttendancePendingClosure,
  AttendanceSessionSummary,
} from "@/types/attendance";
import { runWithCacheFallback } from "@/utils/apiCache";
import resolveApiBaseUrl from "@/utils/apiBaseUrl";
import { fetchWithRetry } from "@/utils/fetchWithRetry";
import { Platform } from "react-native";

const API_URL = resolveApiBaseUrl();
const TEAM_MEMBERS_CACHE_TTL_MS = 12 * 60 * 60 * 1000;

type ApiActionResponse<T> = {
  success: boolean;
  message: string;
  data: T;
};

function appendSelfieOrThrow(
  formData: FormData,
  selfieUri: string | null | undefined,
  prefix: "clock-in" | "clock-out",
) {
  if (selfieUri) {
    formData.append("selfie", {
      uri: selfieUri,
      name: `${prefix}-${Date.now()}.jpg`,
      type: "image/jpeg",
    } as any);
    return;
  }

  if (Platform.OS === "web") {
    const svg = `
      <svg xmlns="http://www.w3.org/2000/svg" width="320" height="320">
        <rect width="100%" height="100%" fill="#F7E8B0" />
        <text x="50%" y="45%" text-anchor="middle" font-size="20" fill="#6D5200">
          INNOVA MONITORING
        </text>
        <text x="50%" y="58%" text-anchor="middle" font-size="18" fill="#6D5200">
          SELFIE OMITIDA EN WEB
        </text>
      </svg>
    `.trim();

    formData.append(
      "selfie",
      new Blob([svg], { type: "image/svg+xml" }),
      `${prefix}-web-test-${Date.now()}.svg`,
    );
    return;
  }

  throw new Error("La selfie sigue siendo obligatoria en este dispositivo.");
}

async function parseResponse<T>(response: Response): Promise<T> {
  const raw = await response.text();
  let data: unknown = null;

  try {
    data = raw ? JSON.parse(raw) : null;
  } catch {
    data = raw;
  }

  if (!response.ok) {
    const message =
      typeof data === "object" && data !== null && "message" in data
        ? String((data as { message?: unknown }).message || "Error inesperado")
        : typeof data === "string" && data
          ? data
          : `Error ${response.status}`;
    throw new Error(message);
  }

  return data as T;
}

function buildUrl(path: string) {
  return `${API_URL.replace(/\/$/, "")}/${path.replace(/^\//, "")}`;
}

export const AttendanceApi = {
  async employees() {
    return runWithCacheFallback({
      cacheKey: "attendance/team-members",
      maxAgeMs: TEAM_MEMBERS_CACHE_TTL_MS,
      loader: async () =>
        parseResponse<AttendanceEmployee[]>(
          await fetchWithRetry(buildUrl("attendance/team-members")),
        ),
    });
  },

  async lookup(code: string) {
    const params = new URLSearchParams({ code: code.trim() });
    return parseResponse<AttendanceLookupResponse>(
      await fetchWithRetry(buildUrl(`attendance/lookup?${params.toString()}`)),
    );
  },

  async dashboard(date?: string) {
    const query = date ? `?date=${encodeURIComponent(date)}` : "";
    return parseResponse<AttendanceDashboard>(
      await fetchWithRetry(buildUrl(`attendance/dashboard${query}`)),
    );
  },

  async clockIn(
    code: string,
    selfieUri?: string | null,
    securityCode?: string | null,
  ) {
    const formData = new FormData();
    formData.append("code", code.trim());

    if (securityCode?.trim()) {
      formData.append("securityCode", securityCode.trim());
    }

    appendSelfieOrThrow(formData, selfieUri, "clock-in");

    const result = await parseResponse<ApiActionResponse<AttendanceSessionSummary>>(
      await fetch(buildUrl("attendance/clock-in"), {
        method: "POST",
        body: formData,
      }),
    );

    return result.data;
  },

  async startBreak(sessionId: number, securityCode?: string | null) {
    const params = new URLSearchParams();
    if (securityCode?.trim()) {
      params.append("securityCode", securityCode.trim());
    }

    const result = await parseResponse<ApiActionResponse<AttendanceSessionSummary>>(
      await fetch(
        buildUrl(
          `attendance/sessions/${sessionId}/break-start${
            params.toString() ? `?${params.toString()}` : ""
          }`,
        ),
        {
        method: "POST",
        },
      ),
    );

    return result.data;
  },

  async endBreak(sessionId: number, securityCode?: string | null) {
    const params = new URLSearchParams();
    if (securityCode?.trim()) {
      params.append("securityCode", securityCode.trim());
    }

    const result = await parseResponse<ApiActionResponse<AttendanceSessionSummary>>(
      await fetch(
        buildUrl(
          `attendance/sessions/${sessionId}/break-end${
            params.toString() ? `?${params.toString()}` : ""
          }`,
        ),
        {
        method: "POST",
        },
      ),
    );

    return result.data;
  },

  async clockOut(
    sessionId: number,
    selfieUri?: string | null,
    securityCode?: string | null,
  ) {
    const formData = new FormData();
    if (securityCode?.trim()) {
      formData.append("securityCode", securityCode.trim());
    }
    appendSelfieOrThrow(formData, selfieUri, "clock-out");

    const result = await parseResponse<ApiActionResponse<AttendanceSessionSummary>>(
      await fetch(buildUrl(`attendance/sessions/${sessionId}/clock-out`), {
        method: "POST",
        body: formData,
      }),
    );

    return result.data;
  },

  async pendingClosures() {
    return parseResponse<AttendancePendingClosure[]>(
      await fetchWithRetry(buildUrl("attendance/reviews/pending-closures")),
    );
  },

  async adminClose(
    sessionId: number,
    payload?: { clockOutAt?: string | null; note?: string; reviewedBy?: string },
  ) {
    const result = await parseResponse<ApiActionResponse<AttendanceSessionSummary>>(
      await fetch(buildUrl(`attendance/sessions/${sessionId}/admin-close`), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload || {}),
      }),
    );

    return result.data;
  },

  async approveAutoClose(
    sessionId: number,
    payload?: { note?: string; reviewedBy?: string },
  ) {
    const result = await parseResponse<ApiActionResponse<AttendanceSessionSummary>>(
      await fetch(buildUrl(`attendance/sessions/${sessionId}/approve-auto-close`), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload || {}),
      }),
    );

    return result.data;
  },

  async pendingOvertime() {
    return parseResponse<AttendanceOvertimeRequest[]>(
      await fetchWithRetry(buildUrl("time-adjustments/pending-overtime")),
    );
  },

  async approveOvertime(
    id: number,
    payload?: { approvedMinutes?: number | null; reviewNote?: string; reviewedBy?: string },
  ) {
    return parseResponse<AttendanceOvertimeRequest>(
      await fetch(buildUrl(`time-adjustments/${id}/approve`), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload || {}),
      }),
    );
  },

  async rejectOvertime(
    id: number,
    payload?: { reviewNote?: string; reviewedBy?: string },
  ) {
    return parseResponse<AttendanceOvertimeRequest>(
      await fetch(buildUrl(`time-adjustments/${id}/reject`), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload || {}),
      }),
    );
  },
};
