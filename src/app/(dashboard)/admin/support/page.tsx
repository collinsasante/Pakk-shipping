"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { formatDate } from "@/lib/utils";
import type { SupportTicket } from "@/types";
import { MessageCircle, CheckCircle, Clock, RotateCcw, User } from "lucide-react";
import axios from "axios";
import { playNotificationSound } from "@/hooks/useNotifications";
import { MessageBubble } from "@/components/support/MessageBubble";
import { ChatInput, type AttachmentMeta } from "@/components/support/ChatInput";

function TicketStatusBadge({ status }: { status: string }) {
  return status === "resolved" ? (
    <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-green-100 text-green-700">
      <CheckCircle className="h-3 w-3" /> Resolved
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">
      <Clock className="h-3 w-3" /> Open
    </span>
  );
}

const STATUS_FILTERS = ["all", "open", "resolved"] as const;

export default function AdminSupportPage() {
  const { error, success } = useToast();
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [selected, setSelected] = useState<SupportTicket | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [filter, setFilter] = useState<"all" | "open" | "resolved">("open");
  const bottomRef = useRef<HTMLDivElement>(null);
  const selectedRef = useRef<SupportTicket | null>(null);

  useEffect(() => {
    selectedRef.current = selected;
  }, [selected]);

  const load = useCallback(async () => {
    try {
      const res = await axios.get("/api/support");
      setTickets(res.data.data);
    } catch {
      error("Failed to load support tickets");
    } finally {
      setLoading(false);
    }
  }, [error]);

  useEffect(() => { load(); }, [load]);

  // Poll for new messages in selected ticket every 5s
  useEffect(() => {
    const interval = setInterval(async () => {
      const cur = selectedRef.current;
      if (!cur) return;
      try {
        const res = await axios.get(`/api/support/${cur.id}`);
        const updated: SupportTicket = res.data.data;
        if (updated.messages.length !== cur.messages.length) {
          // Play sound only for new customer messages
          const newMsgs = updated.messages.slice(cur.messages.length);
          if (newMsgs.some((m) => m.sender === "customer")) {
            playNotificationSound();
          }
          setSelected(updated);
          setTickets((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
        }
      } catch {}
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  // Poll ticket list every 15s for new tickets
  useEffect(() => {
    const interval = setInterval(load, 15000);
    return () => clearInterval(interval);
  }, [load]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [selected?.messages.length]);

  const selectTicket = async (ticket: SupportTicket) => {
    try {
      const res = await axios.get(`/api/support/${ticket.id}`);
      setSelected(res.data.data);
    } catch {
      setSelected(ticket);
    }
  };

  const handleSend = async (content: string, attachment?: AttachmentMeta) => {
    if (!selected) return;
    setSending(true);
    try {
      const res = await axios.post(`/api/support/${selected.id}`, {
        content,
        ...(attachment ?? {}),
      });
      setSelected(res.data.data);
      setTickets((prev) => prev.map((t) => (t.id === selected.id ? res.data.data : t)));
    } catch {
      error("Failed to send message");
    } finally {
      setSending(false);
    }
  };

  const handleStatusToggle = async () => {
    if (!selected) return;
    const newStatus = selected.status === "open" ? "resolved" : "open";
    setUpdating(true);
    try {
      const res = await axios.patch(`/api/support/${selected.id}`, { status: newStatus });
      setSelected(res.data.data);
      setTickets((prev) => prev.map((t) => (t.id === selected.id ? res.data.data : t)));
      success(`Ticket marked as ${newStatus}`);
    } catch {
      error("Failed to update ticket");
    } finally {
      setUpdating(false);
    }
  };

  const visibleTickets = tickets.filter((t) =>
    filter === "all" ? true : t.status === filter
  );

  const openCount = tickets.filter((t) => t.status === "open").length;

  return (
    <div className="flex flex-col h-full">
      <Header
        title="Support Tickets"
        subtitle={`${openCount} open ticket${openCount !== 1 ? "s" : ""}`}
      />

      <div className="flex-1 flex overflow-hidden">
        {/* Ticket list */}
        <div className="w-80 border-r border-gray-200 bg-white flex flex-col shrink-0">
          {/* Filter tabs */}
          <div className="flex gap-1 p-3 border-b border-gray-100">
            {STATUS_FILTERS.map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`flex-1 py-1.5 text-xs font-medium rounded-lg capitalize transition-colors ${
                  filter === f
                    ? "bg-brand-600 text-white"
                    : "text-gray-500 hover:bg-gray-100"
                }`}
              >
                {f === "all" ? `All (${tickets.length})` : f === "open" ? `Open (${tickets.filter((t) => t.status === "open").length})` : `Resolved (${tickets.filter((t) => t.status === "resolved").length})`}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="p-4 space-y-2">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-20 bg-gray-100 rounded-xl animate-pulse" />
                ))}
              </div>
            ) : visibleTickets.length === 0 ? (
              <div className="p-6 text-center">
                <MessageCircle className="h-8 w-8 text-gray-200 mx-auto mb-2" />
                <p className="text-sm text-gray-400">No tickets</p>
              </div>
            ) : (
              visibleTickets.map((ticket) => (
                <button
                  key={ticket.id}
                  onClick={() => selectTicket(ticket)}
                  className={`w-full text-left p-4 border-b border-gray-50 transition-colors ${
                    selected?.id === ticket.id
                      ? "bg-brand-50 border-r-2 border-r-brand-500"
                      : "hover:bg-gray-50"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <p className="text-sm font-semibold text-gray-900 truncate">
                      {ticket.subject}
                    </p>
                    <TicketStatusBadge status={ticket.status} />
                  </div>
                  <div className="flex items-center gap-1 text-xs text-gray-500 mb-1">
                    <User className="h-3 w-3" />
                    <span>{ticket.customerName ?? "Customer"}</span>
                    <span className="text-gray-300">·</span>
                    <span className="font-mono">{ticket.ticketRef}</span>
                  </div>
                  {ticket.messages.length > 0 && (
                    <p className="text-xs text-gray-400 truncate">
                      {ticket.messages[ticket.messages.length - 1].senderName}: {ticket.messages[ticket.messages.length - 1].content}
                    </p>
                  )}
                  <p className="text-xs text-gray-400 mt-1">{formatDate(ticket.updatedAt)}</p>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Chat area */}
        <div className="flex-1 flex flex-col bg-gray-50 overflow-hidden">
          {selected ? (
            <>
              {/* Ticket header */}
              <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between shrink-0">
                <div>
                  <h3 className="font-semibold text-gray-900">{selected.subject}</h3>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs text-gray-400">
                      {selected.ticketRef}
                    </span>
                    <span className="text-gray-300">·</span>
                    <span className="text-xs text-gray-500 font-medium">
                      {selected.customerName ?? "Customer"}
                    </span>
                    <span className="text-gray-300">·</span>
                    <span className="text-xs text-gray-400">
                      {formatDate(selected.createdAt)}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <TicketStatusBadge status={selected.status} />
                  <Button
                    size="sm"
                    variant="outline"
                    loading={updating}
                    onClick={handleStatusToggle}
                    className={selected.status === "open"
                      ? "border-green-300 text-green-700 hover:bg-green-50"
                      : "border-amber-300 text-amber-700 hover:bg-amber-50"
                    }
                  >
                    {selected.status === "open" ? (
                      <><CheckCircle className="h-3.5 w-3.5 mr-1.5" />Mark Resolved</>
                    ) : (
                      <><RotateCcw className="h-3.5 w-3.5 mr-1.5" />Reopen</>
                    )}
                  </Button>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                {selected.messages.map((msg) => (
                  <MessageBubble
                    key={msg.id}
                    msg={msg}
                    isMe={msg.sender === "admin"}
                  />
                ))}
                <div ref={bottomRef} />
              </div>

              {/* Input */}
              <ChatInput
                ticketId={selected.id}
                onSend={handleSend}
                disabled={sending}
                placeholder="Reply to customer..."
              />
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center">
              <MessageCircle className="h-12 w-12 text-gray-200 mb-3" />
              <p className="text-gray-500 font-medium">Select a ticket to reply</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
