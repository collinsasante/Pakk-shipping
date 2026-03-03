"use client";

import React, { useState, useRef } from "react";
import { Send, Paperclip, Mic, Image as ImageIcon, FileText, X, Square, Loader2 } from "lucide-react";
import { uploadSupportFile } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";

export type AttachmentMeta = {
  type: "image" | "voice" | "document";
  fileUrl: string;
  fileName: string;
  fileSize: number;
  duration?: number;
  mimeType?: string;
};

interface Props {
  ticketId: string;
  onSend: (content: string, attachment?: AttachmentMeta) => Promise<void>;
  disabled?: boolean;
  placeholder?: string;
}

function formatTime(s: number) {
  return `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`;
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function ChatInput({
  ticketId,
  onSend,
  disabled,
  placeholder = "Type a message...",
}: Props) {
  const { appUser } = useAuth();
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [pendingAttachment, setPendingAttachment] = useState<AttachmentMeta | null>(null);
  const [recording, setRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);

  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const recordingInterval = useRef<ReturnType<typeof setInterval> | null>(null);
  const recordingStart = useRef<number>(0);
  const chunks = useRef<Blob[]>([]);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const docInputRef = useRef<HTMLInputElement>(null);

  const uploadFile = async (file: File, type: "image" | "document") => {
    setUploading(true);
    setUploadProgress(0);
    setShowAttachMenu(false);
    try {
      const uid = appUser?.id ?? "unknown";
      const path = `support/${ticketId}/${uid}-${Date.now()}-${file.name}`;
      const url = await uploadSupportFile(file, path, setUploadProgress);
      setPendingAttachment({
        type,
        fileUrl: url,
        fileName: file.name,
        fileSize: file.size,
        mimeType: file.type,
      });
    } finally {
      setUploading(false);
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      chunks.current = [];
      mr.ondataavailable = (e) => { if (e.data.size > 0) chunks.current.push(e.data); };
      mr.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunks.current, { type: "audio/webm" });
        const duration = Math.round((Date.now() - recordingStart.current) / 1000);
        setUploading(true);
        setUploadProgress(0);
        try {
          const uid = appUser?.id ?? "unknown";
          const path = `support/${ticketId}/${uid}-${Date.now()}-voice.webm`;
          const url = await uploadSupportFile(blob, path, setUploadProgress);
          setPendingAttachment({
            type: "voice",
            fileUrl: url,
            fileName: "Voice message",
            fileSize: blob.size,
            mimeType: "audio/webm",
            duration,
          });
        } finally {
          setUploading(false);
        }
      };
      mr.start();
      mediaRecorder.current = mr;
      recordingStart.current = Date.now();
      setRecording(true);
      setRecordingTime(0);
      recordingInterval.current = setInterval(() => {
        setRecordingTime(Math.round((Date.now() - recordingStart.current) / 1000));
      }, 1000);
    } catch {
      // Microphone access denied or unavailable
    }
  };

  const stopRecording = () => {
    if (recordingInterval.current) {
      clearInterval(recordingInterval.current);
      recordingInterval.current = null;
    }
    setRecording(false);
    mediaRecorder.current?.stop();
    mediaRecorder.current = null;
  };

  const cancelRecording = () => {
    if (recordingInterval.current) {
      clearInterval(recordingInterval.current);
      recordingInterval.current = null;
    }
    if (mediaRecorder.current) {
      mediaRecorder.current.onstop = null;
      mediaRecorder.current.stop();
      mediaRecorder.current = null;
    }
    setRecording(false);
    setRecordingTime(0);
  };

  const handleSend = async () => {
    if ((!text.trim() && !pendingAttachment) || sending) return;
    setSending(true);
    try {
      await onSend(text.trim(), pendingAttachment ?? undefined);
      setText("");
      setPendingAttachment(null);
    } finally {
      setSending(false);
    }
  };

  const canSend = (text.trim().length > 0 || pendingAttachment != null) && !sending && !uploading && !recording;
  const showSend = text.trim().length > 0 || pendingAttachment != null;

  return (
    <div className="bg-white border-t border-gray-200 p-3 shrink-0">
      {/* Pending attachment preview */}
      {pendingAttachment && (
        <div className="flex items-center gap-2 mb-2">
          <div className="flex items-center gap-2 bg-gray-100 rounded-xl px-3 py-2 text-sm flex-1 min-w-0">
            {pendingAttachment.type === "image" ? (
              <>
                <img src={pendingAttachment.fileUrl} alt="" className="w-8 h-8 rounded object-cover shrink-0" />
                <span className="truncate text-xs text-gray-600">{pendingAttachment.fileName}</span>
              </>
            ) : pendingAttachment.type === "voice" ? (
              <>
                <Mic className="h-4 w-4 text-brand-600 shrink-0" />
                <span className="text-xs text-gray-600">
                  Voice message ({formatTime(pendingAttachment.duration ?? 0)})
                </span>
              </>
            ) : (
              <>
                <FileText className="h-4 w-4 text-brand-600 shrink-0" />
                <div className="min-w-0">
                  <p className="truncate text-xs text-gray-700 font-medium">{pendingAttachment.fileName}</p>
                  {pendingAttachment.fileSize != null && (
                    <p className="text-xs text-gray-400">{formatBytes(pendingAttachment.fileSize)}</p>
                  )}
                </div>
              </>
            )}
          </div>
          <button
            onClick={() => setPendingAttachment(null)}
            className="p-1.5 rounded-full hover:bg-gray-100 text-gray-400 shrink-0"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Upload progress */}
      {uploading && (
        <div className="mb-2">
          <div className="h-1 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-brand-500 rounded-full transition-all duration-200"
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
          <p className="text-xs text-gray-400 mt-1">Uploading... {uploadProgress}%</p>
        </div>
      )}

      {/* Recording UI */}
      {recording ? (
        <div className="flex items-center gap-3 py-1 px-1">
          <div className="w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse shrink-0" />
          <span className="text-sm font-semibold text-gray-800 tabular-nums w-10">
            {formatTime(recordingTime)}
          </span>
          <span className="text-xs text-gray-400 flex-1">Recording audio...</span>
          <button
            onClick={cancelRecording}
            className="p-2 rounded-full hover:bg-gray-100 text-gray-400"
            title="Cancel"
          >
            <X className="h-4 w-4" />
          </button>
          <button
            onClick={stopRecording}
            className="w-9 h-9 rounded-full bg-brand-600 text-white flex items-center justify-center hover:bg-brand-700 transition-colors"
            title="Stop and send"
          >
            <Square className="h-3.5 w-3.5 fill-current" />
          </button>
        </div>
      ) : (
        <div className="flex items-end gap-2">
          {/* Attach button + menu */}
          <div className="relative shrink-0">
            <button
              onClick={() => setShowAttachMenu((v) => !v)}
              disabled={disabled || uploading}
              className="w-9 h-9 rounded-full flex items-center justify-center text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors disabled:opacity-40"
            >
              <Paperclip className="h-5 w-5" />
            </button>

            {showAttachMenu && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setShowAttachMenu(false)}
                />
                <div className="absolute bottom-full mb-2 left-0 bg-white rounded-2xl shadow-xl border border-gray-100 py-2 w-48 z-20">
                  <button
                    onClick={() => imageInputRef.current?.click()}
                    className="flex items-center gap-3 w-full px-4 py-2.5 hover:bg-gray-50 text-sm text-gray-700"
                  >
                    <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center shrink-0">
                      <ImageIcon className="h-4 w-4 text-purple-600" />
                    </div>
                    Photo / Video
                  </button>
                  <button
                    onClick={() => docInputRef.current?.click()}
                    className="flex items-center gap-3 w-full px-4 py-2.5 hover:bg-gray-50 text-sm text-gray-700"
                  >
                    <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                      <FileText className="h-4 w-4 text-blue-600" />
                    </div>
                    Document
                  </button>
                </div>
              </>
            )}
          </div>

          {/* Hidden file inputs */}
          <input
            ref={imageInputRef}
            type="file"
            accept="image/*,video/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) uploadFile(file, "image");
              e.target.value = "";
            }}
          />
          <input
            ref={docInputRef}
            type="file"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) uploadFile(file, "document");
              e.target.value = "";
            }}
          />

          {/* Text input */}
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder={placeholder}
            rows={1}
            disabled={disabled || uploading}
            className="flex-1 resize-none rounded-2xl border border-gray-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 overflow-y-auto disabled:opacity-40"
            style={{ minHeight: "42px", maxHeight: "120px" }}
          />

          {/* Mic or Send */}
          {showSend ? (
            <button
              onClick={handleSend}
              disabled={!canSend}
              className="w-9 h-9 rounded-full bg-brand-600 text-white flex items-center justify-center hover:bg-brand-700 transition-colors disabled:opacity-40 shrink-0"
            >
              {sending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </button>
          ) : (
            <button
              onClick={startRecording}
              disabled={disabled || uploading}
              className="w-9 h-9 rounded-full flex items-center justify-center text-gray-400 hover:bg-gray-100 hover:text-brand-600 transition-colors disabled:opacity-40 shrink-0"
            >
              <Mic className="h-5 w-5" />
            </button>
          )}
        </div>
      )}
    </div>
  );
}
