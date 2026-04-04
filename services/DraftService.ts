import { LocalDraftReport } from "@/types/LocalDraftReport";
import AsyncStorage from "@react-native-async-storage/async-storage";

const STORAGE_KEY = "LOCAL_PENDING_REPORTS";

export const DraftService = {
  async getAll(): Promise<LocalDraftReport[]> {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  },

  async getById(localId: string): Promise<LocalDraftReport | null> {
    const all = await this.getAll();
    return all.find((r) => r.localId === localId) || null;
  },

  async save(draft: LocalDraftReport) {
    const all = await this.getAll();
    const index = all.findIndex((r) => r.localId === draft.localId);

    const updatedDraft = {
      ...draft,
      updatedAt: new Date().toISOString(),
    };

    if (index >= 0) {
      all[index] = updatedDraft;
    } else {
      all.push(updatedDraft);
    }

    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  },

  async delete(localId: string) {
    const all = await this.getAll();
    const filtered = all.filter((r) => r.localId !== localId);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
  },

  async clearAll() {
    await AsyncStorage.removeItem(STORAGE_KEY);
  },
};
