"use client";

import React, { useRef, useState } from "react";
import type { SupportMessage } from "@/types";
import { Play, Pause, Download, FileText } from "lucide-react";

function formatDuration(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function VoicePlayer({ url, duration, isMe }: { url: string; duration?: number; isMe: boolean }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const total = duration ?? 0;

  const toggle = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (playing) {
      audio.pause();
    } else {
      audio.play();
    }
    setPlaying(!playing);
  };

  return (
    <div className="flex items-center gap-2.5 px-3 py-2.5 w-52">
      <audio
        ref={audioRef}
        src={url}
        onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
        onEnded={() => { setPlaying(false); setCurrentTime(0); }}
      />
      <button
        onClick={toggle}
        className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${isMe ? "bg-white/20 text-white" : "bg-brand-100 text-brand-600"}`}
      >
        {playing ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5 ml-0.5" />}
      </button>
      <div className="flex-1">
        <div className={`h-1 rounded-full overflow-hidden ${isMe ? "bg-white/20" : "bg-gray-200"}`}>
          <div
            className={`h-full rounded-full transition-all ${isMe ? "bg-white/70" : "bg-brand-500"}`}
            style={{ width: total > 0 ? `${(currentTime / total) * 100}%` : "0%" }}
          />
        </div>
        <p className={`text-xs mt-1 ${isMe ? "text-white/60" : "text-gray-400"}`}>
          {playing ? formatDuration(currentTime) : formatDuration(total)}
        </p>
      </div>
    </div>
  );
}

interface Props {
  msg: SupportMessage;
  isMe: boolean;
}

export function MessageBubble({ msg, isMe }: Props) {
  const bubbleClass = `rounded-2xl text-sm overflow-hidden ${
    isMe
      ? "bg-brand-600 text-white rounded-br-sm"
      : "bg-white border border-gray-200 text-gray-800 rounded-bl-sm shadow-sm"
  }`;

  const renderContent = () => {
    if (msg.type === "image" && msg.fileUrl) {
      return (
        <div>
          <a href={msg.fileUrl} target="_blank" rel="noopener noreferrer">
            <img
              src={msg.fileUrl}
              alt={msg.fileName ?? "Image"}
              className="max-w-[240px] block object-cover rounded-t-2xl"
            />
          </a>
          {msg.content && (
            <p className="px-3 pb-2.5 pt-1.5 text-sm">{msg.content}</p>
          )}
        </div>
      );
    }

    if (msg.type === "voice" && msg.fileUrl) {
      return <VoicePlayer url={msg.fileUrl} duration={msg.duration} isMe={isMe} />;
    }

    if (msg.type === "document" && msg.fileUrl) {
      return (
        <a
          href={msg.fileUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-3 px-3 py-2.5 hover:opacity-80 transition-opacity"
        >
          <div
            className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
              isMe ? "bg-white/20" : "bg-brand-50"
            }`}
          >
            <FileText className={`h-5 w-5 ${isMe ? "text-white" : "text-brand-600"}`} />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium truncate max-w-[160px]">
              {msg.fileName ?? "Document"}
            </p>
            {msg.fileSize != null && (
              <p className={`text-xs ${isMe ? "text-white/60" : "text-gray-400"}`}>
                {formatBytes(msg.fileSize)}
              </p>
            )}
          </div>
          <Download className={`h-4 w-4 shrink-0 ${isMe ? "text-white/70" : "text-gray-400"}`} />
        </a>
      );
    }

    return <p className="px-4 py-2.5 whitespace-pre-wrap break-words">{msg.content}</p>;
  };

  return (
    <div className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
      <div className={`max-w-sm flex flex-col gap-1 ${isMe ? "items-end" : "items-start"}`}>
        <p className="text-xs text-gray-400 px-1">
          {isMe ? "You" : msg.senderName} ·{" "}
          {new Date(msg.timestamp).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </p>
        <div className={bubbleClass}>{renderContent()}</div>
      </div>
    </div>
  );
}
