"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Header } from "@/components/layout/Header";
import { DataTable } from "@/components/shared/DataTable";
import { SearchBar } from "@/components/shared/SearchBar";
import { StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { formatDate } from "@/lib/utils";
import type { Item } from "@/types";
import { CheckCircle2, XCircle, AlertTriangle, SortAsc } from "lucide-react";
import axios from "axios";

type Tab = "sorting" | "missing";

export default function SortingPage() {
  const { success, error } = useToast();
  const [tab, setTab] = useState<Tab>("sorting");
  const [sortingItems, setSortingItems] = useState<Item[]>([]);
  const [missingItems, setMissingItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const load = useCallback(
    async (search?: string) => {
      setLoading(true);
      try {
        const res = await axios.get("/api/sorting", {
          params: { search: search || undefined, missing: true },
        });
        setSortingItems(res.data.data.sorting);
        setMissingItems(res.data.data.missing ?? []);
      } catch {
        error("Failed to load sorting items");
      } finally {
        setLoading(false);
      }
    },
    [error]
  );

  useEffect(() => { load(); }, [load]);

  const handleFound = async (item: Item) => {
    setActionLoading(item.id);
    try {
      await axios.post("/api/sorting", { itemId: item.id, action: "found" });
      success("Item found!", `${item.itemRef} → Ready for Pickup`);
      load();
    } catch (err: unknown) {
      const msg = axios.isAxiosError(err)
        ? err.response?.data?.error ?? "Action failed"
        : "Action failed";
      error("Error", msg);
    } finally {
      setActionLoading(null);
    }
  };

  const handleMissing = async (item: Item) => {
    setActionLoading(item.id);
    try {
      await axios.post("/api/sorting", { itemId: item.id, action: "missing" });
      success("Flagged as missing", `${item.itemRef} added to lost items report`);
      load();
    } catch (err: unknown) {
      const msg = axios.isAxiosError(err)
        ? err.response?.data?.error ?? "Action failed"
        : "Action failed";
      error("Error", msg);
    } finally {
      setActionLoading(null);
    }
  };

  const currentItems = tab === "sorting" ? sortingItems : missingItems;

  return (
    <div className="flex flex-col h-full">
      <Header
        title="Sorting Dashboard"
        subtitle="Process items arriving in Ghana"
      />

      <div className="flex-1 p-6 space-y-4">
        {/* Stats */}
        <div className="grid grid-cols-2 gap-4 max-w-sm">
          <div className="bg-yellow-50 border border-yellow-100 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-1">
              <SortAsc className="h-4 w-4 text-yellow-600" />
              <span className="text-sm font-semibold text-yellow-800">
                In Sorting
              </span>
            </div>
            <p className="text-2xl font-black text-yellow-900">
              {sortingItems.length}
            </p>
          </div>
          <div className="bg-red-50 border border-red-100 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-1">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              <span className="text-sm font-semibold text-red-800">
                Missing
              </span>
            </div>
            <p className="text-2xl font-black text-red-900">
              {missingItems.length}
            </p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-gray-100 p-1 rounded-lg w-fit">
          <button
            onClick={() => setTab("sorting")}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
              tab === "sorting"
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            Sorting ({sortingItems.length})
          </button>
          <button
            onClick={() => setTab("missing")}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
              tab === "missing"
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            Missing Items ({missingItems.length})
          </button>
        </div>

        <SearchBar
          placeholder={tab === "sorting" ? "Search sorting items..." : "Search missing items..."}
          onSearch={load}
          className="w-72"
        />

        <DataTable
          columns={[
            {
              key: "itemRef",
              header: "Ref",
              render: (item) => (
                <span className="font-mono text-xs font-bold">
                  {item.itemRef}
                </span>
              ),
            },
            {
              key: "customerShippingMark",
              header: "Customer",
              render: (item) => (
                <code className="text-xs font-mono bg-gray-100 px-1.5 py-0.5 rounded">
                  {item.customerShippingMark ?? "—"}
                </code>
              ),
            },
            {
              key: "description",
              header: "Description",
              render: (item) => (
                <span className="text-sm truncate max-w-[200px] block">
                  {item.description}
                </span>
              ),
            },
            {
              key: "weight",
              header: "Weight",
              render: (item) => (
                <span className="text-sm">{item.weight} kg</span>
              ),
            },
            {
              key: "status",
              header: "Status",
              render: (item) => <StatusBadge status={item.status} />,
            },
            ...(tab === "sorting"
              ? [
                  {
                    key: "actions",
                    header: "Actions",
                    render: (item: Item) => (
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="success"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleFound(item);
                          }}
                          loading={actionLoading === item.id}
                          disabled={!!actionLoading}
                        >
                          <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                          Found
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleMissing(item);
                          }}
                          loading={actionLoading === item.id}
                          disabled={!!actionLoading}
                        >
                          <XCircle className="h-3.5 w-3.5 mr-1" />
                          Missing
                        </Button>
                      </div>
                    ),
                  },
                ]
              : []),
          ]}
          data={currentItems}
          keyExtractor={(item) => item.id}
          loading={loading}
          emptyMessage={
            tab === "sorting"
              ? "No items in sorting"
              : "No missing items"
          }
          emptyIcon={
            tab === "sorting" ? (
              <SortAsc className="h-12 w-12" />
            ) : (
              <AlertTriangle className="h-12 w-12" />
            )
          }
        />
      </div>
    </div>
  );
}
