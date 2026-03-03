"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Header } from "@/components/layout/Header";
import { StatusBadge } from "@/components/ui/badge";
import { SearchBar } from "@/components/shared/SearchBar";
import { formatDateTime } from "@/lib/utils";
import type { ActivityLog, StatusHistory } from "@/types";
import {
  Activity,
  History,
  Plus,
  Pencil,
  Trash2,
  ArrowRight,
  AlertTriangle,
  Link,
  Link2Off,
  Package,
  User,
  ShoppingCart,
  Container,
} from "lucide-react";
import axios from "axios";
import { useToast } from "@/components/ui/toast";

type Tab = "activity" | "statusHistory";

// ── Action metadata ──────────────────────────────────────────────────────────
const ACTION_META: Record<
  string,
  { label: string; color: string; icon: React.ElementType }
> = {
  CREATE_CUSTOMER:           { label: "Customer created",           color: "text-green-600 bg-green-50",  icon: Plus },
  UPDATE_CUSTOMER:           { label: "Customer updated",           color: "text-blue-600 bg-blue-50",    icon: Pencil },
  DELETE_CUSTOMER:           { label: "Customer deleted",           color: "text-red-600 bg-red-50",      icon: Trash2 },
  CREATE_ITEM:               { label: "Item received",              color: "text-green-600 bg-green-50",  icon: Plus },
  UPDATE_ITEM:               { label: "Item updated",               color: "text-blue-600 bg-blue-50",    icon: Pencil },
  UPDATE_ITEM_STATUS:        { label: "Item status changed",        color: "text-purple-600 bg-purple-50",icon: ArrowRight },
  DELETE_ITEM:               { label: "Item deleted",               color: "text-red-600 bg-red-50",      icon: Trash2 },
  MARK_ITEM_MISSING:         { label: "Item marked missing",        color: "text-orange-600 bg-orange-50",icon: AlertTriangle },
  CREATE_ORDER:              { label: "Invoice created",            color: "text-green-600 bg-green-50",  icon: Plus },
  DELETE_ORDER:              { label: "Invoice deleted",            color: "text-red-600 bg-red-50",      icon: Trash2 },
  CREATE_CONTAINER:          { label: "Container created",          color: "text-green-600 bg-green-50",  icon: Plus },
  UPDATE_CONTAINER_STATUS:   { label: "Container status changed",   color: "text-purple-600 bg-purple-50",icon: ArrowRight },
  ADD_ITEM_TO_CONTAINER:     { label: "Item added to container",    color: "text-brand-600 bg-brand-50",  icon: Link },
  REMOVE_ITEM_FROM_CONTAINER:{ label: "Item removed from container",color: "text-gray-600 bg-gray-100",   icon: Link2Off },
  DELETE_CONTAINER:          { label: "Container deleted",          color: "text-red-600 bg-red-50",      icon: Trash2 },
};

const ENTITY_ICON: Record<string, React.ElementType> = {
  Item: Package,
  Customer: User,
  Order: ShoppingCart,
  Container: Container,
};

const ENTITY_FILTERS = ["All", "Customer", "Item", "Order", "Container"] as const;
const RECORD_FILTERS = ["All", "Item", "Container", "Order"] as const;

