"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Header } from "@/components/layout/Header";
import { DataTable } from "@/components/shared/DataTable";
import { SearchBar } from "@/components/shared/SearchBar";
import { FilterDropdown } from "@/components/ui/FilterDropdown";
import { StatusBadge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/toast";
import { formatDate } from "@/lib/utils";
import type { SourcingRequest, SourcingRequestStatus } from "@/types";
import { PackageSearch } from "lucide-react";
import axios from "axios";

const STATUS_OPTIONS = [
  { value: "", label: "All statuses" },
  { value: "Requested", label: "Requested" },
  { value: "Quoted", label: "Quoted" },
  { value: "Approved", label: "Approved" },
  { value: "Declined", label: "Declined" },
  { value: "Converted", label: "Converted" },
];

export default function AdminSourcingPage() {
  const router = useRouter();
  const { error } = useToast();
  const [requests, setRequests] = useState<SourcingRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<SourcingRequestStatus | "">("");
  const [search, setSearch] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get("/api/sourcing-requests", {
        params: { status: status || undefined },
      });
      setRequests(res.data.data);
    } catch {
      error("Failed to load sourcing requests");
    } finally {
      setLoading(false);
    }
  }, [error, status]);

  useEffect(() => { load(); }, [load]);

  const filtered = search
    ? requests.filter(
        (r) =>
          r.requestRef.toLowerCase().includes(search.toLowerCase()) ||
          r.description.toLowerCase().includes(search.toLowerCase()) ||
          r.customerName?.toLowerCase().includes(search.toLowerCase())
      )
    : requests;

  return (
    <div className="flex flex-col h-full">
      <Header title="Sourcing Requests" subtitle="Customer requests for PAKKmax to source and buy items" />

      <div className="flex-1 p-6 space-y-4">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          <SearchBar placeholder="Search requests..." onSearch={setSearch} className="w-full sm:w-64" />
          <FilterDropdown
            options={STATUS_OPTIONS}
            value={status}
            onChange={(val) => setStatus(val as SourcingRequestStatus | "")}
            placeholder="All statuses"
            className="w-full sm:w-44"
          />
        </div>

        <DataTable
          columns={[
            {
              key: "requestRef",
              header: "Request",
              render: (r) => (
                <div className="flex items-center gap-2">
                  {r.photos[0] ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={r.photos[0]} alt="" className="h-8 w-8 rounded object-cover border border-gray-200" />
                  ) : (
                    <div className="h-8 w-8 rounded bg-gray-100 flex items-center justify-center">
                      <PackageSearch className="h-4 w-4 text-gray-400" />
                    </div>
                  )}
                  <div>
                    <code className="text-xs font-mono font-bold text-gray-600 block">{r.requestRef}</code>
                    <p className="text-xs text-gray-500 truncate max-w-[220px]">{r.description}</p>
                  </div>
                </div>
              ),
            },
            {
              key: "customerName",
              header: "Customer",
              render: (r) => r.customerName ?? <span className="text-gray-400 text-xs">—</span>,
            },
            {
              key: "quantity",
              header: "Qty",
              render: (r) => <span className="text-sm text-gray-700">{r.quantity}</span>,
            },
            {
              key: "status",
              header: "Status",
              render: (r) => <StatusBadge status={r.status} />,
            },
            {
              key: "createdAt",
              header: "Submitted",
              render: (r) => <span className="text-xs text-gray-500">{formatDate(r.createdAt)}</span>,
            },
          ]}
          data={filtered}
          keyExtractor={(r) => r.id}
          loading={loading}
          emptyMessage="No sourcing requests found"
          emptyIcon={<PackageSearch className="h-12 w-12" />}
          onRowClick={(r) => router.push(`/admin/sourcing/${r.id}`)}
        />
      </div>
    </div>
  );
}
