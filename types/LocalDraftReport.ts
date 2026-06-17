import { ReportImage } from "@/app/(drawer)/new";

export type LocalDraftReport = {
  localId: string;
  createdAt: string;
  updatedAt: string;

  // IDs (para submit)
  propertyId: string;
  incidentId: string;
  monitorId: string;

  // 🔥 NOMBRES (para UI offline)
  propertyName?: string;
  incidentLabel?: string;
  monitorName?: string;

  startTime: string;
  endTime: string;
  description: string;

  images: ReportImage[];
  followings: any[];
  incidentLocations: any[];

  isHighPriority: boolean;
  policeFirstResponderNotified?: boolean;
  policeFirstResponderScene?: string;
  status: "draft" | "ready";
};
