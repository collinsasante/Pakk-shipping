"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { formatDate } from "@/lib/utils";
import type { SupportTicket } from "@/types";
import { MessageCircle, Plus, CheckCircle, Clock, X } from "lucide-react";
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

export default function CustomerSupportPage() {
  const { error, success } = useToast();
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [selected, setSelected] = useState<SupportTicket | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [newSubject, setNewSubject] = useState("");
  const [newMessage, setNewMessage] = useState("");
  const [creating, setCreating] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const selectedRef = useRef<SupportTicket | null>(null);

  useEffect(() => {
    selectedRef.current = selected;
  }, [selected]);

  const load = useCallback(async (autoSelect = false) => {
    try {
      const res = await axios.get("/api/support");
      const data: SupportTicket[] = res.data.data;
      setTickets(data);
      if (autoSelect && !selectedRef.current && data.length > 0) {
        setSelected(data[0]);
      }
    } catch {
      error("Failed to load support tickets");
    } finally {
      setLoading(false);
    }
  }, [error]);

  // Initial load
  useEffect(() => { load(true); }, [load]);

  // Poll for new messages in the selected ticket every 5s
  useEffect(() => {
    const interval = setInterval(async () => {
      const cur = selectedRef.current;
      if (!cur) return;
      try {
        const res = await axios.get(`/api/support/${cur.id}`);
        const updated: SupportTicket = res.data.data;
        if (updated.messages.length !== cur.messages.length) {
          // Play sound only for new admin messages
          const newMsgs = updated.messages.slice(cur.messages.length);
          if (newMsgs.some((m) => m.sender === "admin")) {
            playNotificationSound();
          }
          setSelected(updated);
          setTickets((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
        }
      } catch {}
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  // Poll ticket list for new tickets every 30s
  useEffect(() => {
    const interval = setInterval(() => load(), 30000);
    return () => clearInterval(interval);
  }, [load]);

  // Scroll to bottom when new messages arrive
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

  const handleCreate = async () => {
    if (!newSubject.trim() || !newMessage.trim()) return;
    setCreating(true);
    try {
      const res = await axios.post("/api/support", {
        subject: newSubject.trim(),
        content: newMessage.trim(),
      });
      const ticket = res.data.data;
      setTickets((prev) => [ticket, ...prev]);
      setSelected(ticket);
      setShowNew(false);
      setNewSubject("");
      setNewMessage("");
      success("Ticket created");
    } catch {
      error("Failed to create ticket");
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <Header title="Support" subtitle="Report issues and get help from our team" />

      <div className="flex-1 flex overflow-hidden">
        {/* Ticket list */}
        <div className="w-72 border-r border-gray-200 bg-white flex flex-col shrink-0">
          <div className="p-3 border-b border-gray-100">
            <Button className="w-full" size="sm" onClick={() => setShowNew(true)}>
              <Plus className="h-4 w-4 mr-1.5" />
              New Issue
            </Button>
          </div>

          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="p-4 space-y-2">
                {[1, 2].map((i) => (
                  <div key={i} className="h-16 bg-gray-100 rounded-xl animate-pulse" />
                ))}
              </div>
            ) : tickets.length === 0 ? (
              <div className="p-6 text-center">
                <MessageCircle className="h-8 w-8 text-gray-200 mx-auto mb-2" />
                <p className="text-sm text-gray-400">No tickets yet</p>
              </div>
            ) : (
              tickets.map((ticket) => (
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
                  <p className="text-xs text-gray-400">
                    {ticket.ticketRef} · {formatDate(ticket.updatedAt)}
                  </p>
                  {ticket.messages.length > 0 && (
                    <p className="text-xs text-gray-500 mt-1 truncate">
                      {ticket.messages[ticket.messages.length - 1].content}
                    </p>
                  )}
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
                  <p className="text-xs text-gray-400">
                    {selected.ticketRef} · Opened {formatDate(selected.createdAt)}
                  </p>
                </div>
                <TicketStatusBadge status={selected.status} />
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                {selected.messages.map((msg) => (
                  <MessageBubble
                    key={msg.id}
                    msg={msg}
                    isMe={msg.sender === "customer"}
                  />
                ))}
                <div ref={bottomRef} />
              </div>

              {/* Input */}
              {selected.status !== "resolved" ? (
                <ChatInput
                  ticketId={selected.id}
                  onSend={handleSend}
                  disabled={sending}
                  placeholder="Type a message..."
                />
              ) : (
                <div className="bg-green-50 border-t border-green-100 p-4 text-center shrink-0">
                  <p className="text-sm text-green-700 font-medium">This ticket has been resolved.</p>
                </div>
              )}
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center">
              <MessageCircle className="h-12 w-12 text-gray-200 mb-3" />
              <p className="text-gray-500 font-medium">Select a ticket or create a new issue</p>
            </div>
          )}
        </div>
      </div>

      {/* New Ticket Modal */}
      {showNew && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-xl">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h2 className="font-semibold text-gray-900">Report an Issue</h2>
              <button onClick={() => setShowNew(false)} className="p-1.5 rounded-lg hover:bg-gray-100">
                <X className="h-4 w-4 text-gray-500" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
                <input
                  type="text"
                  value={newSubject}
                  onChange={(e) => setNewSubject(e.target.value)}
                  placeholder="e.g. Missing package, Wrong item..."
                  className="w-full h-10 px-3 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Describe your issue</label>
                <textarea
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Please provide as much detail as possible..."
                  rows={4}
                  className="w-full resize-none px-3 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
              <div className="flex gap-3 pt-1">
                <Button variant="outline" className="flex-1" onClick={() => setShowNew(false)}>
                  Cancel
                </Button>
                <Button
                  className="flex-1"
                  loading={creating}
                  disabled={!newSubject.trim() || !newMessage.trim()}
                  onClick={handleCreate}
                >
                  Submit Issue
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
