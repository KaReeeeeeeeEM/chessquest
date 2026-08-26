import { useEffect, useRef, useState } from "react";
import { CheckCircle2, Download, LoaderCircle, TriangleAlert } from "lucide-react";
import { check, type Update } from "@tauri-apps/plugin-updater";
import { relaunch } from "@tauri-apps/plugin-process";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

type Status = "idle" | "checking" | "available" | "current" | "downloading" | "restarting" | "error" | "unsupported";

export function AppUpdater() {
  const [status, setStatus] = useState<Status>("idle");
  const [update, setUpdate] = useState<Update | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState("");
  const total = useRef(0);
  const received = useRef(0);
  const checking = useRef(false);

  useEffect(() => () => { void update?.close(); }, [update]);
  useEffect(() => { void checkForUpdate(false); }, []);

  async function checkForUpdate(manual = true) {
    if (checking.current) return;
    if (!("__TAURI_INTERNALS__" in window) || navigator.userAgent.toLowerCase().includes("android")) {
      if (manual) {
        setStatus("unsupported");
        setMessage(navigator.userAgent.toLowerCase().includes("android") ? "Android updates remain available from the ChessQuest downloads page." : "Update checking is available inside the installed desktop app.");
        setModalOpen(true);
      }
      return;
    }
    checking.current = true;
    setStatus("checking");
    setMessage("");
    if (manual) setModalOpen(true);
    try {
      const result = await check({ timeout: 30_000 });
      setUpdate(result);
      setStatus(result ? "available" : "current");
      setMessage(result ? `ChessQuest ${result.version} is ready.` : "You already have the latest version.");
      if (result) setModalOpen(true);
    } catch {
      setStatus("error");
      setMessage("ChessQuest could not reach the update service. Check your connection and try again.");
      if (manual) setModalOpen(true);
    } finally {
      checking.current = false;
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
      setProgress(100);
      setStatus("restarting");
      setMessage("Update installed. Restarting ChessQuest…");
      await relaunch();
    } catch {
      setStatus("error");
      setMessage("The update could not be installed. Your current version is unchanged.");
    }
  }

  const busy = status === "checking" || status === "downloading" || status === "restarting";
  const title = status === "available" ? message : status === "current" ? "ChessQuest is up to date" : status === "checking" ? "Checking for updates…" : status === "downloading" ? `Downloading update · ${progress}%` : status === "restarting" ? "Update installed" : status === "unsupported" ? "Desktop updater" : "Update could not be completed";

  return <div className="app-updater">
    <button className="update-button" onClick={() => void checkForUpdate(true)} disabled={busy}>
      <LoaderCircle className={status === "checking" ? "spin" : ""} aria-hidden="true" />
      <span>Check update</span>
    </button>
    <Dialog open={modalOpen} onOpenChange={(open) => { if (!busy) setModalOpen(open); }}>
      <DialogContent className="update-dialog" showCloseButton={!busy}>
        <DialogHeader>
          <span className="update-dialog-icon" aria-hidden="true">{status === "available" ? <Download /> : status === "current" ? <CheckCircle2 /> : status === "error" || status === "unsupported" ? <TriangleAlert /> : <LoaderCircle className="spin" />}</span>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{status === "available" ? "Download the signed update, install it, and restart ChessQuest without leaving the application." : status === "downloading" ? "Keep ChessQuest open while the signed package downloads." : message}</DialogDescription>
        </DialogHeader>
        {(status === "downloading" || status === "restarting") && <div className="update-download-progress">
          <div className="update-progress-copy"><span>{status === "restarting" ? "Installed" : "Downloading"}</span><strong>{progress}%</strong></div>
          <div className="update-progress" role="progressbar" aria-label="Update download progress" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress}><i style={{ width: `${progress}%` }} /></div>
        </div>}
        <DialogFooter>
          {status === "available" && <Button onClick={() => void installUpdate()}><Download /> Download, install and restart</Button>}
          {(status === "current" || status === "error" || status === "unsupported") && <Button variant="outline" onClick={() => setModalOpen(false)}>Close</Button>}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </div>;
}
