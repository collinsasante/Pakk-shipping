"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
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
import { formatDate } from "@/lib/utils";
import type { SourcingRequest, ProductCatalogEntry, Supplier } from "@/types";
import { ArrowLeft, PackageSearch, Send, ArrowRightCircle } from "lucide-react";
import axios from "axios";

export default function AdminSourcingDetailPage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const { success, error } = useToast();

  const [request, setRequest] = useState<SourcingRequest | null>(null);
  const [loading, setLoading] = useState(true);

  // Quote dialog state
  const [quoteOpen, setQuoteOpen] = useState(false);
  const [catalog, setCatalog] = useState<ProductCatalogEntry[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [catalogMode, setCatalogMode] = useState<"link" | "new" | "none">("none");
  const [selectedCatalogId, setSelectedCatalogId] = useState("");
  const [newProductName, setNewProductName] = useState("");
  const [newSupplierId, setNewSupplierId] = useState("");
  const [unitPrice, setUnitPrice] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [quoteNotes, setQuoteNotes] = useState("");
  const [sendWhatsApp, setSendWhatsApp] = useState(false);
  const [sendingQuote, setSendingQuote] = useState(false);

  const load = useCallback(() => {
    if (!id) return;
    axios.get(`/api/sourcing-requests/${id}`)
      .then((res) => {
        const r: SourcingRequest = res.data.data;
        setRequest(r);
        setQuantity(String(r.quantity));
      })
      .catch(() => error("Failed to load request"))
      .finally(() => setLoading(false));
  }, [id, error]);

  useEffect(load, [load]);

  const openQuoteDialog = () => {
    setCatalogMode("none");
    setSelectedCatalogId(request?.catalogId ?? "");
    setNewProductName("");
    setNewSupplierId("");
    setUnitPrice(request?.quotedUnitPriceUsd !== undefined ? String(request.quotedUnitPriceUsd) : "");
    setQuoteNotes(request?.quoteNotes ?? "");
    setSendWhatsApp(false);
    setQuoteOpen(true);
    Promise.all([
      axios.get("/api/product-catalog").catch(() => ({ data: { data: [] } })),
      axios.get("/api/suppliers").catch(() => ({ data: { data: [] } })),
    ]).then(([catalogRes, suppliersRes]) => {
      setCatalog(catalogRes.data.data ?? []);
      setSuppliers(suppliersRes.data.data ?? []);
    });
  };

  const submitQuote = async () => {
    if (!request) return;
    const price = Number(unitPrice);
    if (!price || price <= 0) { error("Enter a valid unit price"); return; }
    if (catalogMode === "new" && !newProductName.trim()) { error("Enter a product name for the new catalog entry"); return; }

    setSendingQuote(true);
    try {
      const res = await axios.patch(`/api/sourcing-requests/${id}/quote`, {
        catalogId: catalogMode === "link" && selectedCatalogId ? selectedCatalogId : undefined,
        newCatalogEntry:
          catalogMode === "new"
            ? {
                productName: newProductName.trim(),
                supplierId: newSupplierId || undefined,
                referenceImages: request.photos,
              }
            : undefined,
        quotedUnitPriceUsd: price,
        quantity: Number(quantity) || request.quantity,
        quoteNotes: quoteNotes || undefined,
        sendWhatsApp,
      });
      setRequest(res.data.data);
      success("Quote sent");
      setQuoteOpen(false);
    } catch (err: unknown) {
      const message = axios.isAxiosError(err) ? err.response?.data?.error ?? "Failed to send quote" : "Failed to send quote";
      error(message);
    } finally {
      setSendingQuote(false);
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
      <div className="bg-white border-b border-gray-200 px-4 sm:px-6 py-3 flex flex-wrap items-center gap-2 shrink-0">
        <button
          onClick={() => router.push("/admin/sourcing")}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 transition-colors shrink-0"
        >
          <ArrowLeft className="h-4 w-4" />
          Sourcing
        </button>
        <span className="text-gray-300 hidden sm:inline">|</span>
        <span className="font-mono font-bold text-gray-800 text-sm">{request.requestRef}</span>
        <StatusBadge status={request.status} />

        <div className="ml-auto flex items-center gap-2 shrink-0">
          {(request.status === "Requested" || request.status === "Quoted") && (
            <Button size="sm" onClick={openQuoteDialog}>
              <Send className="h-3.5 w-3.5 mr-1.5" />
              {request.status === "Quoted" ? "Update Quote" : "Send Quote"}
            </Button>
          )}
          {request.status === "Approved" && (
            <Button size="sm" onClick={() => router.push(`/admin/items/new?fromSourcingRequestId=${request.id}`)}>
              <ArrowRightCircle className="h-3.5 w-3.5 mr-1.5" />
              Convert to Item
            </Button>
          )}
          {request.status === "Converted" && request.itemId && (
            <Button size="sm" variant="outline" onClick={() => router.push(`/admin/items/${request.itemId}`)}>
              View Item
            </Button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 sm:p-6">
        <div className="max-w-4xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: request details */}
          <div className="lg:col-span-2 space-y-5">
            <div className="bg-white rounded-2xl border border-gray-100 p-6">
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-5">Request Details</h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1">Customer</label>
                  <button
                    onClick={() => router.push(`/admin/customers/${request.customerId}`)}
                    className="text-sm font-semibold text-brand-600 hover:underline"
                  >
                    {request.customerName ?? "—"}
                  </button>
                </div>

                {request.photos.length > 0 && (
                  <div>
                    <label className="block text-xs font-medium text-gray-400 mb-2">Photos</label>
                    <div className="flex gap-2 flex-wrap">
                      {request.photos.map((url) => (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img key={url} src={url} alt="" className="h-24 w-24 rounded-lg object-cover border border-gray-200" />
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1">Description</label>
                  <p className="text-sm text-gray-900 whitespace-pre-wrap">{request.description}</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-400 mb-1">Quantity</label>
                    <p className="text-sm text-gray-900">{request.quantity}</p>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-400 mb-1">Submitted</label>
                    <p className="text-sm text-gray-900">{formatDate(request.createdAt)}</p>
                  </div>
                </div>

                {request.notes && (
                  <div>
                    <label className="block text-xs font-medium text-gray-400 mb-1">Notes</label>
                    <p className="text-sm text-gray-700 whitespace-pre-wrap">{request.notes}</p>
                  </div>
                )}

                {request.declineReason && (
                  <div className="bg-red-50 border border-red-100 rounded-lg p-3">
                    <label className="block text-xs font-medium text-red-500 mb-1">Decline Reason</label>
                    <p className="text-sm text-red-900">{request.declineReason}</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right: quote summary */}
          <div className="space-y-5">
            <div className="bg-white rounded-2xl border border-gray-100 p-6">
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">Quote</h3>
              {request.quotedUnitPriceUsd !== undefined ? (
                <div className="space-y-3">
                  {request.catalogProductName && (
                    <div>
                      <p className="text-xs text-gray-400">Catalog Product</p>
                      <p className="text-sm font-semibold text-gray-900">{request.catalogProductName}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-xs text-gray-400">Unit Price</p>
                    <p className="text-sm font-medium text-gray-900">{fmt(request.quotedUnitPriceUsd)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Total</p>
                    <p className="text-lg font-bold text-brand-600">{fmt(request.quotedTotalUsd ?? 0)}</p>
                  </div>
                  {request.quoteNotes && (
                    <div>
                      <p className="text-xs text-gray-400">Notes</p>
                      <p className="text-sm text-gray-700 whitespace-pre-wrap">{request.quoteNotes}</p>
                    </div>
                  )}
                  {request.status === "Quoted" && (
                    <p className="text-xs text-amber-600 pt-2 border-t border-gray-100">Awaiting customer response</p>
                  )}
                </div>
              ) : (
                <div className="flex flex-col items-center text-center py-6 text-gray-400">
                  <PackageSearch className="h-8 w-8 mb-2" />
                  <p className="text-sm">No quote sent yet</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <Dialog open={quoteOpen} onOpenChange={setQuoteOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Send Quote</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Product Catalog</label>
              <div className="flex gap-2 mb-2">
                <button
                  type="button"
                  onClick={() => setCatalogMode("link")}
                  className={`text-xs px-3 py-1.5 rounded-lg border ${catalogMode === "link" ? "border-brand-500 bg-brand-50 text-brand-700" : "border-gray-200 text-gray-600"}`}
                >
                  Link existing
                </button>
                <button
                  type="button"
                  onClick={() => setCatalogMode("new")}
                  className={`text-xs px-3 py-1.5 rounded-lg border ${catalogMode === "new" ? "border-brand-500 bg-brand-50 text-brand-700" : "border-gray-200 text-gray-600"}`}
                >
                  Create new
                </button>
                <button
                  type="button"
                  onClick={() => setCatalogMode("none")}
                  className={`text-xs px-3 py-1.5 rounded-lg border ${catalogMode === "none" ? "border-brand-500 bg-brand-50 text-brand-700" : "border-gray-200 text-gray-600"}`}
                >
                  Skip
                </button>
              </div>

              {catalogMode === "link" && (
                <select
                  value={selectedCatalogId}
                  onChange={(e) => setSelectedCatalogId(e.target.value)}
                  className="w-full h-10 px-3 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white"
                >
                  <option value="">Select a product...</option>
                  {catalog.map((c) => <option key={c.id} value={c.id}>{c.productName}</option>)}
                </select>
              )}

              {catalogMode === "new" && (
                <div className="space-y-2">
                  <input
                    type="text"
                    value={newProductName}
                    onChange={(e) => setNewProductName(e.target.value)}
                    placeholder="New product name"
                    className="w-full h-10 px-3 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                  <select
                    value={newSupplierId}
                    onChange={(e) => setNewSupplierId(e.target.value)}
                    className="w-full h-10 px-3 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white"
                  >
                    <option value="">Select supplier (optional)</option>
                    {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Unit Price (USD)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={unitPrice}
                  onChange={(e) => setUnitPrice(e.target.value)}
                  className="w-full h-10 px-3 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Quantity</label>
                <input
                  type="number"
                  min="1"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  className="w-full h-10 px-3 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
            </div>

            {unitPrice && quantity && (
              <p className="text-sm text-gray-500">
                Total: <span className="font-semibold text-gray-900">{fmt((Number(unitPrice) || 0) * (Number(quantity) || 0))}</span>
              </p>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Notes to Customer</label>
              <textarea
                value={quoteNotes}
                onChange={(e) => setQuoteNotes(e.target.value)}
                rows={2}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
              />
            </div>

            <label className="flex items-center gap-2 text-sm text-gray-600">
              <input
                type="checkbox"
                checked={sendWhatsApp}
                onChange={(e) => setSendWhatsApp(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500"
              />
              Send WhatsApp notification to customer
            </label>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setQuoteOpen(false)}>Cancel</Button>
            <Button onClick={submitQuote} disabled={sendingQuote}>
              {sendingQuote ? "Sending..." : "Send Quote"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
