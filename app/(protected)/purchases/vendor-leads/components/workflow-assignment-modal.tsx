"use client";

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { X } from "lucide-react";

import { Modal } from "@/components/ui/modal";
import {
  VENDOR_LEAD_WORKFLOW_STAGES,
  VENDOR_LEAD_WORKFLOW_STATUSES,
  type VendorLeadWorkflowInput,
} from "@/lib/validations/vendor-lead";
import type { VendorLeadRow } from "@/lib/hooks/use-vendor-leads";

type Props = {
  open: boolean;
  onClose: () => void;
  lead: VendorLeadRow | null;
  onSubmit: (data: VendorLeadWorkflowInput) => void;
  isPending?: boolean;
};

export function WorkflowAssignmentModal({
  open,
  onClose,
  lead,
  onSubmit,
  isPending,
}: Props) {
  const [workflowName, setWorkflowName] = useState("Vendor Onboarding");
  const [assigneeId, setAssigneeId] = useState("");
  const [stage, setStage] = useState<(typeof VENDOR_LEAD_WORKFLOW_STAGES)[number]>(
    "Initial Contact",
  );
  const [status, setStatus] = useState<(typeof VENDOR_LEAD_WORKFLOW_STATUSES)[number]>(
    "Pending",
  );

  const { data: membersData } = useQuery<{
    members: { user: { id: string; name: string; email: string } }[];
  }>({
    queryKey: ["members"],
    queryFn: () => fetch("/api/members").then((r) => r.json()),
    enabled: open,
  });

  const members = membersData?.members ?? [];

  useEffect(() => {
    if (!open || !lead) return;
    setWorkflowName(lead.workflowName ?? "Vendor Onboarding");
    setAssigneeId(lead.currentAssigneeId ?? "");
    setStage(
      (lead.currentStage as (typeof VENDOR_LEAD_WORKFLOW_STAGES)[number]) ??
        "Initial Contact",
    );
    setStatus(
      (lead.currentStatus as (typeof VENDOR_LEAD_WORKFLOW_STATUSES)[number]) ??
        "Pending",
    );
  }, [open, lead]);

  const handleSubmit = () => {
    onSubmit({
      workflowName,
      currentAssigneeId: assigneeId || undefined,
      currentStage: stage,
      currentStatus: status,
    });
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Workflow Assignment"
      description="Assign this vendor lead to an onboarding workflow."
    >
      <div className="space-y-4">
        <Field label="Workflow Name">
          <input
            value={workflowName}
            onChange={(e) => setWorkflowName(e.target.value)}
            className={inputCls}
          />
        </Field>
        <Field label="Assignee">
          <select
            value={assigneeId}
            onChange={(e) => setAssigneeId(e.target.value)}
            className={inputCls}
          >
            <option value="">Select team member</option>
            {members.map((m) => (
              <option key={m.user.id} value={m.user.id}>
                {m.user.name} ({m.user.email})
              </option>
            ))}
          </select>
        </Field>
        <Field label="Stage">
          <select value={stage} onChange={(e) => setStage(e.target.value as typeof stage)} className={inputCls}>
            {VENDOR_LEAD_WORKFLOW_STAGES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </Field>
        <Field label="Status">
          <select value={status} onChange={(e) => setStatus(e.target.value as typeof status)} className={inputCls}>
            {VENDOR_LEAD_WORKFLOW_STATUSES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </Field>
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="rounded-md border border-zinc-200 px-4 py-2 text-sm text-zinc-600 hover:bg-zinc-50">
            Cancel
          </button>
          <button
            type="button"
            disabled={isPending || !workflowName.trim()}
            onClick={handleSubmit}
            className="rounded-md bg-[#7438dc] px-4 py-2 text-sm font-semibold text-white hover:bg-[#6230c4] disabled:opacity-60"
          >
            {isPending ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </Modal>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-zinc-700">{label}</label>
      {children}
    </div>
  );
}

const inputCls =
  "h-10 w-full rounded-md border border-zinc-200 bg-white px-3 text-sm text-zinc-800 outline-none focus:border-[#7438dc] focus:ring-2 focus:ring-[#7438dc]/20";
