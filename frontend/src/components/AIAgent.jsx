import { useEffect, useRef, useState } from "react";
import mascot from "../assets/mascot.png";
import { api } from "../api.js";
import "./AIAgent.css";

const TOOL_NAMES = {
  choosing: "Tool Chooser",
  generate: "Image Generation",
  enhance: "Image Enhancement",
  video: "Video Generation",
  text: "Animated Text",
};
const QUICK_MESSAGES = {
  choosing: ["Which tool should I use?", "What can you do?", "Help me get started"],
  generate: ["Help me write a prompt", "What can I generate?", "How do I use this?"],
  enhance: ["How do I enhance an image?", "What does this tool do?"],
  video: ["How do I create a video?", "What images should I select?"],
  text: ["How do I animate text?", "Which effect should I use?"],
};

function getToolName(stage, feature) {
  return stage === "choosing" ? TOOL_NAMES.choosing : TOOL_NAMES[feature] || "RANANO Studio";
}
function normalizeIntent(intent) {
  if (!intent) return null;
  const value = String(intent).toLowerCase().trim().replace(/[\s-]+/g, "_");
  if (value.includes("generate") || value.includes("image_generation") || value === "image") return "generate";
  if (value.includes("enhance")) return "enhance";
  if (value.includes("video") || value.includes("movie")) return "video";
  if (value.includes("animated_text") || value.includes("animate_text") || value === "text") return "text";
  return null;
}
function shouldNavigate(message) {
  const value = String(message || "").toLowerCase().trim();
  return ["take me", "open", "go to", "show me", "bring me", "navigate", "let's go", "lets go", "switch to", "move to", "bring up", "load"].some((phrase) => value.includes(phrase));
}
function speak(text, onStatus) {
  if (!("speechSynthesis" in window)) { onStatus?.("Voice output is not supported in this browser."); return; }
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = 0.95;
  utterance.pitch = 1.08;
  utterance.volume = 1;
  utterance.onstart = () => onStatus?.("Speaking response…");
  utterance.onend = () => onStatus?.("");
  utterance.onerror = () => onStatus?.("Voice playback failed; the reply is still available in chat.");
  window.speechSynthesis.speak(utterance);
}
function stopSpeaking() {
  if ("speechSynthesis" in window) window.speechSynthesis.cancel();
}

