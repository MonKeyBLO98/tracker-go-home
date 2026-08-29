export interface ProfileRow {
  id: number;
  profileName: string;
  createdAt: string;
  goCaptured: number;
  homeRegistered: number;
}

export type ScrapingFrequency = "24h" | "1week" | "manual";

export interface ScrapingSource {
  key: string;
  label: string;
  lastRun: string | null;
  lastData: string | null;
  rows: number | null;
}

export interface ScrapingStatus {
  frequency: ScrapingFrequency;
  sources: ScrapingSource[];
}
