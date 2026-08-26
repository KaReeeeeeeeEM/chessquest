import { useEffect, useRef, useState } from "react";
import { CheckCircle2, Download, RefreshCw, RotateCw, X } from "lucide-react";
import { check, type Update } from "@tauri-apps/plugin-updater";
import { relaunch } from "@tauri-apps/plugin-process";

type Status = "idle" | "checking" | "available" | "current" | "downloading" | "installed" | "error" | "unsupported";

export function AppUpdater() {
  const [status, setStatus] = useState<Status>("idle");
  const [update, setUpdate] = useState<Update | null>(null);
  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState("");
  const total = useRef(0);
  const received = useRef(0);

  useEffect(() => () => { void update?.close(); }, [update]);

  async function checkForUpdate() {
    if (!("__TAURI_INTERNALS__" in window) || navigator.userAgent.toLowerCase().includes("android")) {
      setStatus("unsupported");
      setMessage(navigator.userAgent.toLowerCase().includes("android") ? "Android updates remain available from the ChessQuest downloads page." : "Update checking is available inside the installed desktop app.");
      return;
    }
    setStatus("checking");
    setMessage("");
    try {
      const result = await check({ timeout: 30_000 });
      setUpdate(result);
      setStatus(result ? "available" : "current");
      setMessage(result ? `ChessQuest ${result.version} is ready.` : "You already have the latest version.");
    } catch {
      setStatus("error");
      setMessage("ChessQuest could not reach the update service. Check your connection and try again.");
    }
  }

  async function installUpdate() {
    if (!update) return;
    setStatus("downloading");
    setProgress(0);
    total.current = 0;
    received.current = 0;
    try {
      await update.downloadAndInstall((event) => {
        if (event.event === "Started") total.current = event.data.contentLength || 0;
        if (event.event === "Progress") {
          received.current += event.data.chunkLength;
          if (total.current) setProgress(Math.min(100, Math.round((received.current / total.current) * 100)));
        }
        if (event.event === "Finished") setProgress(100);
      });
      setStatus("installed");
      setMessage("The update is installed. Restart ChessQuest to finish.");
    } catch {
      setStatus("error");
      setMessage("The update could not be installed. Your current version is unchanged.");
    }
  }

  const expanded = !["idle"].includes(status);
  return <div className={`app-updater app-updater--${status}`}>
    <button className="update-button" onClick={() => void checkForUpdate()} disabled={status === "checking" || status === "downloading"}>
      <RefreshCw className={status === "checking" ? "spin" : ""} aria-hidden="true" />
      <span>Check update</span>
    </button>
    {expanded && <div className="update-panel" role="status" aria-live="polite">
      <button className="update-dismiss" aria-label="Dismiss update status" onClick={() => { setStatus("idle"); setMessage(""); }}><X /></button>
      {status === "available" && <Download aria-hidden="true" />}
      {status === "current" && <CheckCircle2 aria-hidden="true" />}
      {status === "installed" && <RotateCw aria-hidden="true" />}
      <strong>{status === "checking" ? "Checking for updates…" : status === "downloading" ? `Downloading… ${progress}%` : status === "error" ? "Update check failed" : status === "unsupported" ? "Desktop updater" : message}</strong>
      {status === "downloading" && <div className="update-progress" aria-label={`Update download ${progress}%`}><i style={{ width: `${progress}%` }} /></div>}
      {status === "available" && <button onClick={() => void installUpdate()}>Download and install</button>}
      {status === "installed" && <button onClick={() => void relaunch()}>Restart now</button>}
      {(status === "error" || status === "unsupported") && <small>{message}</small>}
    </div>}
  </div>;
}
