import { useState, useRef, useEffect } from "react";
import { Send, BrainCircuit, Sparkles, Link2, ChevronDown, ImagePlus, Camera, X, Mic, Square, Menu, Plus, Edit3, Check, ArrowUp } from "lucide-react";
import { useAccent } from "../AccentContext";
import { useApp } from "../AppContext";
import { askCoach, matchAlliances, matchLabel, searchTeams, teamAwards, teamEvents, teamMatches, type CoachSource, type RoboAward, type RoboEvent, type RoboMatch } from "../../../services/api";
import { downscaleImage, readFileAsDataUrl, extractVideoFrames } from "../media";

type Attachment = { id: string; kind: "image" | "video"; preview: string; images: string[] };
type Message = { role: "user" | "ai"; text: string; time: string; sources?: CoachSource[]; images?: string[] };
type CoachSession = { id: string; title: string; messages: Message[]; createdAt: number; updatedAt: number };
type SpeechRecognitionLike = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: { resultIndex?: number; results: ArrayLike<{ 0: { transcript: string }; isFinal: boolean }> }) => void) | null;
  onend: (() => void) | null;
  onerror: ((event: { error?: string }) => void) | null;
  start: () => void;
  stop: () => void;
};

const quickPrompts = [
  "How do I improve my autonomous?",
  "Best alliance partner strategies?",
  "Fix my drivetrain pulling to one side",
  "Common beginner mistakes?",
  "Endgame hang tips?",
  "Analyze my robot from a photo",
];

