export const HUB_TABS = [
  { id: "overview", label: "Overview" },
  { id: "integrations", label: "Integrations" },
  { id: "schedules", label: "Schedules" },
  { id: "share", label: "Shared links" },
  { id: "history", label: "History" },
] as const;

export type HubTab = (typeof HUB_TABS)[number]["id"];

export function isHubTab(value: string): value is HubTab {
  return HUB_TABS.some((t) => t.id === value);
}
