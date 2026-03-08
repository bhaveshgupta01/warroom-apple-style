import { useState, useEffect, useCallback, useRef } from "react";
import type { WarRoomState, VoteValue, TranscriptEntry, Agent, VoteItem } from "@/types/warroom";
import { StatusBar } from "@/components/warroom/StatusBar";
import { VoiceControls } from "@/components/warroom/VoiceControls";
import { WarTable } from "@/components/warroom/WarTable";
import { ChatPanel } from "@/components/warroom/ChatPanel";
import { LeftSidebar } from "@/components/warroom/LeftSidebar";
import { ThemeToggle } from "@/components/ThemeToggle";

// ─── HELLFIRE CLUB AGENTS ───
const HELLFIRE_AGENTS: Agent[] = [
  { id: "mike", name: "Mike", role: "chairperson", avatar: "", speakingState: "idle", isHandRaised: false },
  { id: "dustin", name: "Dustin", role: "analyst", avatar: "", speakingState: "idle", isHandRaised: false },
  { id: "lucas", name: "Lucas", role: "critic", avatar: "", speakingState: "idle", isHandRaised: false },
  { id: "will", name: "Will", role: "advocate", avatar: "", speakingState: "idle", isHandRaised: false },
];

// ─── SCRIPTED EVENTS ───
interface ScriptEvent {
  delay: number; // ms from start
  type: "message" | "alert" | "homework-start" | "homework-end" | "research" | "vote" | "vote-result" | "dice" | "danger";
  agentId?: string;
  text?: string;
  data?: any;
}

const SCRIPT: ScriptEvent[] = [
  {
    delay: 0, type: "message", agentId: "mike",
    text: "The heavy stone doors groan open. In the center stands the Altar of Shadows. And guarding it... is a Death Knight.",
  },
  {
    delay: 3000, type: "message", agentId: "dustin",
    text: "A Death Knight?! Mike, we're barely at half HP! I'm out of 2nd-level spell slots!",
  },
  {
    delay: 3500, type: "alert",
    data: { icon: "⚠️", label: "Party HP Critical", value: "24 / 45" },
  },
  {
    delay: 6000, type: "message", agentId: "lucas",
    text: "I still have my wrist rocket. If I can hit the knight in the visor—",
  },
  {
    delay: 9000, type: "message", agentId: "will",
    text: "Lucas, a slingshot isn't going to stop a Death Knight. We need a real plan.",
  },
  {
    delay: 12000, type: "homework-start", agentId: "dustin",
    text: "🔍 Researching: Death Knight — AC, Weaknesses, Spell Resistance...",
  },
  {
    delay: 16000, type: "homework-end", agentId: "dustin",
    text: "I'm back! Death Knights are immune to poison, resistant to necrotic. But they're VULNERABLE to radiant damage. Use your Paladin smite!",
  },
  {
    delay: 16500, type: "research",
    data: {
      title: "Death Knight — Stats",
      rows: [
        { label: "AC", value: "20" },
        { label: "HP", value: "180" },
        { label: "Weakness", value: "Radiant ⚡" },
        { label: "Immune", value: "Poison, Necrotic" },
      ],
    },
  },
  {
    delay: 20000, type: "message", agentId: "mike",
    text: "The Knight raises its rusted blade. It glows with sickly purple light.",
  },
  {
    delay: 20500, type: "danger",
    data: { level: "RED" },
  },
  {
    delay: 23000, type: "alert", agentId: "lucas",
    data: { icon: "🚨", label: "Resource Warning", value: "Last 2nd-level spell slot. Recommend: Divine Smite + Shield combo" },
  },
  {
    delay: 26000, type: "vote",
    data: {
      motion: "Charge the Death Knight with Divine Smite?",
      options: ["⚔️ Charge (Smite)", "🏃 Retreat", "🗣️ Negotiate"],
    },
  },
  {
    delay: 27500, type: "vote-result",
    data: {
      votes: { mike: "yes", dustin: "yes", lucas: "no", will: "abstain" },
      result: "⚔️ CHARGE WITH DIVINE SMITE",
    },
  },
  {
    delay: 30000, type: "dice",
    data: {
      roll: "Rolling d20 + Charisma...",
      result: "🎲 18 + 4 = 22 vs Death Knight AC 20",
      success: true,
      damage: "✅ HIT! Divine Smite: 4d8 Radiant = 26 damage!",
    },
  },
];