function getTime() {
  return new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

const COACH_KEY = "matchmind:coach-sessions:v1";
const LEGACY_COACH_KEY = "robolab:coach-sessions:v1";

function sid() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function starterMessage(): Message {
  return {
    role: "ai",
    text: "Hey! I'm **MatchMind AI**. Ask me anything — strategy, autonomous, driver skills, alliance picks, or robot fixes. You can also attach a **photo or video** of your robot and I'll tell you what to improve. 🤖",
    time: getTime(),
  };
}

function titleFromMessage(text: string) {
  const cleaned = text.replace(/\s+/g, " ").trim();
  if (!cleaned) return "New chat";
  return cleaned.length > 34 ? `${cleaned.slice(0, 34).trim()}...` : cleaned;
}

function newSession(title = "New chat"): CoachSession {
  const now = Date.now();
  return { id: sid(), title, messages: [starterMessage()], createdAt: now, updatedAt: now };
}

function loadSessions(): CoachSession[] {
  if (typeof window === "undefined") return [newSession()];
  try {
    const raw = window.localStorage.getItem(COACH_KEY) ?? window.localStorage.getItem(LEGACY_COACH_KEY);
    const parsed = raw ? JSON.parse(raw) as CoachSession[] : [];
    const valid = Array.isArray(parsed)
      ? parsed.filter((s) => s?.id && Array.isArray(s.messages)).map((s) => ({
          ...s,
          title: s.title || "New chat",
          createdAt: s.createdAt || Date.now(),
          updatedAt: s.updatedAt || s.createdAt || Date.now(),
        }))
      : [];
    return valid.length ? valid.sort((a, b) => b.updatedAt - a.updatedAt) : [newSession()];
  } catch {
    return [newSession()];
  }
}

function shortDate(value?: string | null) {
  if (!value) return "TBD";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? "TBD" : d.toLocaleDateString([], { month: "short", day: "numeric" });
}

function awardTitle(award: RoboAward) {
  return award.title ?? award.name ?? "Award";
}

function scoreForTeam(match: RoboMatch, teamNumber: string) {
  const { red, blue, redTeams, blueTeams } = matchAlliances(match);
  const redScore = Number(red?.score);
  const blueScore = Number(blue?.score);
  if (Number.isNaN(redScore) || Number.isNaN(blueScore)) return null;
  const isRed = redTeams.some((t) => t.number === teamNumber);
  const isBlue = blueTeams.some((t) => t.number === teamNumber);
  if (!isRed && !isBlue) return null;
  const ours = isRed ? redScore : blueScore;
  const theirs = isRed ? blueScore : redScore;
  return { ours, theirs, won: ours > theirs };
}

function teamStats(matches: RoboMatch[], teamNumber: string) {
  const scored = matches.map((m) => scoreForTeam(m, teamNumber)).filter((s): s is NonNullable<typeof s> => Boolean(s));
  const wins = scored.filter((s) => s.won).length;
  const losses = scored.length - wins;
  const avg = scored.length ? Math.round(scored.reduce((sum, s) => sum + s.ours, 0) / scored.length) : null;
  const max = scored.length ? Math.max(...scored.map((s) => s.ours)) : null;
  const winRate = scored.length ? Math.round((wins / scored.length) * 100) : null;
  return { scored, wins, losses, avg, max, winRate };
}

function extractTeamNumber(text: string) {
  return text.toUpperCase().match(/\b\d{1,6}[A-Z]{1,3}\b/)?.[0] ?? "";
}

function escapeHtml(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function mdToHtml(text: string, accent: string) {
  const lines = escapeHtml(text).replace(/\r/g, "").split("\n");
  const inline = (s: string) =>
    s
      .replace(/\*\*(.+?)\*\*/g, `<strong style="color:${accent}">$1</strong>`)
      .replace(/`([^`]+)`/g, '<code style="background:rgba(255,255,255,0.1);padding:1px 5px;border-radius:4px;font-family:monospace;font-size:11.5px">$1</code>')
      .replace(/\[(\d+)\]/g, `<sup style="color:${accent};font-weight:700">[$1]</sup>`);
  let html = "";
  let inList = false;
  for (const raw of lines) {
    const line = raw.trim();
    const bullet = line.match(/^[-*]\s+(.*)/) || line.match(/^\d+\.\s+(.*)/);
    if (bullet) {
      if (!inList) { html += '<ul style="margin:4px 0;padding-left:16px;display:flex;flex-direction:column;gap:3px">'; inList = true; }
      html += `<li>${inline(bullet[1])}</li>`;
      continue;
    }
    if (inList) { html += "</ul>"; inList = false; }
    if (!line) { html += '<div style="height:6px"></div>'; continue; }
    const heading = line.match(/^(#{1,3})\s+(.*)/);
    if (heading) { html += `<div style="font-weight:800;margin-top:6px;color:#f0f2f8">${inline(heading[2])}</div>`; continue; }
    if (/^confidence:/i.test(line)) continue; // never show confidence
    html += `<div style="margin:2px 0">${inline(line)}</div>`;
  }
  if (inList) html += "</ul>";
  return html;
}

function Sources({ sources, accent }: { sources: CoachSource[]; accent: string }) {
  const [open, setOpen] = useState(false);
  if (!sources.length) return null;
  return (
    <div style={{ paddingLeft: 36, marginTop: 6 }}>
      <button onClick={() => setOpen((o) => !o)} style={{ display: "inline-flex", alignItems: "center", gap: 5, background: `${accent}12`, border: `1px solid ${accent}35`, borderRadius: 14, padding: "4px 10px", color: accent, fontFamily: "'Inter', sans-serif", fontSize: 11, fontWeight: 600, cursor: "pointer" }}>
        <Link2 size={12} /> Sources ({sources.length})
        <ChevronDown size={12} style={{ transform: open ? "rotate(180deg)" : "none", transition: "0.2s" }} />
      </button>
      {open ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 5, marginTop: 6 }}>
          {sources.map((s, i) => (
            <a key={s.url} href={s.url} target="_blank" rel="noreferrer" style={{ display: "flex", gap: 6, alignItems: "flex-start", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10, padding: "8px 10px", fontFamily: "'Inter', sans-serif", fontSize: 12, color: "#d6dae6", textDecoration: "none" }}>
              <span style={{ color: accent, fontWeight: 700, flexShrink: 0 }}>[{i + 1}]</span>
              <span>{s.title}</span>
            </a>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function CoachPage() {
  const { accent } = useAccent();
  const { team, profile } = useApp();
  const [sessions, setSessions] = useState<CoachSession[]>(loadSessions);
  const [activeSessionId, setActiveSessionId] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [renameId, setRenameId] = useState<string | null>(null);
  const [titleDraft, setTitleDraft] = useState("");
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [processing, setProcessing] = useState(false);
  const [listening, setListening] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [robotEventsData, setRobotEventsData] = useState<{ events: RoboEvent[]; matches: RoboMatch[]; awards: RoboAward[] }>({ events: [], matches: [], awards: [] });
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const voiceChunksRef = useRef<Blob[]>([]);
  const voiceMimeRef = useRef("audio/webm");
  const inputRef = useRef("");
  const voiceBaseRef = useRef("");
  const voiceFinalRef = useRef("");
  const manualStopRef = useRef(false);
  const voiceSendAfterStopRef = useRef(false);
  const voiceRestartTimerRef = useRef<number | null>(null);
  const recordingTimerRef = useRef<number | null>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const taRef = useRef<HTMLTextAreaElement>(null);
  const activeSession = sessions.find((s) => s.id === activeSessionId) ?? sessions[0];
  const messages = activeSession?.messages ?? [];

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping, attachments]);

  useEffect(() => {
    inputRef.current = input;
  }, [input]);

  useEffect(() => () => {
    manualStopRef.current = true;
    if (voiceRestartTimerRef.current) window.clearTimeout(voiceRestartTimerRef.current);
    if (recordingTimerRef.current) window.clearInterval(recordingTimerRef.current);
    stopMicStream();
    try { recognitionRef.current?.stop(); } catch { /* ignore */ }
    try { if (mediaRecorderRef.current?.state !== "inactive") mediaRecorderRef.current?.stop(); } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    if (!activeSessionId && sessions[0]) setActiveSessionId(sessions[0].id);
  }, [activeSessionId, sessions]);

  useEffect(() => {
    try { window.localStorage.setItem(COACH_KEY, JSON.stringify(sessions)); } catch { /* ignore */ }
  }, [sessions]);

  // Auto-grow the textarea (expands upward because the bar is anchored at the bottom)
  useEffect(() => {
    const ta = taRef.current;
    if (!ta) return;
    ta.style.height = "0px";
    ta.style.height = Math.min(ta.scrollHeight, 120) + "px";
  }, [input]);

  useEffect(() => {
    let alive = true;
    if (!team) {
      setRobotEventsData({ events: [], matches: [], awards: [] });
      return;
    }
    Promise.all([teamEvents(team.id), teamMatches(team.id), teamAwards(team.id)])
      .then(([events, matches, awards]) => {
        if (alive) setRobotEventsData({ events, matches, awards });
      })
      .catch(() => {
        if (alive) setRobotEventsData({ events: [], matches: [], awards: [] });
      });
    return () => { alive = false; };
  }, [team?.id]);

  function updateSessionMessages(sessionId: string, updater: (prev: Message[]) => Message[]) {
    setSessions((prev) => prev.map((session) => {
      if (session.id !== sessionId) return session;
      const nextMessages = updater(session.messages);
      const firstUser = nextMessages.find((m) => m.role === "user")?.text ?? "";
      const nextTitle = session.title === "New chat" && firstUser ? titleFromMessage(firstUser) : session.title;
      return { ...session, title: nextTitle, messages: nextMessages, updatedAt: Date.now() };
    }).sort((a, b) => b.updatedAt - a.updatedAt));
  }

  function startNewChat() {
    const session = newSession();
    setSessions((prev) => [session, ...prev]);
    setActiveSessionId(session.id);
    setSidebarOpen(false);
    setInput("");
    setAttachments([]);
  }

  function renameSession(id: string, title: string) {
    const clean = title.trim() || "New chat";
    setSessions((prev) => prev.map((session) => session.id === id ? { ...session, title: clean, updatedAt: Date.now() } : session));
    setRenameId(null);
  }

  function platformContext() {
    const now = Date.now();
    const stats = team ? teamStats(robotEventsData.matches, team.number) : null;
    const recentMatches = team ? robotEventsData.matches.slice(0, 8).map((match) => {
      const score = scoreForTeam(match, team.number);
      return `${matchLabel(match)}${match.event?.name ? ` at ${match.event.name}` : ""}: ${score ? `${score.won ? "win" : "loss"} ${score.ours}-${score.theirs}` : "scheduled/unscored"}`;
    }).join("; ") : "";

    // Next upcoming match (field, time, opponents, partner) for match-aware answers.
    let nextMatchLine = "";
    if (team) {
      const upcoming = robotEventsData.matches
        .filter((m) => !m.scored && m.scheduled && new Date(m.scheduled).getTime() >= now - 3_600_000)
        .sort((a, b) => new Date(a.scheduled as string).getTime() - new Date(b.scheduled as string).getTime());
      const nm = upcoming[0];
      if (nm) {
        const { redTeams, blueTeams } = matchAlliances(nm);
        const onRed = redTeams.some((t) => t.number === team.number);
        const opp = (onRed ? blueTeams : redTeams).map((t) => t.number).filter(Boolean).join(", ");
        const partner = (onRed ? redTeams : blueTeams).map((t) => t.number).filter((n) => n && n !== team.number).join(", ");
        const when = nm.scheduled ? new Date(nm.scheduled).toLocaleString([], { weekday: "short", hour: "numeric", minute: "2-digit" }) : "time TBD";
        nextMatchLine = `NEXT MATCH (soon): ${matchLabel(nm)}${nm.field ? ` on ${nm.field}` : ""} at ${when}${nm.event?.name ? ` (${nm.event.name})` : ""}. We are ${onRed ? "Red" : "Blue"}, partner ${partner || "TBD"}, vs ${opp || "TBD"}.`;
      }
    }

    // Next upcoming tournament.
    const upcomingEvents = robotEventsData.events
      .filter((e) => e.start && new Date(e.end || e.start).getTime() >= now)
      .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());
    const ne = upcomingEvents[0];
    const nextEventLine = ne ? `NEXT TOURNAMENT: ${ne.name} on ${shortDate(ne.start)}${ne.location?.city ? ` in ${ne.location.city}` : ""}.` : "";

    const parts = [
      `Today is ${new Date().toLocaleDateString([], { weekday: "long", month: "long", day: "numeric", year: "numeric" })}.`,
      team ? `Our team: ${team.number} ${team.team_name} (${team.organization}), program ${team.program?.code ?? "VEX"}.` : "No team selected yet.",
      profile?.name ? `User: ${profile.name}.` : "",
      nextMatchLine,
      nextEventLine,
      stats && stats.scored.length ? `Official RobotEvents stats for ${team?.number}: ${stats.wins} wins, ${stats.losses} losses, ${stats.winRate}% win rate, ${stats.avg ?? "unknown"} average score, ${stats.max ?? "unknown"} max score.` : "",
      robotEventsData.events.length ? `Recent RobotEvents events: ${robotEventsData.events.slice(0, 6).map((e) => `${e.name} (${shortDate(e.start)})`).join("; ")}.` : "",
      robotEventsData.awards.length ? `RobotEvents awards: ${robotEventsData.awards.slice(0, 6).map(awardTitle).join("; ")}.` : "",
      recentMatches ? `Recent matches: ${recentMatches}.` : "",
      "Use official RobotEvents data and saved MatchMind context when available. If a team fact is missing, say the data is missing instead of guessing. If the next match is soon, naturally acknowledge it.",
    ];
    return parts.filter(Boolean).join(" ");
  }

  async function groundedTeamAnswer(text: string): Promise<{ answer: string; sources: CoachSource[] } | null> {
    const number = extractTeamNumber(text);
    if (!number) return null;
    const teams = await searchTeams(number);
    const exact = teams.find((t) => t.number.toUpperCase() === number) ?? teams[0];
    if (!exact) return null;

    const [events, matches, awards] = await Promise.all([
      teamEvents(exact.id),
      teamMatches(exact.id),
      teamAwards(exact.id),
    ]);
    const stats = teamStats(matches, exact.number);
    const recent = matches
      .filter((match) => scoreForTeam(match, exact.number))
      .slice(0, 5)
      .map((match) => {
        const score = scoreForTeam(match, exact.number);
        return `${matchLabel(match)}: ${score?.won ? "win" : "loss"} ${score?.ours}-${score?.theirs}${match.event?.name ? ` at ${match.event.name}` : ""}`;
      });
    const currentEvents = events.slice(0, 5).map((event) => `${event.name} (${shortDate(event.start)})`);
    const awardLine = awards.length
      ? awards.slice(0, 5).map((award) => `${awardTitle(award)}${award.event?.name ? ` at ${award.event.name}` : ""}`).join("; ")
      : "0 awards found in official RobotEvents data for this view";

    const statLine = stats.scored.length
      ? `${stats.wins}-${stats.losses} record, ${stats.winRate}% win rate, ${stats.avg ?? "unknown"} average score, ${stats.max ?? "unknown"} max score across ${stats.scored.length} scored matches`
      : "not enough scored matches were found for a reliable win-rate summary";
    const answer = [
      `**${exact.number} ${exact.team_name || "Team"}** is listed as ${exact.organization || "organization unavailable"}${exact.location?.city || exact.location?.region ? ` in ${[exact.location?.city, exact.location?.region].filter(Boolean).join(", ")}` : ""}.`,
      `Official RobotEvents summary: ${statLine}.`,
      currentEvents.length ? `Recent/current events I found: ${currentEvents.join("; ")}.` : "I did not find recent event records for this team in the current RobotEvents response.",
      `Awards: ${awardLine}.`,
      recent.length ? `Recent scored matches: ${recent.join("; ")}.` : "Recent scored match detail is limited, so confidence is medium-low.",
      "Recommendation: use this official data with your MatchMind scout notes before making alliance or match-strategy decisions.",
    ].join("\n\n");
    return {
      answer,
      sources: [
        { title: `RobotEvents team ${exact.number}`, url: `https://www.robotevents.com/teams/V5RC/${encodeURIComponent(exact.number)}`, blurb: "Official team identity and competition records." },
      ],
    };
  }

  async function onFiles(list: FileList | null) {
    if (!list || !list.length) return;
    setProcessing(true);
    try {
      const next: Attachment[] = [];
      for (const file of Array.from(list).slice(0, 4)) {
        if (file.type.startsWith("video")) {
          const frames = await extractVideoFrames(file);
          if (frames.length) next.push({ id: `a${Date.now()}${next.length}`, kind: "video", preview: frames[0], images: frames });
        } else if (file.type.startsWith("image")) {
          const raw = await readFileAsDataUrl(file);
          const compressed = await downscaleImage(raw);
          next.push({ id: `a${Date.now()}${next.length}`, kind: "image", preview: compressed, images: [compressed] });
        }
      }
      setAttachments((cur) => [...cur, ...next].slice(0, 6));
    } finally {
      setProcessing(false);
    }
  }

  function stopMicStream() {
    mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
    mediaStreamRef.current = null;
  }

  function blobToDataUrl(blob: Blob) {
    return new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result ?? ""));
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(blob);
    });
  }

  async function stopAudioRecorder() {
    const recorder = mediaRecorderRef.current;
    mediaRecorderRef.current = null;
    if (!recorder || recorder.state === "inactive") return;
    await new Promise<void>((resolve) => {
      const fallback = window.setTimeout(resolve, 900);
      recorder.onstop = () => {
        window.clearTimeout(fallback);
        resolve();
      };
      try { recorder.stop(); } catch { resolve(); }
    });
  }

  function startAudioRecorder(stream: MediaStream) {
    voiceChunksRef.current = [];
    const mime = MediaRecorder.isTypeSupported?.("audio/webm;codecs=opus") ? "audio/webm;codecs=opus" : "audio/webm";
    voiceMimeRef.current = mime;
    try {
      const recorder = new MediaRecorder(stream, { mimeType: mime });
      recorder.ondataavailable = (event) => {
        if (event.data?.size) voiceChunksRef.current.push(event.data);
      };
      recorder.start(250);
      mediaRecorderRef.current = recorder;
    } catch {
      mediaRecorderRef.current = null;
    }
  }

  async function transcribeRecordedAudio() {
    if (!voiceChunksRef.current.length) return "";
    const blob = new Blob(voiceChunksRef.current, { type: voiceMimeRef.current });
    if (!blob.size) return "";
    await blobToDataUrl(blob);
    return "";
  }

  async function finishVoiceSession(shouldSend: boolean) {
    if (recordingTimerRef.current) {
      window.clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
    await stopAudioRecorder();
    stopMicStream();
    recognitionRef.current = null;
    setListening(false);
    setRecordingSeconds(0);
    if (!shouldSend) return;
    let text = inputRef.current.trim();
    if (!text) {
      try {
        text = await transcribeRecordedAudio();
      } catch {
        text = "";
      }
    }
    voiceChunksRef.current = [];
    if (text) {
      setInput(text);
      window.setTimeout(() => void send(text), 0);
    } else if (activeSession) {
      updateSessionMessages(activeSession.id, (prev) => [...prev, { role: "ai", text: "I could not understand that audio. Try recording again a little closer to the microphone, or type the message.", time: getTime() }]);
    }
  }

  function stopVoice(sendAfterStop = false) {
    manualStopRef.current = true;
    voiceSendAfterStopRef.current = sendAfterStop;
    if (voiceRestartTimerRef.current) {
      window.clearTimeout(voiceRestartTimerRef.current);
      voiceRestartTimerRef.current = null;
    }
    const recognition = recognitionRef.current;
    if (!recognition) {
      void finishVoiceSession(sendAfterStop);
      return;
    }
    try {
      recognition.stop();
    } catch {
      void finishVoiceSession(sendAfterStop);
    }
  }

  async function toggleVoice() {
    const win = window as unknown as { SpeechRecognition?: new () => SpeechRecognitionLike; webkitSpeechRecognition?: new () => SpeechRecognitionLike };
    if (listening) { stopVoice(false); return; }
    const SpeechRecognition = win.SpeechRecognition ?? win.webkitSpeechRecognition;
    try {
      if (navigator.mediaDevices?.getUserMedia) {
        mediaStreamRef.current = await navigator.mediaDevices.getUserMedia({ audio: true });
      }
    } catch {
      if (activeSession) updateSessionMessages(activeSession.id, (prev) => [...prev, { role: "ai", text: "I couldn't access your microphone. Allow mic access for this site, then tap the mic again.", time: getTime() }]);
      return;
    }
    if (!SpeechRecognition) {
      voiceBaseRef.current = input.trim();
      voiceFinalRef.current = "";
      manualStopRef.current = false;
      voiceSendAfterStopRef.current = false;
      if (mediaStreamRef.current) startAudioRecorder(mediaStreamRef.current);
      setListening(true);
      setRecordingSeconds(0);
      if (recordingTimerRef.current) window.clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = window.setInterval(() => setRecordingSeconds((seconds) => seconds + 1), 1000);
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";
    voiceBaseRef.current = input.trim();
    voiceFinalRef.current = "";
    manualStopRef.current = false;
    voiceSendAfterStopRef.current = false;
    recognition.onresult = (event) => {
      let interim = "";
      let finalText = voiceFinalRef.current;
      for (let i = event.resultIndex ?? 0; i < event.results.length; i++) {
        const item = event.results[i];
        if (item.isFinal) finalText += ` ${item[0].transcript}`;
        else interim += item[0].transcript;
      }
      voiceFinalRef.current = finalText.replace(/\s+/g, " ").trim();
      const spoken = `${voiceFinalRef.current} ${interim}`.replace(/\s+/g, " ").trim();
      if (spoken) setInput([voiceBaseRef.current, spoken].filter(Boolean).join(" "));
    };
    recognition.onerror = (event) => {
      const err = event?.error ?? "";
      // Permission/hardware errors should stop and inform; transient ones let onend restart.
      if (err === "not-allowed" || err === "service-not-allowed" || err === "audio-capture") {
        manualStopRef.current = true;
        voiceSendAfterStopRef.current = false;
        void finishVoiceSession(false);
        if (activeSession) updateSessionMessages(activeSession.id, (prev) => [...prev, { role: "ai", text: "I couldn't access your microphone. Allow mic access for this site (browser address bar) and tap the mic again.", time: getTime() }]);
      }
    };
    // Browsers fire onend after short silence even when continuous — auto-restart
    // so the mic stays on until the user taps it off.
    recognition.onend = () => {
      if (manualStopRef.current) {
        const shouldSend = voiceSendAfterStopRef.current;
        voiceSendAfterStopRef.current = false;
        void finishVoiceSession(shouldSend);
        return;
      }
      voiceRestartTimerRef.current = window.setTimeout(() => {
        try { recognition.start(); } catch { recognitionRef.current = null; setListening(false); }
      }, 180);
    };
    recognitionRef.current = recognition;
    if (mediaStreamRef.current) startAudioRecorder(mediaStreamRef.current);
    setListening(true);
    setRecordingSeconds(0);
    if (recordingTimerRef.current) window.clearInterval(recordingTimerRef.current);
    recordingTimerRef.current = window.setInterval(() => setRecordingSeconds((seconds) => seconds + 1), 1000);
    try { recognition.start(); } catch { void finishVoiceSession(false); }
  }

  const voiceTime = `${Math.floor(recordingSeconds / 60)}:${String(recordingSeconds % 60).padStart(2, "0")}`;

  const send = async (text: string) => {
    const q = text.trim();
    if ((!q && !attachments.length) || isTyping || !activeSession) return;
    const sessionId = activeSession.id;
    const sending = attachments;
    const images = sending.flatMap((a) => a.images);
    const previews = sending.map((a) => a.preview);
    const history = messages.map((m) => ({ role: (m.role === "ai" ? "assistant" : "user") as "assistant" | "user", content: m.text }));
    const userText = q || "Analyze the attached robot media and tell me what to fix.";
    updateSessionMessages(sessionId, (prev) => [...prev, { role: "user", text: userText, time: getTime(), images: previews }]);
    setInput("");
    setAttachments([]);
    setIsTyping(true);
    try {
      const grounded = images.length ? null : await groundedTeamAnswer(userText);
      if (grounded) {
        updateSessionMessages(sessionId, (prev) => [...prev, { role: "ai", text: grounded.answer, time: getTime(), sources: grounded.sources }]);
        return;
      }
      const result = await askCoach({ messages: [...history, { role: "user", content: userText }], context: platformContext(), images });
      updateSessionMessages(sessionId, (prev) => [...prev, { role: "ai", text: result.answer, time: getTime(), sources: result.sources }]);
    } catch (err) {
      updateSessionMessages(sessionId, (prev) => [...prev, { role: "ai", text: err instanceof Error ? err.message : "I could not reach the AI right now — please try again.", time: getTime() }]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100dvh", paddingBottom: "var(--rl-page-bottom)", position: "relative" }}>
      {/* Header */}
      <div style={{ padding: "var(--rl-page-top) 16px 12px", borderBottom: "1px solid rgba(255,255,255,0.06)", background: "rgba(10,11,20,0.8)", backdropFilter: "blur(12px)", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button onClick={() => setSidebarOpen((open) => !open)} style={{ width: 34, height: 34, borderRadius: 10, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0 }}>
            <Menu size={16} style={{ color: "#e8eaf0" }} />
          </button>
          <div style={{ width: 36, height: 36, borderRadius: "50%", background: `linear-gradient(135deg, ${accent} 0%, #7c3aed 100%)`, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: `0 0 16px ${accent}40` }}>
            <BrainCircuit size={17} style={{ color: "#fff" }} />
          </div>
          <div>
            <p style={{ fontFamily: "'Exo 2', sans-serif", fontWeight: 800, fontSize: "15px", color: "#e8eaf0", lineHeight: 1.1 }}>MatchMind AI</p>
            <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#10b981", boxShadow: "0 0 6px #10b981" }} />
              <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "10px", color: "#10b981" }}>Online · grounded in VEX Forum</span>
            </div>
          </div>
          <Sparkles size={16} style={{ color: accent, opacity: 0.7, marginLeft: "auto" }} />
        </div>
      </div>

      {sidebarOpen ? (
        <div style={{ position: "absolute", top: 0, bottom: "var(--rl-page-bottom)", left: 0, width: "82%", maxWidth: 326, background: "rgba(13,15,28,0.98)", borderRight: "1px solid rgba(255,255,255,0.1)", zIndex: 40, boxShadow: "20px 0 48px rgba(0,0,0,0.45)", display: "flex", flexDirection: "column" }}>
          <div style={{ padding: "var(--rl-page-top) 14px 12px", borderBottom: "1px solid rgba(255,255,255,0.06)", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
            <div>
              <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: "#7a80a0", letterSpacing: "0.1em" }}>SAVED AI CHATS</p>
              <p style={{ fontFamily: "'Exo 2', sans-serif", fontWeight: 800, fontSize: 17, color: "#e8eaf0" }}>MatchMind Coach</p>
            </div>
            <button onClick={startNewChat} style={{ width: 34, height: 34, borderRadius: 10, background: accent, border: "none", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", boxShadow: `0 0 14px ${accent}40` }}>
              <Plus size={17} style={{ color: "#08090f" }} />
            </button>
          </div>
          <div style={{ flex: 1, overflowY: "auto", padding: "10px 10px 18px", display: "flex", flexDirection: "column", gap: 8, scrollbarWidth: "none" }}>
            {sessions.map((session) => {
              const active = session.id === activeSession?.id;
              const renaming = renameId === session.id;
              return (
                <div key={session.id} style={{ background: active ? `${accent}16` : "rgba(255,255,255,0.035)", border: `1px solid ${active ? accent + "35" : "rgba(255,255,255,0.07)"}`, borderRadius: 13, padding: "10px 11px" }}>
                  {renaming ? (
                    <div style={{ display: "flex", gap: 7, alignItems: "center" }}>
                      <input
                        value={titleDraft}
                        onChange={(e) => setTitleDraft(e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter") renameSession(session.id, titleDraft); }}
                        autoFocus
                        style={{ flex: 1, minWidth: 0, background: "#181c2e", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 9, padding: "8px 9px", color: "#e8eaf0", fontFamily: "'Inter', sans-serif", fontSize: 12, outline: "none" }}
                      />
                      <button onClick={() => renameSession(session.id, titleDraft)} style={{ width: 30, height: 30, borderRadius: 9, background: accent, border: "none", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0 }}>
                        <Check size={14} style={{ color: "#08090f" }} />
                      </button>
                    </div>
                  ) : (
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <button onClick={() => { setActiveSessionId(session.id); setSidebarOpen(false); }} style={{ flex: 1, minWidth: 0, background: "transparent", border: "none", textAlign: "left", cursor: "pointer" }}>
                        <p style={{ fontFamily: "'Exo 2', sans-serif", fontWeight: 800, fontSize: 13, color: "#e8eaf0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{session.title}</p>
                        <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, color: "#7a80a0", marginTop: 3 }}>{new Date(session.updatedAt).toLocaleDateString([], { month: "short", day: "numeric" })} · {Math.max(0, session.messages.length - 1)} messages</p>
                      </button>
                      <button onClick={() => { setRenameId(session.id); setTitleDraft(session.title); }} style={{ width: 28, height: 28, borderRadius: 8, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0 }}>
                        <Edit3 size={12} style={{ color: "#7a80a0" }} />
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ) : null}

      {/* Messages */}
      <div style={{ flex: 1, overflowY: "auto", padding: "14px", display: "flex", flexDirection: "column", gap: 12, scrollbarWidth: "none", minHeight: 0 }}>
        {messages.map((msg, i) => (
          <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: msg.role === "user" ? "flex-end" : "flex-start" }}>
            {msg.role === "ai" ? (
              <div style={{ width: "100%" }}>
                <div style={{ display: "flex", alignItems: "flex-end", gap: 8 }}>
                  <div style={{ width: 28, height: 28, borderRadius: "50%", background: `linear-gradient(135deg, ${accent}, #7c3aed)`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginBottom: 2 }}>
                    <BrainCircuit size={13} style={{ color: "#fff" }} />
                  </div>
                  <div
                    style={{ maxWidth: "84%", padding: "11px 14px", borderRadius: "18px 18px 18px 4px", background: "#181c2e", border: "1px solid rgba(255,255,255,0.07)", fontFamily: "'Inter', sans-serif", fontSize: "13px", color: "#e8eaf0", lineHeight: 1.6, overflowWrap: "anywhere" }}
                    dangerouslySetInnerHTML={{ __html: mdToHtml(msg.text, accent) }}
                  />
                </div>
                {msg.sources?.length ? <Sources sources={msg.sources} accent={accent} /> : null}
              </div>
            ) : (
              <div style={{ maxWidth: "82%", display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6 }}>
                {msg.images?.length ? (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 5, justifyContent: "flex-end" }}>
                    {msg.images.map((src, k) => <img key={k} src={src} alt="" style={{ width: 76, height: 76, objectFit: "cover", borderRadius: 12, border: "1px solid rgba(255,255,255,0.1)" }} />)}
                  </div>
                ) : null}
                {msg.text ? (
                  <div style={{ padding: "11px 14px", borderRadius: "18px 18px 4px 18px", background: accent, fontFamily: "'Inter', sans-serif", fontSize: "13px", color: "#08090f", fontWeight: 500, lineHeight: 1.55 }}>{msg.text}</div>
                ) : null}
              </div>
            )}
            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "9px", color: "rgba(255,255,255,0.2)", marginTop: 4, paddingLeft: msg.role === "ai" ? 36 : 0 }}>{msg.time}</span>
          </div>
        ))}

        {isTyping && (
          <div style={{ display: "flex", alignItems: "flex-end", gap: 8 }}>
            <div style={{ width: 28, height: 28, borderRadius: "50%", background: `linear-gradient(135deg, ${accent}, #7c3aed)`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <BrainCircuit size={13} style={{ color: "#fff" }} />
            </div>
            <div style={{ background: "#181c2e", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "18px 18px 18px 4px", padding: "12px 16px", display: "flex", gap: 5, alignItems: "center" }}>
              {[0, 1, 2].map((i) => (
                <div key={i} style={{ width: 7, height: 7, borderRadius: "50%", background: accent, opacity: 0.7, animation: `typingBounce 1.2s ${i * 0.18}s ease-in-out infinite` }} />
              ))}
            </div>
          </div>
        )}
        <div ref={endRef} />
      </div>

      {/* Quick prompts */}
      {messages.length <= 1 ? (
        <div style={{ padding: "4px 12px 6px", flexShrink: 0 }}>
          <div style={{ display: "flex", gap: 7, overflowX: "auto", scrollbarWidth: "none", paddingBottom: 2 }}>
            {quickPrompts.map((qp) => (
              <button key={qp} onClick={() => send(qp)} style={{ flexShrink: 0, background: "rgba(255,255,255,0.04)", border: `1px solid ${accent}30`, borderRadius: "20px", padding: "6px 13px", fontFamily: "'Inter', sans-serif", fontSize: "11px", color: "rgba(255,255,255,0.7)", cursor: "pointer", whiteSpace: "nowrap" }}>{qp}</button>
            ))}
          </div>
        </div>
      ) : null}

      {/* Attachment tray */}
      {attachments.length || processing ? (
        <div style={{ padding: "4px 14px", display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", flexShrink: 0 }}>
          {processing ? <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: accent }}>Processing…</span> : null}
          {attachments.map((a) => (
            <div key={a.id} style={{ position: "relative", width: 52, height: 52 }}>
              <img src={a.preview} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: 10, border: "1px solid rgba(255,255,255,0.12)" }} />
              {a.kind === "video" ? <span style={{ position: "absolute", bottom: 2, left: 2, background: "rgba(0,0,0,0.65)", borderRadius: 5, padding: "0 4px", fontSize: 9, color: "#fff" }}>{a.images.length}f</span> : null}
              <button onClick={() => setAttachments((c) => c.filter((x) => x.id !== a.id))} style={{ position: "absolute", top: -6, right: -6, width: 18, height: 18, borderRadius: "50%", background: "#ff3b5c", border: "none", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}><X size={11} /></button>
            </div>
          ))}
        </div>
      ) : null}

      {/* Input bar */}
      <div style={{ padding: "6px 12px 10px", background: "rgba(10,11,20,0.9)", flexShrink: 0 }}>
        {listening ? (
          <div style={{ display: "flex", alignItems: "center", gap: 9, background: "#181c2e", border: `1px solid ${accent}35`, borderRadius: 20, padding: "8px 8px 8px 10px", boxShadow: `0 0 24px ${accent}12` }}>
            <button aria-label="Stop recording" onClick={() => stopVoice(false)} style={{ width: 40, height: 40, borderRadius: 14, background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.08)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0 }}>
              <Square size={14} style={{ color: "#ff3b5c", fill: "#ff3b5c" }} />
            </button>
            <div style={{ flex: 1, minWidth: 0, display: "flex", alignItems: "center", gap: 3, height: 36, overflow: "hidden" }}>
              {Array.from({ length: 42 }).map((_, i) => (
                <span key={i} style={{ width: 3, height: 8 + ((i * 7) % 22), borderRadius: 3, background: i > 28 ? accent : "rgba(255,255,255,0.55)", opacity: 0.85, transformOrigin: "center", animation: `voiceWave 0.9s ${(i % 9) * 0.05}s ease-in-out infinite`, flexShrink: 0 }} />
              ))}
            </div>
            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 800, fontSize: 13, color: accent, minWidth: 36, textAlign: "right" }}>{voiceTime}</span>
            <button
              aria-label="Send voice transcript"
              onClick={() => stopVoice(true)}
              disabled={isTyping || recordingSeconds < 1}
              style={{ width: 42, height: 42, borderRadius: 15, background: !isTyping && recordingSeconds >= 1 ? accent : "rgba(255,255,255,0.08)", border: "none", display: "flex", alignItems: "center", justifyContent: "center", cursor: !isTyping && recordingSeconds >= 1 ? "pointer" : "default", flexShrink: 0, boxShadow: !isTyping && recordingSeconds >= 1 ? `0 0 14px ${accent}55` : "none" }}
            >
              <ArrowUp size={18} style={{ color: !isTyping && recordingSeconds >= 1 ? "#08090f" : "rgba(255,255,255,0.25)" }} />
            </button>
          </div>
        ) : (
        <div style={{ display: "flex", gap: 6, background: "#181c2e", border: `1px solid ${accent}25`, borderRadius: 16, padding: "6px 6px 6px 8px", alignItems: "flex-end", boxShadow: `0 0 20px ${accent}08` }}>
          <label style={{ width: 34, height: 34, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0 }}>
            <ImagePlus size={17} style={{ color: "rgba(255,255,255,0.5)" }} />
            <input type="file" accept="image/*,video/*" multiple style={{ display: "none" }} onChange={(e) => { onFiles(e.target.files); e.currentTarget.value = ""; }} />
          </label>
          <label style={{ width: 34, height: 34, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0 }}>
            <Camera size={17} style={{ color: "rgba(255,255,255,0.5)" }} />
            <input type="file" accept="image/*" capture="environment" style={{ display: "none" }} onChange={(e) => { onFiles(e.target.files); e.currentTarget.value = ""; }} />
          </label>
          <button aria-label={listening ? "Stop voice input" : "Start voice input"} onClick={toggleVoice} style={{ width: 34, height: 34, borderRadius: 10, background: listening ? `${accent}20` : "transparent", border: listening ? `1px solid ${accent}35` : "none", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0 }}>
            <Mic size={17} style={{ color: "rgba(255,255,255,0.5)" }} />
          </button>
          <textarea
            ref={taRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); listening ? stopVoice(true) : send(input); } }}
            placeholder="Ask your coach anything..."
            rows={1}
            style={{ flex: 1, background: "transparent", border: "none", outline: "none", resize: "none", maxHeight: 120, fontFamily: "'Inter', sans-serif", fontSize: "13px", color: "#e8eaf0", padding: "8px 2px", lineHeight: 1.4 }}
          />
          <button
            aria-label={listening ? "Stop recording and send" : "Send message"}
            onClick={() => listening ? stopVoice(true) : send(input)}
            disabled={(!input.trim() && !attachments.length) || isTyping}
            style={{ width: 36, height: 36, borderRadius: 10, background: (input.trim() || attachments.length) && !isTyping ? accent : "rgba(255,255,255,0.06)", border: "none", display: "flex", alignItems: "center", justifyContent: "center", cursor: (input.trim() || attachments.length) && !isTyping ? "pointer" : "default", transition: "all 0.2s", flexShrink: 0, boxShadow: (input.trim() || attachments.length) && !isTyping ? `0 0 12px ${accent}50` : "none" }}
          >
            <Send size={15} style={{ color: (input.trim() || attachments.length) && !isTyping ? "#08090f" : "rgba(255,255,255,0.2)" }} />
          </button>
        </div>
        )}
      </div>

      <style>{`@keyframes typingBounce {0%,60%,100%{transform:translateY(0);opacity:0.5;}30%{transform:translateY(-6px);opacity:1;}} @keyframes voiceWave {0%,100%{transform:scaleY(0.45);opacity:0.45;}50%{transform:scaleY(1.35);opacity:1;}}`}</style>
    </div>
  );
}
