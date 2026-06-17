import { LocalDraftReport } from "@/types/LocalDraftReport";
import { v4 as uuidv4 } from "uuid";

export function createEmptyDraft(monitorId: string): LocalDraftReport {
  const now = new Date().toISOString();

  return {
    localId: uuidv4(),
    createdAt: now,
    updatedAt: now,

    propertyId: "",
    incidentId: "",
    monitorId,

    startTime: "",
    endTime: "",
    description: "",

    images: [],
    followings: [],
    incidentLocations: [],

    isHighPriority: false,
    policeFirstResponderNotified: false,
    policeFirstResponderScene: "",
    status: "draft",
  };
}
