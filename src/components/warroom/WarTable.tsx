import { useRef } from "react";
import type { Agent, UploadedDocument } from "@/types/warroom";
import { FileText, Loader2, CheckCircle, AlertCircle, Upload } from "lucide-react";

const roleInitials: Record<string, string> = {
  chairperson: "M",
  analyst: "D",
  advocate: "W",
  critic: "L",
  secretary: "SC",
};

const roleLabel: Record<string, string> = {
  chairperson: "DM / Dungeon Master",
  analyst: "Stats & Strategy",
  advocate: "The Artist",
  critic: "Tactical Realist",
  secretary: "Secretary",
};

const roleColor: Record<string, string> = {
  chairperson: "bg-primary",
  analyst: "bg-success",
  advocate: "bg-purple-500",
  critic: "bg-warning",
  secretary: "bg-muted-foreground",
};

const statusIcons: Record<string, React.ReactNode> = {
  uploading: <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground" />,
  processing: <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />,
  analyzed: <CheckCircle className="w-3.5 h-3.5 text-success" />,
  error: <AlertCircle className="w-3.5 h-3.5 text-destructive" />,
};

// Fixed positions: top, left, right, bottom for the D&D table layout
const FIXED_POSITIONS = [
  { left: "50%", top: "18%" },   // Mike - top
  { left: "18%", top: "50%" },   // Dustin - left
  { left: "82%", top: "50%" },   // Lucas - right
  { left: "50%", top: "82%" },   // Will - bottom
];

interface WarTableProps {
  agents: Agent[];
  documents: UploadedDocument[];
  onUpload: (file: File) => void;
  sessionStatus: string;
  bgImage?: string;
}

export function WarTable({ agents, documents, onUpload, sessionStatus, bgImage }: WarTableProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="flex-1 flex flex-col min-h-0 relative">
      {/* War table area */}
      <div className="flex-1 relative overflow-hidden bg-background">
        {bgImage && (
          <div
            className="absolute inset-0 bg-cover bg-center opacity-10 pointer-events-none"
            style={{ backgroundImage: `url(${bgImage})` }}
          />
        )}

        {/* Subtle concentric rings */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="absolute rounded-full border border-border/30"
              style={{ width: `${i * 22}%`, height: `${i * 22}%` }}
            />
          ))}
        </div>

        {/* Center — Quorum / User avatar */}
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10">
          <div className="relative">
            <div className="w-16 h-16 rounded-2xl bg-card border border-border flex items-center justify-center shadow-lg">
              <span className="text-xl font-bold text-foreground">Q</span>
            </div>
            {/* Subtle glow */}
            <div className="absolute inset-0 rounded-2xl bg-primary/10 animate-pulse pointer-events-none" />
          </div>
          <p className="text-[10px] text-muted-foreground text-center mt-1.5">You</p>
        </div>

        {/* Empty state */}
        {agents.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center">
            <p className="text-sm text-muted-foreground">Start a session to see agents here</p>
          </div>
        )}

        {/* Agents */}
        {agents.map((agent, i) => {
          const isSpeaking = agent.speakingState === "speaking";
          const isThinking = agent.speakingState === "thinking";
          const color = roleColor[agent.role] || "bg-muted-foreground";
          const pos = FIXED_POSITIONS[i] || { left: "50%", top: "50%" };

          return (
            <div
              key={agent.id}
              className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-2 z-10 transition-all duration-500"
              style={{ left: pos.left, top: pos.top }}
            >
              <div className="relative">
                <div
                  className={`w-14 h-14 rounded-2xl flex items-center justify-center text-sm font-bold transition-all duration-300 shadow-sm ${
                    isThinking
                      ? "bg-muted text-muted-foreground opacity-50"
                      : isSpeaking
                        ? `${color} text-white shadow-lg scale-105`
                        : "bg-card text-foreground border border-border"
                  }`}
                >
                  {roleInitials[agent.role] || "??"}
                </div>
                {isSpeaking && (
                  <div className={`absolute inset-0 rounded-2xl border-2 ${
                    agent.role === "chairperson" ? "border-primary/40" :
                    agent.role === "critic" ? "border-warning/40" :
                    agent.role === "advocate" ? "border-purple-400/40" :
                    "border-success/40"
                  } animate-pulse`} />
                )}
                {isSpeaking && (
                  <span className="absolute -top-1 -right-1 text-xs">🎤</span>
                )}
                {isThinking && (
                  <Loader2 className="absolute -bottom-1 -right-1 w-4 h-4 animate-spin text-primary" />
                )}
                {agent.isHandRaised && (
                  <span className="absolute -top-1 -right-1 text-sm">✋</span>
                )}
              </div>

              <div className="text-center">
                <p className="text-xs font-semibold text-foreground">{agent.name}</p>
                <p className="text-[10px] text-muted-foreground">{roleLabel[agent.role]}</p>
              </div>

              {isSpeaking && (
                <div className="flex items-end gap-0.5 h-3">
                  {[0, 1, 2, 3].map((j) => (
                    <div
                      key={j}
                      className={`w-0.5 rounded-full ${color}`}
                      style={{
                        height: `${4 + Math.random() * 8}px`,
                        animation: `gentle-pulse ${0.5 + j * 0.15}s ease-in-out infinite alternate`,
                      }}
                    />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Document tray */}
      <div className="border-t border-border bg-card">
        <div className="flex items-center gap-2 px-5 py-2">
          <FileText className="w-3.5 h-3.5 text-muted-foreground" />
          <span className="text-xs text-muted-foreground font-medium">Documents</span>
          <span className="text-xs text-muted-foreground ml-auto">{documents.length}</span>
        </div>

        <div className="flex items-center gap-2 px-5 pb-3 overflow-x-auto">
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            accept=".pdf,.doc,.docx,.txt,.md"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) onUpload(file);
            }}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="shrink-0 w-24 h-16 rounded-xl border-2 border-dashed border-border hover:border-primary/40 hover:bg-primary/5 flex flex-col items-center justify-center gap-1 transition-all"
          >
            <Upload className="w-4 h-4 text-muted-foreground" />
            <span className="text-[10px] text-muted-foreground">Upload</span>
          </button>

          {documents.map((doc) => (
            <div
              key={doc.id}
              className="shrink-0 w-36 h-16 rounded-xl border border-border bg-secondary/50 hover:bg-secondary p-2.5 flex flex-col justify-between transition-all cursor-pointer"
            >
              <div className="flex items-center gap-1.5">
                {statusIcons[doc.status]}
                <span className="text-[11px] font-medium text-foreground truncate flex-1">{doc.name}</span>
              </div>
              {doc.summary ? (
                <p className="text-[10px] text-muted-foreground line-clamp-1">{doc.summary}</p>
              ) : (
                <p className="text-[10px] text-muted-foreground capitalize">{doc.status}…</p>
              )}
            </div>
          ))}

          {documents.length === 0 && (
            <p className="text-xs text-muted-foreground py-2">No documents yet</p>
          )}
        </div>
      </div>
    </div>
  );
}
