import type { DestinationId, TemplateId } from "./types";

export type DestinationKind = "local" | "storage" | "productivity" | "messaging";

export interface Destination {
  id: DestinationId;
  name: string;
  kind: DestinationKind;
  description: string;
  /** Domain shown in the simulated OAuth window. */
  authDomain?: string;
  scopes: string[];
  requiresConnection: boolean;
  /** Can push automatically whenever expenses change. */
  supportsAutoSync: boolean;
  defaultAutoSyncTemplate: TemplateId;
  defaultFolder?: string;
  /** Delivery is simulated in this build (no real network calls). */
  simulated: boolean;
  deliverVerb: string;
}

export const DESTINATIONS: Record<DestinationId, Destination> = {
  download: {
    id: "download",
    name: "This device",
    kind: "local",
    description: "Save the file straight to your Downloads folder.",
    scopes: [],
    requiresConnection: false,
    supportsAutoSync: false,
    defaultAutoSyncTemplate: "ledger",
    simulated: false,
    deliverVerb: "Saving to Downloads",
  },
  email: {
    id: "email",
    name: "Email",
    kind: "messaging",
    description: "Send reports as attachments to anyone — your accountant, partner, or yourself.",
    scopes: [],
    requiresConnection: false,
    supportsAutoSync: false,
    defaultAutoSyncTemplate: "monthly-summary",
    simulated: true,
    deliverVerb: "Sending email",
  },
  "google-sheets": {
    id: "google-sheets",
    name: "Google Sheets",
    kind: "productivity",
    description: "Keep a live spreadsheet of your expenses that updates as you add them.",
    authDomain: "accounts.google.com",
    scopes: ["Create spreadsheets in your Google Drive", "Edit spreadsheets created by Spendwise", "See your email address"],
    requiresConnection: true,
    supportsAutoSync: true,
    defaultAutoSyncTemplate: "ledger",
    simulated: true,
    deliverVerb: "Writing rows to Google Sheets",
  },
  "google-drive": {
    id: "google-drive",
    name: "Google Drive",
    kind: "storage",
    description: "Store backups and reports in a dedicated Drive folder.",
    authDomain: "accounts.google.com",
    scopes: ["Create files in a “Spendwise” folder", "See your email address"],
    requiresConnection: true,
    supportsAutoSync: true,
    defaultAutoSyncTemplate: "full-backup",
    defaultFolder: "My Drive/Spendwise",
    simulated: true,
    deliverVerb: "Uploading to Google Drive",
  },
  dropbox: {
    id: "dropbox",
    name: "Dropbox",
    kind: "storage",
    description: "Sync exports to an app folder that's available on all your devices.",
    authDomain: "www.dropbox.com",
    scopes: ["Write files to /Apps/Spendwise", "View your basic account info"],
    requiresConnection: true,
    supportsAutoSync: true,
    defaultAutoSyncTemplate: "full-backup",
    defaultFolder: "/Apps/Spendwise",
    simulated: true,
    deliverVerb: "Uploading to Dropbox",
  },
  onedrive: {
    id: "onedrive",
    name: "OneDrive",
    kind: "storage",
    description: "Save to OneDrive and open reports directly in Excel for the web.",
    authDomain: "login.microsoftonline.com",
    scopes: ["Read and write files in your app folder", "Sign you in and read your profile"],
    requiresConnection: true,
    supportsAutoSync: true,
    defaultAutoSyncTemplate: "full-backup",
    defaultFolder: "Apps/Spendwise",
    simulated: true,
    deliverVerb: "Uploading to OneDrive",
  },
  notion: {
    id: "notion",
    name: "Notion",
    kind: "productivity",
    description: "Publish monthly summaries as pages in your finance workspace.",
    authDomain: "api.notion.com",
    scopes: ["Insert content into pages you select", "Read basic workspace info"],
    requiresConnection: true,
    supportsAutoSync: true,
    defaultAutoSyncTemplate: "monthly-summary",
    defaultFolder: "Finance / Spending",
    simulated: true,
    deliverVerb: "Publishing to Notion",
  },
  slack: {
    id: "slack",
    name: "Slack",
    kind: "messaging",
    description: "Post digests to a channel so your household or team stays in the loop.",
    authDomain: "slack.com",
    scopes: ["Post messages as Spendwise", "View channels you choose"],
    requiresConnection: true,
    supportsAutoSync: false,
    defaultAutoSyncTemplate: "monthly-summary",
    defaultFolder: "#household-budget",
    simulated: true,
    deliverVerb: "Posting to Slack",
  },
};

export const INTEGRATION_GROUPS: { title: string; kind: DestinationKind; ids: DestinationId[] }[] = [
  { title: "Cloud storage", kind: "storage", ids: ["google-drive", "dropbox", "onedrive"] },
  { title: "Productivity", kind: "productivity", ids: ["google-sheets", "notion"] },
  { title: "Messaging", kind: "messaging", ids: ["slack", "email"] },
];

/** Pipeline stages shown while a job runs. */
export function jobStages(destination: Destination, format: string): string[] {
  return ["Preparing data", `Generating ${format}`, "Computing checksum", destination.deliverVerb, "Finishing up"];
}
