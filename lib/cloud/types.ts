export type TemplateId = "ledger" | "tax-report" | "monthly-summary" | "category-analysis" | "full-backup";

export type PeriodId = "this-month" | "last-month" | "last-3-months" | "this-year" | "last-year" | "all";

export type DestinationId =
  | "download"
  | "email"
  | "google-sheets"
  | "google-drive"
  | "dropbox"
  | "onedrive"
  | "notion"
  | "slack";

export type JobStatus = "queued" | "running" | "completed" | "failed";
export type JobTrigger = "manual" | "schedule" | "auto-sync";

export interface ExportArtifact {
  filename: string;
  mimeType: string;
  content: string;
  rowCount: number;
}

/** One export run. Generation is real; delivery to third-party services is simulated. */
export interface ExportJob {
  id: string;
  templateId: TemplateId;
  periodId: PeriodId;
  destinationId: DestinationId;
  trigger: JobTrigger;
  status: JobStatus;
  stage: string;
  /** 0..1 */
  progress: number;
  createdAt: string;
  finishedAt?: string;
  rowCount?: number;
  bytes?: number;
  filename?: string;
  /** SHA-256 of the generated file, so recipients can verify integrity. */
  checksum?: string;
  error?: string;
  /** Human detail such as recipients or a folder path. */
  detail?: string;
  scheduleId?: string;
  /** Superseded by a schedule's retention policy. */
  pruned?: boolean;
}

export interface Connection {
  destinationId: DestinationId;
  account: string;
  connectedAt: string;
  lastSyncAt?: string;
  folder?: string;
  autoSync: boolean;
  autoSyncTemplate: TemplateId;
}

export type Frequency = "daily" | "weekly" | "monthly";

export interface Schedule {
  id: string;
  name: string;
  templateId: TemplateId;
  periodId: PeriodId;
  destinationId: DestinationId;
  frequency: Frequency;
  /** 0 = Sunday; used when weekly. */
  weekday: number;
  /** 1..28; used when monthly. */
  monthDay: number;
  /** HH:MM, local time. */
  time: string;
  /** Number of past runs to keep at the destination. */
  retention: number;
  active: boolean;
  createdAt: string;
  lastRunAt?: string;
  nextRunAt: string;
}

export interface ShareLink {
  id: string;
  title: string;
  url: string;
  periodId: PeriodId;
  createdAt: string;
  expiresAt: string | null;
  redacted: boolean;
  includeRows: boolean;
  rowCount: number;
}

export interface CloudState {
  connections: Partial<Record<DestinationId, Connection>>;
  jobs: ExportJob[];
  schedules: Schedule[];
  shares: ShareLink[];
}