function ActionBadge({ action }: { action: string }) {
  const meta = ACTION_META[action];
  if (!meta) {
    return (
      <code className="text-xs bg-gray-100 px-2 py-0.5 rounded font-mono text-gray-600">
        {action}
      </code>
    );
  }
  const Icon = meta.icon;
  return (
    <span
      className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2 py-0.5 rounded-full ${meta.color}`}
    >
      <Icon className="h-3 w-3" />
      {meta.label}
    </span>
  );
}

export default function ReportsPage() {
  const router = useRouter();
  const { error } = useToast();
  const [tab, setTab] = useState<Tab>("activity");
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [statusHistory, setStatusHistory] = useState<StatusHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [entityFilter, setEntityFilter] = useState<string>("All");
  const [recordFilter, setRecordFilter] = useState<string>("All");

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [actRes, histRes] = await Promise.all([
          axios.get("/api/activity-logs"),
          axios.get("/api/activity-logs?type=status"),
        ]);
        setActivityLogs(actRes.data.data);
        setStatusHistory(histRes.data.data);
      } catch {
        error("Failed to load reports");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [error]);

  const filteredActivity = useMemo(() => {
    return activityLogs.filter((log) => {
      if (entityFilter !== "All" && log.entityType !== entityFilter) return false;
      if (!search) return true;
      const q = search.toLowerCase();
      return (
        log.userEmail?.toLowerCase().includes(q) ||
        log.details?.toLowerCase().includes(q) ||
        log.action?.toLowerCase().includes(q) ||
        (ACTION_META[log.action]?.label ?? "").toLowerCase().includes(q)
      );
    });
  }, [activityLogs, entityFilter, search]);

  const filteredHistory = useMemo(() => {
    return statusHistory.filter((h) => {
      if (recordFilter !== "All" && h.recordType !== recordFilter) return false;
      if (!search) return true;
      const q = search.toLowerCase();
      return (
        h.recordRef?.toLowerCase().includes(q) ||
        h.changedBy?.toLowerCase().includes(q) ||
        h.newStatus?.toLowerCase().includes(q) ||
        h.previousStatus?.toLowerCase().includes(q)
      );
    });
  }, [statusHistory, recordFilter, search]);

  function navigateToRecord(h: StatusHistory) {
    if (h.recordType === "Item") router.push(`/admin/items/${h.recordId}`);
    else if (h.recordType === "Order") router.push(`/admin/orders/${h.recordId}`);
    else if (h.recordType === "Container") router.push(`/admin/containers/${h.recordId}`);
  }

  return (
    <div className="flex flex-col h-full">
      <Header title="Activity Log" subtitle="Full audit trail of all actions" />

      <div className="flex-1 p-6 space-y-4 overflow-y-auto">
        {/* Summary pills */}
        {!loading && (
          <div className="flex gap-3 flex-wrap">
            <div className="bg-white border border-gray-100 rounded-xl px-4 py-2.5 flex items-center gap-2">
              <Activity className="h-4 w-4 text-brand-600" />
              <span className="text-sm font-semibold text-gray-900">{activityLogs.length}</span>
              <span className="text-xs text-gray-400">actions logged</span>
            </div>
            <div className="bg-white border border-gray-100 rounded-xl px-4 py-2.5 flex items-center gap-2">
              <History className="h-4 w-4 text-purple-500" />
              <span className="text-sm font-semibold text-gray-900">{statusHistory.length}</span>
              <span className="text-xs text-gray-400">status changes</span>
            </div>
          </div>
        )}

        {/* Tabs + Controls */}
        <div className="flex flex-wrap items-center gap-3 justify-between">
          <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
            <button
              onClick={() => { setTab("activity"); setSearch(""); setEntityFilter("All"); }}
              className={`flex items-center gap-1.5 px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
                tab === "activity"
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              <Activity className="h-3.5 w-3.5" />
              Activity Log
            </button>
            <button
              onClick={() => { setTab("statusHistory"); setSearch(""); setRecordFilter("All"); }}
              className={`flex items-center gap-1.5 px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
                tab === "statusHistory"
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              <History className="h-3.5 w-3.5" />
              Status History
            </button>
          </div>

          <div className="flex items-center gap-2">
            <SearchBar
              placeholder={tab === "activity" ? "Search actions..." : "Search records..."}
              onSearch={setSearch}
              className="w-56"
            />
            {tab === "activity" && (
              <div className="flex gap-1">
                {ENTITY_FILTERS.map((f) => (
                  <button
                    key={f}
                    onClick={() => setEntityFilter(f)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      entityFilter === f
                        ? "bg-brand-600 text-white"
                        : "bg-white border border-gray-200 text-gray-500 hover:text-gray-800"
                    }`}
                  >
                    {f === "All" ? "All" : (
                      <span className="flex items-center gap-1">
                        {ENTITY_ICON[f] && React.createElement(ENTITY_ICON[f], { className: "h-3 w-3" })}
                        {f}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            )}
            {tab === "statusHistory" && (
              <div className="flex gap-1">
                {RECORD_FILTERS.map((f) => (
                  <button
                    key={f}
                    onClick={() => setRecordFilter(f)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      recordFilter === f
                        ? "bg-brand-600 text-white"
                        : "bg-white border border-gray-200 text-gray-500 hover:text-gray-800"
                    }`}
                  >
                    {f}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Activity Log Table */}
        {tab === "activity" && (
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            {loading ? (
              <div className="flex items-center justify-center py-16">
                <div className="animate-spin h-6 w-6 border-4 border-brand-600 border-t-transparent rounded-full" />
              </div>
            ) : filteredActivity.length === 0 ? (
              <div className="text-center py-16">
                <Activity className="h-10 w-10 text-gray-200 mx-auto mb-2" />
                <p className="text-sm text-gray-400">No activity logs found</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50">
                      <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Time</th>
                      <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Action</th>
                      <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">User</th>
                      <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Details</th>
                      <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Entity</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {filteredActivity.map((log) => {
                      const EntityIcon = log.entityType ? ENTITY_ICON[log.entityType] : null;
                      return (
                        <tr key={log.id} className="hover:bg-gray-50/50 transition-colors">
                          <td className="px-4 py-3 whitespace-nowrap">
                            <span className="text-xs text-gray-400 font-mono">
                              {formatDateTime(log.timestamp)}
                            </span>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <ActionBadge action={log.action} />
                          </td>
                          <td className="px-4 py-3">
                            <p className="text-xs font-medium text-gray-700">{log.userEmail}</p>
                            <p className="text-xs text-gray-400 capitalize">
                              {log.userRole?.replace(/_/g, " ")}
                            </p>
                          </td>
                          <td className="px-4 py-3 max-w-xs">
                            <p className="text-xs text-gray-600 truncate">{log.details || "—"}</p>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            {log.entityType ? (
                              <span className="inline-flex items-center gap-1.5 text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                                {EntityIcon && <EntityIcon className="h-3 w-3" />}
                                {log.entityType}
                              </span>
                            ) : (
                              <span className="text-xs text-gray-300">—</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Status History Table */}
        {tab === "statusHistory" && (
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            {loading ? (
              <div className="flex items-center justify-center py-16">
                <div className="animate-spin h-6 w-6 border-4 border-brand-600 border-t-transparent rounded-full" />
              </div>
            ) : filteredHistory.length === 0 ? (
              <div className="text-center py-16">
                <History className="h-10 w-10 text-gray-200 mx-auto mb-2" />
                <p className="text-sm text-gray-400">No status history found</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50">
                      <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Time</th>
                      <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Type</th>
                      <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Record</th>
                      <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">From</th>
                      <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide"></th>
                      <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">To</th>
                      <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Changed By</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {filteredHistory.map((h) => (
                      <tr
                        key={h.id}
                        onClick={() => navigateToRecord(h)}
                        className="hover:bg-gray-50/50 transition-colors cursor-pointer"
                      >
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className="text-xs text-gray-400 font-mono">
                            {formatDateTime(h.changedAt)}
                          </span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className="text-xs font-semibold text-gray-600 bg-gray-100 px-2 py-0.5 rounded-full">
                            {h.recordType}
                          </span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <code className="text-xs font-mono font-bold text-brand-700">
                            {h.recordRef}
                          </code>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          {h.previousStatus ? (
                            <StatusBadge status={h.previousStatus} />
                          ) : (
                            <span className="text-xs text-gray-300">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <ArrowRight className="h-3.5 w-3.5 text-gray-300" />
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <StatusBadge status={h.newStatus} />
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <p className="text-xs text-gray-600">{h.changedBy}</p>
                          <p className="text-xs text-gray-400 capitalize">
                            {h.changedByRole?.replace(/_/g, " ")}
                          </p>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Result count */}
        {!loading && (
          <p className="text-xs text-gray-400 text-right">
            {tab === "activity"
              ? `${filteredActivity.length} of ${activityLogs.length} entries`
              : `${filteredHistory.length} of ${statusHistory.length} entries`}
          </p>
        )}
      </div>
    </div>
  );
}
