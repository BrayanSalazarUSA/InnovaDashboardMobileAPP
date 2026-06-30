import { fetchWithRetry } from "@/utils/fetchWithRetry";
import { resolveApiBaseUrl } from "@/utils/apiBaseUrl";
import { MONITOR_ROLE, MONITOR_USER_ID } from "@/utils/monitorIdentity";

const API_URL = resolveApiBaseUrl();

type RequestOptions = {
  userId?: number | string | null;
  role?: string;
};

function authHeaders(options: RequestOptions = {}) {
  return {
    Userid: String(options.userId ?? MONITOR_USER_ID),
    Role: options.role || MONITOR_ROLE,
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

export const NotificationsApi = {
  async list(options?: RequestOptions, limit = 50) {
    const response = await fetchWithRetry(`${API_URL}/notifications?limit=${limit}`, {
      method: "GET",
      headers: authHeaders(options),
    });

    return parseResponse(response);
  },

  async unreadCount(options?: RequestOptions) {
    const response = await fetchWithRetry(`${API_URL}/notifications/unread-count`, {
      method: "GET",
      headers: authHeaders(options),
    });

    return parseResponse(response);
  },

  async markAsRead(notificationId: number | string, options?: RequestOptions) {
    const response = await fetchWithRetry(
      `${API_URL}/notifications/${notificationId}/read`,
      {
        method: "POST",
        headers: authHeaders(options),
      },
    );

    return parseResponse(response);
  },

  async markAllAsRead(options?: RequestOptions) {
    const response = await fetchWithRetry(`${API_URL}/notifications/read-all`, {
      method: "POST",
      headers: authHeaders(options),
    });

    return parseResponse(response);
  },
};
