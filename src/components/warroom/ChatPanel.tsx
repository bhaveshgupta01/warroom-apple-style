import { useRef, useEffect, useState } from "react";
import { Send, Bot, User, Loader2 } from "lucide-react";
import type { TranscriptEntry, VoteItem, VoteValue } from "@/types/warroom";
import { Button } from "@/components/ui/button";
import { ThumbsUp, ThumbsDown, MinusCircle } from "lucide-react";

const roleColors: Record<string, string> = {
  chairperson: "bg-primary/8",
  analyst: "bg-success/8",
  advocate: "bg-accent/60",
  critic: "bg-destructive/8",
  secretary: "bg-secondary",
};

const roleDotColors: Record<string, string> = {
  chairperson: "bg-primary",
  analyst: "bg-success",
  advocate: "bg-accent-foreground",
  critic: "bg-destructive",
  secretary: "bg-muted-foreground",
};

// Role label colors for the agent names
const roleNameColors: Record<string, string> = {
  chairperson: "text-primary",
  analyst: "text-success",
  advocate: "text-purple-500 dark:text-purple-400",
  critic: "text-warning",
};

interface SpecialCard {
  id: string;
  type: string;
  data: any;
  timestamp: number;
}

interface ChatPanelProps {
  entries: TranscriptEntry[];
  vote: VoteItem | null;
  userVote?: VoteValue;
  onCastVote: (value: VoteValue) => void;
  onSendMessage?: (text: string) => void;
  specialCards?: SpecialCard[];
  homeworkActive?: boolean;
  agentInfo?: Record<string, { name: string; roleLabel: string }>;
}

