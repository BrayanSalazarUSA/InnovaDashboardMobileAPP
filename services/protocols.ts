import resolveApiBaseUrl from "@/utils/apiBaseUrl";
import { fetchWithRetry } from "@/utils/fetchWithRetry";
import { MONITOR_ROLE, MONITOR_USER_ID } from "@/utils/monitorIdentity";

const API_URL = resolveApiBaseUrl().replace(/\/$/, "");

type RequestOptions = {
  userId?: number | string | null;
  role?: string;
};

function authHeaders(options: RequestOptions = {}) {
  return {
    Userid: String(options.userId ?? MONITOR_USER_ID),
    Role: options.role || MONITOR_ROLE,
    "Content-Type": "application/json",
  };
}

async function parseResponse(response: Response) {
  const text = await response.text();
  let data: any = text;

  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }

  if (!response.ok) {
    const message =
      typeof data === "string" ? data : data?.message || JSON.stringify(data);
    throw new Error(message || `HTTP ${response.status}`);
  }

  return data;
}

export type ProtocolExecutionResponse = {
  id: number;
  protocolId: number;
  protocolTitle?: string;
  protocolTimeZone?: string;
  content?: string;
  scheduledFor: string;
  scheduledTimeZone?: string;
  status: "PENDING" | "ANSWERED" | "IGNORED";
  responseValue?: string;
  responseNote?: string;
  respondedByName?: string;
  respondedById?: number;
  respondedAt?: string;
  reminderCount?: number;
  lastReminderAt?: string;
  lastNotifiedAt?: string;
  ignoredAt?: string;
};

export const ProtocolsApi = {
  async recentResponses(hours = 24, options?: RequestOptions) {
    const response = await fetchWithRetry(
      `${API_URL}/protocols/executions/recent?hours=${hours}`,
      {
        method: "GET",
        headers: authHeaders(options),
      },
    );

    return parseResponse(response) as Promise<ProtocolExecutionResponse[]>;
  },

  async respond(
    executionId: number | string,
    payload: {
      responseValue: "YES" | "NO";
      responseNote?: string;
      responderName?: string;
      deviceId?: string;
    },
    options?: RequestOptions,
  ) {
    const response = await fetchWithRetry(
      `${API_URL}/protocols/executions/${executionId}/response`,
      {
        method: "POST",
        headers: authHeaders(options),
        body: JSON.stringify(payload),
      },
    );

    return parseResponse(response);
  },

  async sendTestNotification(options?: RequestOptions) {
    const response = await fetchWithRetry(
      `${API_URL}/protocols/test-notification`,
      {
        method: "POST",
        headers: authHeaders(options),
      },
    );

    return parseResponse(response) as Promise<{
      executionId?: number;
      protocolId?: number;
      message?: string;
    }>;
  },
};
