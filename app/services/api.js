const API_URL = process.env.EXPO_PUBLIC_SERVER_IP || "http://localhost:8080/api";
import { Buffer } from "buffer";
global.Buffer = Buffer;

async function apiFetch(endpoint, options = {}) {
  const url = `${API_URL.replace(/\/$/, "")}/${endpoint.replace(/^\//, "")}`;

  try {
    const res = await fetch(url, {
      headers: {
        "Content-Type": "application/json",
        Role: "Admin",
        ...(options.headers || {}),
      },
      ...options,
    });

    const raw = await res.text();
    let data;
    try {
      data = JSON.parse(raw);
    } catch {
      data = raw;
    }


    if (!res.ok) {
      console.error(`Error HTTP ${res.status} (${res.statusText})`);
      throw new Error(
        `API Error ${res.status}: ${
          typeof data === "string" ? data : JSON.stringify(data)
        }`
      );
    }

    return data;
  } catch (err) {
    console.error("Error en apiFetch:", err.message);
    throw err;
  }
}

export const ApiService = {
  getProperties: () => apiFetch("properties"),
  getBuildings: (propertyId) => apiFetch(`buildings/${propertyId}`),
  getIncidents: () => apiFetch("cases"),
  getMonitors: () => apiFetch("users/agents"),
  getReportById: (reportId) => apiFetch("pending-reports/"+reportId),

  createReport: async (data) => {
  const formData = new FormData();


    const now = new Date();
    const formattedDate = `${String(now.getDate()).padStart(2, "0")}/${String(
      now.getMonth() + 1
    ).padStart(2, "0")}/${now.getFullYear()}`;

    console.log(" Fecha del reporte:", formattedDate);

formData.append("pendingReport", {
  uri: `data:application/json;base64,${Buffer.from(JSON.stringify({
    property: data.property,
    contributedBy: data.contributedBy,
    caseType: data.caseType,
    incidentDate: formattedDate, // 🔹 En formato dd/MM/yyyy
    incidentStartTime: data.incidentStartTime,
    incidentEndTime: data.incidentEndTime,
    reportDetails: data.reportDetails,
    incidentLocations: data.incidentLocations,
  })).toString("base64")}`,
  name: "pendingReport.json",
  type: "application/json",
});


  // Archivos (Expo los maneja bien si vienen del picker)
  if (data.evidences?.length > 0) {
    data.evidences.forEach((file, i) => {
      formData.append("evidences", {
        uri: file.uri,
        type: file.type || "image/jpeg",
        name: file.name || `evidence_${i}.jpg`,
      });
    });
  }

  console.log("📡 Endpoint:", `${API_URL}/pending-reports`);

  try {
    const response = await fetch(`${API_URL}/pending-reports`, {
      method: "POST",
      body: formData,
    });

    const result = await response.json();
    console.log(" Reporte creado:", result);
    return result;

  } catch (error) {
    console.error("🚨 Error completo al enviar:", error);
  }
}
};