const AGENT_INFO: Record<string, { name: string; roleLabel: string }> = {
  mike: { name: "Mike", roleLabel: "DM / Dungeon Master" },
  dustin: { name: "Dustin", roleLabel: "Stats & Strategy" },
  lucas: { name: "Lucas", roleLabel: "Tactical Realist" },
  will: { name: "Will", roleLabel: "The Artist" },
};

export default function WarRoom() {
  const [state, setState] = useState<WarRoomState>({
    sessionStatus: "active",
    agents: HELLFIRE_AGENTS,
    transcript: [],
    currentVote: null,
    documents: [],
    isMicActive: false,
    isSpeakerActive: true,
  });
  const [userVote, setUserVote] = useState<VoteValue | undefined>();
  const [sessionSeconds, setSessionSeconds] = useState(1150); // starts at 19:10
  const [isHandRaised, setIsHandRaised] = useState(false);
  // Special cards shown inline in chat
  const [specialCards, setSpecialCards] = useState<Array<{ id: string; type: string; data: any; timestamp: number }>>([]);
  const [homeworkActive, setHomeworkActive] = useState(false);
  const [dangerLevel, setDangerLevel] = useState<string | null>(null);
  const timeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`;
  };

  // Timer
  useEffect(() => {
    const id = setInterval(() => setSessionSeconds((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, []);

  // Auto-play script
  useEffect(() => {
    const ts: ReturnType<typeof setTimeout>[] = [];

    SCRIPT.forEach((event) => {
      const t = setTimeout(() => {
        switch (event.type) {
          case "message": {
            const info = AGENT_INFO[event.agentId!];
            // Set speaking state
            setState((prev) => ({
              ...prev,
              agents: prev.agents.map((a) =>
                a.id === event.agentId
                  ? { ...a, speakingState: "speaking" }
                  : { ...a, speakingState: "idle" }
              ),
              transcript: [
                ...prev.transcript,
                {
                  id: `msg-${event.delay}`,
                  agentId: event.agentId!,
                  agentName: info?.name || event.agentId!,
                  role: HELLFIRE_AGENTS.find((a) => a.id === event.agentId)?.role || "analyst",
                  text: event.text!,
                  timestamp: Date.now(),
                },
              ],
            }));
            // Stop speaking after 2.5s
            const stopT = setTimeout(() => {
              setState((prev) => ({
                ...prev,
                agents: prev.agents.map((a) =>
                  a.id === event.agentId ? { ...a, speakingState: "idle" } : a
                ),
              }));
            }, 2500);
            ts.push(stopT);
            break;
          }
          case "alert": {
            if (event.agentId === "lucas") {
              setState((prev) => ({
                ...prev,
                agents: prev.agents.map((a) =>
                  a.id === "lucas" ? { ...a, isHandRaised: true } : a
                ),
              }));
            }
            setSpecialCards((prev) => [
              ...prev,
              { id: `alert-${event.delay}`, type: "alert", data: event.data, timestamp: Date.now() },
            ]);
            break;
          }
          case "homework-start": {
            setHomeworkActive(true);
            setState((prev) => ({
              ...prev,
              agents: prev.agents.map((a) =>
                a.id === "dustin" ? { ...a, speakingState: "thinking" } : a
              ),
            }));
            setSpecialCards((prev) => [
              ...prev,
              { id: `hw-${event.delay}`, type: "homework", data: { text: event.text }, timestamp: Date.now() },
            ]);
            break;
          }
          case "homework-end": {
            setHomeworkActive(false);
            const info = AGENT_INFO[event.agentId!];
            setState((prev) => ({
              ...prev,
              agents: prev.agents.map((a) =>
                a.id === "dustin" ? { ...a, speakingState: "speaking" } : a
              ),
              transcript: [
                ...prev.transcript,
                {
                  id: `msg-${event.delay}`,
                  agentId: event.agentId!,
                  agentName: info?.name || "Dustin",
                  role: "analyst",
                  text: event.text!,
                  timestamp: Date.now(),
                },
              ],
            }));
            const stopT = setTimeout(() => {
              setState((prev) => ({
                ...prev,
                agents: prev.agents.map((a) =>
                  a.id === "dustin" ? { ...a, speakingState: "idle" } : a
                ),
              }));
            }, 2500);
            ts.push(stopT);
            break;
          }
          case "research": {
            setSpecialCards((prev) => [
              ...prev,
              { id: `research-${event.delay}`, type: "research", data: event.data, timestamp: Date.now() },
            ]);
            break;
          }
          case "danger": {
            setDangerLevel(event.data.level);
            break;
          }
          case "vote": {
            setState((prev) => ({
              ...prev,
              currentVote: {
                id: "vote-hellfire",
                motion: event.data.motion,
                votes: {},
                status: "open",
              },
            }));
            setSpecialCards((prev) => [
              ...prev,
              { id: `vote-${event.delay}`, type: "vote-prompt", data: event.data, timestamp: Date.now() },
            ]);
            break;
          }
          case "vote-result": {
            setState((prev) => ({
              ...prev,
              currentVote: prev.currentVote
                ? { ...prev.currentVote, votes: event.data.votes, status: "closed" }
                : null,
            }));
            setSpecialCards((prev) => [
              ...prev,
              { id: `vr-${event.delay}`, type: "vote-result", data: event.data, timestamp: Date.now() },
            ]);
            break;
          }
          case "dice": {
            setSpecialCards((prev) => [
              ...prev,
              { id: `dice-${event.delay}`, type: "dice", data: event.data, timestamp: Date.now() },
            ]);
            break;
          }
        }
      }, event.delay);
      ts.push(t);
    });

    timeoutsRef.current = ts;
    return () => ts.forEach(clearTimeout);
  }, []);

  const handleCastVote = useCallback((value: VoteValue) => {
    setUserVote(value);
    setState((prev) => ({
      ...prev,
      currentVote: prev.currentVote
        ? { ...prev.currentVote, votes: { ...prev.currentVote.votes, user: value } }
        : null,
    }));
  }, []);

  const handleUpload = useCallback((file: File) => {
    const docId = `doc-${Date.now()}`;
    setState((prev) => ({
      ...prev,
      documents: [...prev.documents, { id: docId, name: file.name, status: "uploading" }],
    }));
    setTimeout(() => {
      setState((prev) => ({
        ...prev,
        documents: prev.documents.map((d) =>
          d.id === docId ? { ...d, status: "analyzed", summary: `Analyzed ${file.name}` } : d
        ),
      }));
    }, 2000);
  }, []);

  const handleUserMessage = useCallback((text: string) => {
    setState((prev) => ({
      ...prev,
      transcript: [
        ...prev.transcript,
        {
          id: `user-${Date.now()}`,
          agentId: "user",
          agentName: "You",
          role: "chairperson" as const,
          text,
          timestamp: Date.now(),
        },
      ],
    }));
  }, []);

  const handleToggleMic = useCallback(() => {
    setState((prev) => ({ ...prev, isMicActive: !prev.isMicActive }));
  }, []);

  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden">
      <LeftSidebar currentAgents={state.agents} />

      {/* Hellfire Club Header */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-border bg-card">
        <div className="flex items-center gap-3 ml-12">
          <span className="text-2xl">🎲</span>
          <div>
            <h1 className="text-sm font-semibold text-foreground tracking-tight">The Hellfire Club</h1>
            <p className="text-[11px] text-muted-foreground">D&D War Room</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          {dangerLevel && (
            <span className="text-[11px] font-semibold text-destructive animate-pulse">
              🔴 DANGER: {dangerLevel}
            </span>
          )}
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-destructive animate-pulse" />
            <span className="text-xs font-medium text-destructive">LIVE SESSION</span>
          </div>
          <span className="text-xs font-mono text-muted-foreground">{formatTime(sessionSeconds)}</span>
          <ThemeToggle />
        </div>
      </div>

      <StatusBar
        status={state.sessionStatus}
        agentCount={state.agents.length}
        sessionTime={formatTime(sessionSeconds)}
      />

      {/* Main layout */}
      <div className="flex-1 flex overflow-hidden">
        <div className="flex-1 flex flex-col min-w-0">
          <WarTable
            agents={state.agents}
            documents={state.documents}
            onUpload={handleUpload}
            sessionStatus={state.sessionStatus}
            bgImage=""
          />
          <VoiceControls
            isMicActive={state.isMicActive}
            isSpeakerActive={state.isSpeakerActive}
            isHandRaised={isHandRaised}
            sessionActive={true}
            onToggleMic={handleToggleMic}
            onToggleSpeaker={() => setState((p) => ({ ...p, isSpeakerActive: !p.isSpeakerActive }))}
            onRaiseHand={() => setIsHandRaised((h) => !h)}
            onStartSession={() => {}}
            onEndSession={() => {}}
          />
        </div>

        <div className="w-96 border-l border-border shrink-0">
          <ChatPanel
            entries={state.transcript}
            vote={state.currentVote}
            userVote={userVote}
            onCastVote={handleCastVote}
            onSendMessage={handleUserMessage}
            specialCards={specialCards}
            homeworkActive={homeworkActive}
            agentInfo={AGENT_INFO}
          />
        </div>
      </div>
    </div>
  );
}
