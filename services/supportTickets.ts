import resolveApiBaseUrl from "@/utils/apiBaseUrl";
import { fetchWithRetry } from "@/utils/fetchWithRetry";

const API_URL = resolveApiBaseUrl().replace(/\/$/, "");

export type SupportTicketCategory =
  | "COMPUTER"
  | "NVR"
  | "CAMERA"
  | "CAMERA_OFFLINE"
  | "INTERMITTENCY"
  | "NETWORK"
  | "TABLET"
  | "MONITOR"
  | "ACCESS_CONTROL"
  | "SOFTWARE"
  | "INTERNET"
  | "OTHER";

type RequestOptions = {
  userId?: number | string | null;
  role?: string;
};

type TicketPayload = {
  title: string;
  description: string;
  category: SupportTicketCategory;
  propertyId: number;
  reportedById: number;
  relatedTicketId?: number;
  relationType?: string;
  relationReason?: string;
  aiRelationReason?: string;
  aiRelationConfidence?: number;
};

type TicketUpdatePayload = {
  title: string;
  description: string;
  category: SupportTicketCategory;
  propertyId: number;
  priority?: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
};

function authHeaders(options: RequestOptions = {}) {
  return {
    Userid: String(options.userId || 1),
    Role: options.role || "Admin",
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

async function jsonRequest(endpoint: string, init: RequestInit, options = {}) {
  const response = await fetchWithRetry(
    `${API_URL}/${endpoint.replace(/^\//, "")}`,
    {
      ...init,
      headers: {
        "Content-Type": "application/json",
        ...(init.headers || {}),
      },
    },
    options,
  );

  return parseResponse(response);
}

export const SupportTicketsApi = {
  async list(params: {
    query?: string;
    propertyId?: number | null;
    category?: SupportTicketCategory | "ALL";
    status?: string;
    onlyOpen?: boolean;
    onlyClosed?: boolean;
    page?: number;
    size?: number;
    userId?: number | string | null;
  }) {
    const search = new URLSearchParams();
    if (params.query) search.set("query", params.query);
    if (params.propertyId) search.set("propertyId", String(params.propertyId));
    if (params.category && params.category !== "ALL") {
      search.set("category", params.category);
    }
    if (params.status && params.status !== "ALL") {
      search.set("status", params.status);
    }
    if (params.onlyOpen) search.set("onlyOpen", "true");
    if (params.onlyClosed) search.set("onlyClosed", "true");
    search.set("page", String(params.page ?? 0));
    search.set("size", String(params.size ?? 30));
    search.set("sortBy", "updatedAt");
    search.set("direction", "desc");

    return jsonRequest(`support-tickets?${search.toString()}`, {
      method: "GET",
      headers: authHeaders({ userId: params.userId }),
    });
  },

  async detail(ticketId: number, options?: RequestOptions) {
    return jsonRequest(`support-tickets/${ticketId}`, {
      method: "GET",
      headers: authHeaders(options),
    });
  },

  async suggestRelationships(payload: TicketPayload, options?: RequestOptions) {
    return jsonRequest("support-tickets/relationship-suggestions", {
      method: "POST",
      headers: authHeaders(options),
      body: JSON.stringify(payload),
    });
  },

  async create(payload: TicketPayload, options?: RequestOptions) {
    return jsonRequest("support-tickets/mobile", {
      method: "POST",
      headers: authHeaders(options),
      body: JSON.stringify(payload),
    });
  },

  async update(ticketId: number, payload: TicketUpdatePayload, options?: RequestOptions) {
    return jsonRequest(`support-tickets/${ticketId}/mobile`, {
      method: "PUT",
      headers: authHeaders(options),
      body: JSON.stringify(payload),
    });
  },

  async addActivity(
    ticketId: number,
    message: string,
    options?: RequestOptions,
  ) {
    return jsonRequest(`support-tickets/${ticketId}/mobile-updates`, {
      method: "POST",
      headers: authHeaders(options),
      body: JSON.stringify({ message, internalNote: false }),
    });
  },

  async uploadAttachment(
    ticketId: number,
    file: { uri: string; type?: string; name?: string },
    options?: RequestOptions,
  ) {
    const formData = new FormData();
    formData.append("attachments", {
      uri: file.uri,
      type: file.type || "image/jpeg",
      name: file.name || "support_evidence.jpg",
    } as any);
    const response = await fetch(`${API_URL}/support-tickets/${ticketId}/mobile-attachments`, {
      method: "POST",
      headers: authHeaders(options),
      body: formData,
    });

    return parseResponse(response);
  },

  async deleteAttachment(
    ticketId: number,
    attachmentId: number,
    options?: RequestOptions,
  ) {
    return jsonRequest(`support-tickets/${ticketId}/attachments/${attachmentId}`, {
      method: "DELETE",
      headers: authHeaders(options),
    });
  },

  async close(ticketId: number, resolutionSummary: string, options?: RequestOptions) {
    return jsonRequest(`support-tickets/${ticketId}/close`, {
      method: "POST",
      headers: authHeaders(options),
      body: JSON.stringify({ resolutionSummary }),
    });
  },
};
