"use client";

import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ITEM_STATUS_STEPS } from "@/lib/utils";
import type { ItemStatus } from "@/types";
import axios from "axios";
import { useToast } from "@/components/ui/toast";

interface StatusUpdateModalProps {
  open: boolean;
  onClose: () => void;
  itemId: string;
  itemRef: string;
  currentStatus: ItemStatus;
  onSuccess?: () => void;
}

export function StatusUpdateModal({
  open,
  onClose,
  itemId,
  itemRef,
  currentStatus,
  onSuccess,
}: StatusUpdateModalProps) {
  const { success, error } = useToast();
  const [status, setStatus] = useState<ItemStatus>(currentStatus);
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [sendWhatsApp, setSendWhatsApp] = useState(false);

  const statusOptions = ITEM_STATUS_STEPS.map((s) => ({
    value: s,
    label: s,
  }));

  const handleSubmit = async () => {
    if (status === currentStatus) {
      error("No change", "Please select a different status");
      return;
    }

    setLoading(true);
    try {
      await axios.patch(`/api/items/${itemId}/status`, { status, notes, sendWhatsApp });
      success("Status updated", `${itemRef} → ${status}`);
      onSuccess?.();
      onClose();
    } catch (err: unknown) {
      const msg =
        axios.isAxiosError(err)
          ? err.response?.data?.error ?? "Update failed"
          : "Update failed";
      error("Failed to update status", msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Update Item Status</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-xs text-gray-500">Item Reference</p>
            <p className="font-mono font-bold text-gray-900">{itemRef}</p>
          </div>

          <Select
            label="New Status"
            options={statusOptions}
            value={status}
            onChange={(e) => setStatus(e.target.value as ItemStatus)}
          />

          <Textarea
            label="Notes (optional)"
            placeholder="Add a note about this status change..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
          />

          <label className="flex items-center gap-3 cursor-pointer select-none bg-green-50 border border-green-100 rounded-lg p-2.5">
            <input
              type="checkbox"
              checked={sendWhatsApp}
              onChange={(e) => setSendWhatsApp(e.target.checked)}
              className="w-4 h-4 accent-green-600 shrink-0"
            />
            <span className="text-xs text-green-700 font-medium">
              Send WhatsApp notification to customer
            </span>
          </label>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} loading={loading}>
            Update Status
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
