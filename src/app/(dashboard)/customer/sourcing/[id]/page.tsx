"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { useToast } from "@/components/ui/toast";
import type { SourcingRequest } from "@/types";
import axios from "axios";
import { ArrowLeft, PackageSearch, Check, X as XIcon } from "lucide-react";

export default function CustomerSourcingDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { error, success } = useToast();
  const [request, setRequest] = useState<SourcingRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [approveOpen, setApproveOpen] = useState(false);
  const [declineOpen, setDeclineOpen] = useState(false);
  const [declineReason, setDeclineReason] = useState("");
  const [responding, setResponding] = useState(false);

  const load = () => {
    if (!id) return;
    axios.get(`/api/sourcing-requests/${id}`)
      .then((res) => setRequest(res.data.data))
      .catch(() => error("Failed to load request"))
      .finally(() => setLoading(false));
  };

  useEffect(load, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  const respond = async (approve: boolean) => {
    setResponding(true);
    try {
      const res = await axios.patch(`/api/sourcing-requests/${id}/respond`, {
        approve,
        declineReason: approve ? undefined : declineReason,
      });
      setRequest(res.data.data);
      success(approve ? "Quote approved" : "Quote declined");
      setApproveOpen(false);
      setDeclineOpen(false);
    } catch (err: unknown) {
      const message = axios.isAxiosError(err) ? err.response?.data?.error ?? "Failed to respond" : "Failed to respond";
      error(message);
    } finally {
      setResponding(false);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center h-full">
        <div className="animate-spin h-8 w-8 border-4 border-brand-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!request) return null;

  const fmt = (n: number) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);

  return (
    <div className="flex flex-col h-full">
      <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-3 shrink-0">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>
        <span className="text-gray-300">|</span>
        <span className="text-sm font-mono font-medium text-gray-700">{request.requestRef}</span>
        <StatusBadge status={request.status} />
      </div>

      <div className="flex-1 overflow-y-auto p-4 sm:p-6 max-w-2xl mx-auto w-full space-y-4">
        {request.photos.length > 0 && (
          <div className="flex gap-2">
            {request.photos.map((url) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={url} src={url} alt="" className="h-24 w-24 rounded-lg object-cover border border-gray-200" />
            ))}
          </div>
        )}

        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <p className="text-xs font-medium text-gray-500 mb-1">Description</p>
          <p className="text-sm text-gray-900 whitespace-pre-wrap">{request.description}</p>
          <p className="text-xs text-gray-500 mt-3">Quantity: {request.quantity}</p>
        </div>

        {request.status === "Requested" && (
          <div className="flex items-center gap-3 bg-blue-50 border border-blue-100 rounded-xl p-4">
            <PackageSearch className="h-5 w-5 text-blue-600 shrink-0" />
            <p className="text-sm text-blue-900">We're researching this for you — you'll be notified when a quote is ready.</p>
          </div>
        )}

        {(request.status === "Quoted" || request.status === "Approved" || request.status === "Converted") && (
          <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-3">
            <p className="text-xs font-medium text-gray-500">Quote</p>
            {request.catalogProductName && (
              <p className="text-sm font-semibold text-gray-900">{request.catalogProductName}</p>
            )}
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-xs text-gray-400">Unit Price</p>
                <p className="font-medium text-gray-900">{fmt(request.quotedUnitPriceUsd ?? 0)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400">Total</p>
                <p className="font-bold text-brand-600">{fmt(request.quotedTotalUsd ?? 0)}</p>
              </div>
            </div>
            {request.quoteNotes && (
              <p className="text-sm text-gray-600 whitespace-pre-wrap">{request.quoteNotes}</p>
            )}
          </div>
        )}

        {request.status === "Quoted" && (
          <div className="flex gap-3">
            <Button onClick={() => setApproveOpen(true)} className="flex-1">
              <Check className="h-4 w-4 mr-2" />
              Approve
            </Button>
            <Button variant="outline" onClick={() => setDeclineOpen(true)} className="flex-1">
              <XIcon className="h-4 w-4 mr-2" />
              Decline
            </Button>
          </div>
        )}

        {request.status === "Approved" && (
          <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4">
            <p className="text-sm text-emerald-900">Approved — we'll begin sourcing this item for you.</p>
          </div>
        )}

        {request.status === "Converted" && (
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
            <p className="text-sm text-gray-700">This item has been purchased and is now in our pipeline. Check "My Items" for tracking updates.</p>
          </div>
        )}

        {request.status === "Declined" && (
          <div className="bg-red-50 border border-red-100 rounded-xl p-4">
            <p className="text-xs font-medium text-red-700 mb-1">Declined</p>
            <p className="text-sm text-red-900">{request.declineReason}</p>
          </div>
        )}
      </div>

      <Dialog open={approveOpen} onOpenChange={setApproveOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Approve this quote?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-gray-600">
            We'll begin purchasing this item on your behalf for {fmt(request.quotedTotalUsd ?? 0)}.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setApproveOpen(false)}>Cancel</Button>
            <Button onClick={() => respond(true)} disabled={responding}>
              {responding ? "Approving..." : "Approve"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={declineOpen} onOpenChange={setDeclineOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Decline this quote?</DialogTitle>
          </DialogHeader>
          <textarea
            value={declineReason}
            onChange={(e) => setDeclineReason(e.target.value)}
            rows={3}
            placeholder="Let us know why (optional but helpful)..."
            className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeclineOpen(false)}>Cancel</Button>
            <Button
              onClick={() => {
                if (!declineReason.trim()) { error("Please share a reason"); return; }
                respond(false);
              }}
              disabled={responding}
            >
              {responding ? "Declining..." : "Decline"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