export function ChatPanel({
  entries,
  vote,
  userVote,
  onCastVote,
  onSendMessage,
  specialCards = [],
  homeworkActive = false,
  agentInfo = {},
}: ChatPanelProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [inputText, setInputText] = useState("");

  // Merge entries and special cards into a single timeline
  const timeline = buildTimeline(entries, specialCards);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [entries, specialCards, vote]);

  const handleSend = () => {
    if (inputText.trim() && onSendMessage) {
      onSendMessage(inputText.trim());
      setInputText("");
    }
  };

  return (
    <div className="flex flex-col h-full bg-card/50">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border flex items-center gap-2">
        <h3 className="text-sm font-medium text-foreground">⚔️ Battle Log</h3>
        <span className="ml-auto text-xs text-muted-foreground">{entries.length} messages</span>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
        {timeline.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full gap-3">
            <div className="w-12 h-12 rounded-2xl bg-secondary flex items-center justify-center">
              <span className="text-xl">🎲</span>
            </div>
            <p className="text-sm text-muted-foreground text-center">
              The campaign begins…
            </p>
          </div>
        )}

        {timeline.map((item) => {
          if (item.kind === "message") {
            return <MessageBubble key={item.entry.id} entry={item.entry} agentInfo={agentInfo} />;
          }
          if (item.kind === "card") {
            return <SpecialCardRenderer key={item.card.id} card={item.card} onCastVote={onCastVote} userVote={userVote} />;
          }
          return null;
        })}

        {/* Homework loading indicator */}
        {homeworkActive && (
          <div className="animate-fade-in ml-4">
            <div className="rounded-xl border border-border bg-card p-3 flex items-center gap-3">
              <Loader2 className="w-4 h-4 animate-spin text-primary" />
              <span className="text-xs text-muted-foreground">Dustin is researching…</span>
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="p-3 border-t border-border">
        <div className="flex items-center gap-2 rounded-xl bg-secondary px-3 py-2.5">
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            placeholder="Type a message…"
            className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none"
          />
          <button
            onClick={handleSend}
            className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-accent transition-colors"
          >
            <Send className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── TIMELINE BUILDER ───

type TimelineItem =
  | { kind: "message"; entry: TranscriptEntry; ts: number }
  | { kind: "card"; card: SpecialCard; ts: number };

function buildTimeline(entries: TranscriptEntry[], cards: SpecialCard[]): TimelineItem[] {
  const items: TimelineItem[] = [
    ...entries.map((e) => ({ kind: "message" as const, entry: e, ts: e.timestamp })),
    ...cards.map((c) => ({ kind: "card" as const, card: c, ts: c.timestamp })),
  ];
  items.sort((a, b) => a.ts - b.ts);
  return items;
}

// ─── MESSAGE BUBBLE ───

function MessageBubble({ entry, agentInfo }: { entry: TranscriptEntry; agentInfo: Record<string, { name: string; roleLabel: string }> }) {
  const isUser = entry.agentId === "user";
  const bubble = isUser ? "bg-primary/10" : (roleColors[entry.role] || "bg-secondary");
  const dot = isUser ? "bg-primary" : (roleDotColors[entry.role] || "bg-muted-foreground");
  const nameColor = isUser ? "text-primary" : (roleNameColors[entry.role] || "text-foreground");
  const info = agentInfo[entry.agentId];
  const roleLabel = info?.roleLabel;
  const isSpeaking = !isUser;

  return (
    <div className="animate-fade-in">
      <div className="flex items-center gap-2 mb-1.5">
        {isUser ? (
          <User className="w-3 h-3 text-primary" />
        ) : (
          <span className={`w-2 h-2 rounded-full ${dot}`} />
        )}
        <span className={`text-xs font-semibold ${nameColor}`}>
          {entry.agentName}
        </span>
        {roleLabel && (
          <span className="text-[10px] text-muted-foreground">
            {roleLabel}
          </span>
        )}
        {isSpeaking && <span className="text-[10px]">🎤</span>}
        <span className="text-[11px] text-muted-foreground ml-auto">
          {new Date(entry.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
        </span>
      </div>
      <div className={`ml-4 rounded-xl p-3 ${bubble}`}>
        <p className="text-[13px] text-foreground/90 leading-relaxed">{entry.text}</p>
      </div>
    </div>
  );
}

// ─── SPECIAL CARD RENDERER ───

function SpecialCardRenderer({
  card,
  onCastVote,
  userVote,
}: {
  card: SpecialCard;
  onCastVote: (v: VoteValue) => void;
  userVote?: VoteValue;
}) {
  switch (card.type) {
    case "alert":
      return (
        <div className="animate-fade-in ml-4">
          <div className="rounded-xl border border-warning/30 bg-warning/5 p-3 space-y-1">
            <p className="text-xs font-semibold text-warning flex items-center gap-1.5">
              {card.data.icon} {card.data.label}
            </p>
            <p className="text-sm font-medium text-foreground">{card.data.value}</p>
          </div>
        </div>
      );

    case "homework":
      return (
        <div className="animate-fade-in ml-4">
          <div className="rounded-xl border border-border bg-secondary/50 p-3 flex items-center gap-3">
            <Loader2 className="w-4 h-4 animate-spin text-primary" />
            <div>
              <p className="text-xs font-medium text-muted-foreground">HOMEWORK MODE</p>
              <p className="text-[13px] text-foreground">{card.data.text}</p>
            </div>
          </div>
        </div>
      );

    case "research":
      return (
        <div className="animate-fade-in ml-4">
          <div className="rounded-xl border border-success/30 bg-success/5 p-3 space-y-2">
            <p className="text-xs font-semibold text-success">📊 {card.data.title}</p>
            <div className="grid grid-cols-2 gap-1.5">
              {card.data.rows.map((row: { label: string; value: string }) => (
                <div key={row.label} className="flex items-center justify-between bg-background/50 rounded-lg px-2.5 py-1.5">
                  <span className="text-[11px] text-muted-foreground">{row.label}</span>
                  <span className="text-[11px] font-semibold text-foreground">{row.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      );

    case "vote-prompt":
      return (
        <div className="animate-fade-in ml-4">
          <div className="rounded-xl border border-border bg-card p-4 space-y-3 shadow-sm">
            <p className="text-xs font-medium text-muted-foreground">⚔️ Action Required</p>
            <p className="text-sm font-medium text-foreground">{card.data.motion}</p>
            <div className="flex flex-col gap-1.5">
              {card.data.options.map((opt: string) => (
                <Button
                  key={opt}
                  variant="outline"
                  size="sm"
                  className="justify-start text-xs"
                  onClick={() => {
                    if (opt.includes("Charge")) onCastVote("yes");
                    else if (opt.includes("Retreat")) onCastVote("no");
                    else onCastVote("abstain");
                  }}
                >
                  {opt}
                </Button>
              ))}
            </div>
          </div>
        </div>
      );

    case "vote-result": {
      const votes = card.data.votes as Record<string, string>;
      return (
        <div className="animate-fade-in ml-4">
          <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 space-y-3">
            <p className="text-xs font-semibold text-primary">MAJORITY VOTE</p>
            <p className="text-sm font-bold text-foreground">{card.data.result}</p>
            <div className="flex gap-2 flex-wrap">
              {Object.entries(votes).map(([agent, v]) => (
                <span
                  key={agent}
                  className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${
                    v === "yes" ? "bg-success/10 text-success" :
                    v === "no" ? "bg-destructive/10 text-destructive" :
                    "bg-muted text-muted-foreground"
                  }`}
                >
                  {agent}: {v === "yes" ? "⚔️ Charge" : v === "no" ? "🏃 Retreat" : "🗣️ Negotiate"}
                </span>
              ))}
            </div>
          </div>
        </div>
      );
    }

    case "dice":
      return (
        <div className="animate-fade-in ml-4 space-y-2">
          <div className="rounded-xl border border-border bg-card p-4 space-y-2 shadow-sm">
            <p className="text-xs text-muted-foreground">{card.data.roll}</p>
            <p className="text-lg font-bold text-foreground">{card.data.result}</p>
            <div
              className={`rounded-lg px-3 py-2 text-sm font-semibold ${
                card.data.success
                  ? "bg-success/10 text-success border border-success/20"
                  : "bg-destructive/10 text-destructive border border-destructive/20"
              }`}
            >
              {card.data.damage}
            </div>
          </div>
          {/* Death Knight HP bar */}
          {card.data.success && (
            <div className="rounded-xl border border-border bg-card p-3 space-y-1.5">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-muted-foreground">Death Knight HP</span>
                <span className="font-mono text-destructive">154 / 180</span>
              </div>
              <div className="h-2 rounded-full bg-secondary overflow-hidden">
                <div
                  className="h-full rounded-full bg-destructive transition-all duration-1000"
                  style={{ width: "85.5%" }}
                />
              </div>
            </div>
          )}
        </div>
      );

    default:
      return null;
  }
}
