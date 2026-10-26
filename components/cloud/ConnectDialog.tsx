"use client";

import { useState } from "react";
import { DESTINATIONS } from "@/lib/cloud/destinations";
import { TEMPLATES } from "@/lib/cloud/templates";
import type { DestinationId } from "@/lib/cloud/types";
import { Modal } from "../Modal";
import { buttonPrimary } from "../ui";
import { useCloud } from "./CloudProvider";
import { ConsentScreen } from "./ConsentScreen";
import { Field, Toggle, inputClass } from "./controls";
import { ServiceLogo } from "./ServiceLogo";

export function ConnectDialog({ id, onClose }: { id: DestinationId; onClose: () => void }) {
  const dest = DESTINATIONS[id];
  const { connect, updateConnection, runExport, state } = useCloud();
  const [step, setStep] = useState<"consent" | "configure">("consent");
  const conn = state.connections[id];
  const [folder, setFolder] = useState(dest.defaultFolder ?? "");
  const [autoSync, setAutoSync] = useState(dest.supportsAutoSync);

  const finish = () => {
    updateConnection(id, { folder: folder.trim() || dest.defaultFolder, autoSync });
    // Do an initial sync so the connection is immediately useful.
    if (autoSync) {
      const template = TEMPLATES[dest.defaultAutoSyncTemplate];
      runExport({
        templateId: template.id,
        periodId: template.periods.includes("all") ? "all" : template.defaultPeriod,
        destinationId: id,
        trigger: "auto-sync",
        detail: "Initial sync",
      });
    }
    onClose();
  };

  return (
    <Modal open onClose={onClose} title={`Connect ${dest.name}`} description={dest.description}>
      {step === "consent" ? (
        <ConsentScreen
          id={id}
          onCancel={onClose}
          onAuthorized={(account) => {
            connect(id, account);
            setStep("configure");
          }}
        />
      ) : (
        <div className="space-y-5">
          <div className="flex items-center gap-3 rounded-xl bg-emerald-50 px-4 py-3 ring-1 ring-emerald-200">
            <ServiceLogo id={id} className="h-9 w-9" />
            <div className="text-sm">
              <p className="font-semibold text-emerald-900">Connected to {dest.name}</p>
              <p className="text-emerald-700">{conn?.account}</p>
            </div>
          </div>
          {dest.defaultFolder && (
            <Field label={dest.id === "slack" ? "Channel" : dest.id === "notion" ? "Parent page" : "Folder"} htmlFor="connect-folder">
              <input id="connect-folder" value={folder} onChange={(e) => setFolder(e.target.value)} className={`${inputClass} font-mono text-[13px]`} />
            </Field>
          )}
          {dest.supportsAutoSync && (
            <Toggle
              checked={autoSync}
              onChange={setAutoSync}
              label="Keep in sync automatically"
              description={`Push a fresh ${TEMPLATES[dest.defaultAutoSyncTemplate].name.toLowerCase()} a few seconds after you add, edit, or delete expenses.`}
            />
          )}
          <div className="flex justify-end">
            <button type="button" onClick={finish} className={buttonPrimary}>
              Done
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}