export default function AIAgent({ stage, feature, onNavigate }) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([{
    id: "welcome", role: "assistant",
    content: "Hey! I'm RANANO. I'm here whenever you need me. You can ask me about the current tool, call my name, or tell me what you want to create. ✨",
  }]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [listening, setListening] = useState(false);
  const [voiceStatus, setVoiceStatus] = useState("");
  const recorderRef = useRef(null);
  const streamRef = useRef(null);
  const chunksRef = useRef([]);
  const sendLockRef = useRef(false);
  const cancelRecordingRef = useRef(false);
  const inputRef = useRef(null);
  const messagesEndRef = useRef(null);
  const historyRef = useRef([]);
  const toolName = getToolName(stage, feature);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading, voiceStatus]);

  useEffect(() => {
    if (stage === "landing" || stage === "mascot") {
      stopRecording();
      stopSpeaking();
      setOpen(false);
    }
    return () => stopRecording();
  }, [stage]);

  function stopRecording(cancel = true) {
    cancelRecordingRef.current = cancel;
    const recorder = recorderRef.current;
    if (recorder && recorder.state !== "inactive") {
      try { recorder.stop(); } catch {}
    }
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    recorderRef.current = null;
    setListening(false);
  }

  async function startRecording() {
    cancelRecordingRef.current = false;
    if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) {
      setVoiceStatus("Audio recording is not supported in this browser. Try Chrome or Brave and use a secure localhost URL.");
      return;
    }
    try {
      stopSpeaking();
      setVoiceStatus("Requesting microphone permission…");
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      chunksRef.current = [];
      const preferred = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4"].find((type) => MediaRecorder.isTypeSupported?.(type));
      const recorder = preferred ? new MediaRecorder(stream, { mimeType: preferred }) : new MediaRecorder(stream);
      recorderRef.current = recorder;
      recorder.ondataavailable = (event) => {
        if (event.data?.size) chunksRef.current.push(event.data);
      };
      recorder.onerror = () => {
        setVoiceStatus("Recording failed. Please try the microphone again.");
        stopRecording();
      };
      recorder.onstop = async () => {
        stream.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
        recorderRef.current = null;
        setListening(false);
        if (cancelRecordingRef.current) { cancelRecordingRef.current = false; chunksRef.current = []; return; }
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || "audio/webm" });
        chunksRef.current = [];
        if (!blob.size) {
          setVoiceStatus("No audio captured. Tap the microphone and speak again.");
          return;
        }
        setVoiceStatus("Transcribing with Groq Whisper…");
        try {
          const result = await api.transcribeAudio(blob);
          const transcript = (result?.text || "").trim();
          if (!transcript) {
            setVoiceStatus("No speech detected. Try again.");
            return;
          }
          setInput(transcript);
          setVoiceStatus(`Heard: “${transcript}”`);
          await sendMessage(transcript);
        } catch (error) {
          setVoiceStatus(error?.message || "Transcription failed. Check the backend and Groq API key.");
        }
      };
      recorder.start();
      setListening(true);
      setVoiceStatus("Recording — tap the microphone again to stop.");
    } catch (error) {
      setListening(false);
      setVoiceStatus(error?.name === "NotAllowedError" ? "Microphone permission was denied. Allow microphone access in browser settings." : `Microphone error: ${error?.message || "unknown error"}`);
    }
  }

  function toggleRecording() {
    if (listening && recorderRef.current) {
      try { recorderRef.current.stop(); } catch {}
      return;
    }
    if (!loading) startRecording();
  }

  async function sendMessage(rawMessage) {
    const message = String(rawMessage || "").trim();
    if (!message || loading || sendLockRef.current) return;
    sendLockRef.current = true;
    setOpen(true);
    setInput("");
    setLoading(true);
    setVoiceStatus("");
    const userMessage = { id: `user-${Date.now()}`, role: "user", content: message };
    setMessages((previous) => [...previous, userMessage]);
    const currentHistory = [...historyRef.current, { role: "user", content: message }];
    historyRef.current = currentHistory;
    try {
      // The backend adds the current message itself; send only previous turns.
      const result = await api.chat(message, currentHistory.slice(0, -1).slice(-12), toolName);
      const reply = result?.reply || result?.response || "I'm here! Tell me what you'd like to do.";
      setMessages((previous) => [...previous, { id: `assistant-${Date.now()}`, role: "assistant", content: reply }]);
      historyRef.current = [...currentHistory, { role: "assistant", content: reply }];
      speak(reply, setVoiceStatus);
      const intent = normalizeIntent(result?.intent);
      const confidence = Number(result?.confidence || 0);
      if (intent && confidence >= 0.70 && shouldNavigate(message) && typeof onNavigate === "function") {
        setTimeout(() => onNavigate(intent), 500);
      }
    } catch (error) {
      const errorMessage = error?.message || "I couldn't reach my AI core right now. Please try again.";
      setMessages((previous) => [...previous, { id: `error-${Date.now()}`, role: "assistant", content: errorMessage, error: true }]);
      speak("I couldn't reach my AI core right now. Please try again.", setVoiceStatus);
    } finally {
      setLoading(false);
      sendLockRef.current = false;
    }
  }

  function handleSubmit(event) {
    event.preventDefault();
    sendMessage(input);
  }
  function handleClose() {
    setOpen(false);
    if (listening) stopRecording(true);
    stopSpeaking();
    setVoiceStatus("");
  }
  if (stage === "landing" || stage === "mascot") return null;
  const quickMessages = QUICK_MESSAGES[feature] || QUICK_MESSAGES.choosing;

  return (
    <>
      {!open && (
        <button type="button" className={`ranano-agent-fab ${listening ? "ranano-agent-fab-listening" : ""}`} onClick={() => setOpen(true)} aria-label="Open RANANO AI Agent">
          <span className="ranano-agent-ring" /><img src={mascot} alt="RANANO AI Agent" />
          <span className="ranano-agent-status">{listening ? "RECORDING" : "ASK ME"}</span>
        </button>
      )}
      {open && (
        <aside className={`ranano-agent-panel ${listening ? "ranano-agent-panel-listening" : ""}`}>
          <header className="ranano-agent-header">
            <div className="ranano-agent-identity">
              <div className="ranano-agent-avatar"><img src={mascot} alt="" /><span /></div>
              <div><strong>RANANO</strong><small>AI CREATIVE GUIDE</small></div>
            </div>
            <div className="ranano-agent-header-actions">
              <button type="button" className={`ranano-agent-icon ${listening ? "active" : ""}`} onClick={toggleRecording} aria-label={listening ? "Stop recording" : "Start voice recording"} title={listening ? "Tap to stop recording" : "Tap to speak"}>
                🎙️
              </button>
              <button type="button" className="ranano-agent-icon" onClick={handleClose} aria-label="Close RANANO Agent">×</button>
            </div>
          </header>
          <div className="ranano-agent-context"><span className="ranano-context-dot" />HELPING WITH<strong>{toolName}</strong></div>
          <div className="ranano-agent-messages">
            {messages.map((message) => (
              <div key={message.id} className={`ranano-agent-message ${message.role === "user" ? "user" : "assistant"}`}>
                {message.role === "assistant" && <div className="ranano-message-avatar"><img src={mascot} alt="" /></div>}
                <div className="ranano-message-bubble">{message.content}</div>
              </div>
            ))}
            {loading && <div className="ranano-agent-message assistant"><div className="ranano-message-avatar"><img src={mascot} alt="" /></div><div className="ranano-message-bubble ranano-thinking"><span /><span /><span /></div></div>}
            <div ref={messagesEndRef} />
          </div>
          {!loading && <div className="ranano-agent-quick">{quickMessages.slice(0, 3).map((message) => <button key={message} type="button" onClick={() => sendMessage(message)}>{message}</button>)}</div>}
          {(listening || voiceStatus) && <div className="ranano-agent-voice-status"><span className={listening ? "pulse" : ""} />{voiceStatus}</div>}
          <form className="ranano-agent-input" onSubmit={handleSubmit}>
            <input ref={inputRef} value={input} onChange={(event) => setInput(event.target.value)} placeholder={listening ? "Recording… tap microphone to stop" : "Ask RANANO anything…"} disabled={loading || listening} />
            <button type="button" className={`ranano-agent-mic ${listening ? "active" : ""}`} onClick={toggleRecording} disabled={loading} aria-label={listening ? "Stop recording" : "Start voice input"}>🎙</button>
            <button type="submit" disabled={loading || !input.trim()} aria-label="Send message">→</button>
          </form>
        </aside>
      )}
    </>
  );
}
