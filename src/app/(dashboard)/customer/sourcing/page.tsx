"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Header } from "@/components/layout/Header";
import { StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/utils";
import type { SourcingRequest } from "@/types";
import { PackageSearch, ChevronRight, Plus } from "lucide-react";
import axios from "axios";
import { useToast } from "@/components/ui/toast";
import { useRouter } from "next/navigation";

export default function CustomerSourcingPage() {
  const { error } = useToast();
  const router = useRouter();
  const [requests, setRequests] = useState<SourcingRequest[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get("/api/sourcing-requests");
      setRequests(res.data.data);
    } catch {
      error("Failed to load sourcing requests");
    } finally {
      setLoading(false);
    }
  }, [error]);

  useEffect(() => { load(); }, [load]);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-brand-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <Header title="Sourcing Requests" subtitle="Ask PAKKmax to source and buy an item for you" />

      <div className="flex-1 p-4 sm:p-6 space-y-3 overflow-y-auto">
        <div className="flex justify-end">
          <Button onClick={() => router.push("/customer/sourcing/new")}>
            <Plus className="h-4 w-4 mr-2" />
            New Request
          </Button>
        </div>

        {requests.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <PackageSearch className="h-12 w-12 text-gray-200 mb-3" />
            <p className="text-gray-500 mb-4">No sourcing requests yet</p>
            <Button onClick={() => router.push("/customer/sourcing/new")}>
              <Plus className="h-4 w-4 mr-2" />
              Submit a Request
            </Button>
          </div>
        ) : (
          requests.map((r) => (
            <button
              key={r.id}
              onClick={() => router.push(`/customer/sourcing/${r.id}`)}
              className="w-full flex items-center justify-between p-4 bg-white border border-gray-200 rounded-xl hover:border-brand-200 hover:bg-brand-50/30 transition-all shadow-sm text-left"
            >
              <div className="flex items-center gap-3 min-w-0">
                {r.photos[0] ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={r.photos[0]} alt="" className="w-10 h-10 rounded-xl object-cover shrink-0 border border-gray-200" />
                ) : (
                  <div className="w-10 h-10 rounded-xl bg-brand-50 flex items-center justify-center shrink-0">
                    <PackageSearch className="h-5 w-5 text-brand-600" />
                  </div>
                )}
                <div className="min-w-0">
                  <p className="font-mono font-bold text-gray-900">{r.requestRef}</p>
                  <p className="text-xs text-gray-500 mt-0.5 truncate max-w-[220px]">
                    {r.description}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">{formatDate(r.createdAt)}</p>
                </div>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                <StatusBadge status={r.status} />
                <ChevronRight className="h-4 w-4 text-gray-300" />
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  );
}
