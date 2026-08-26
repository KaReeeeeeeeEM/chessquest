import { useEffect, useRef, useState } from "react";
import { ArrowRight, CheckCircle2, Download, LoaderCircle, ShieldCheck, TriangleAlert } from "lucide-react";
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
  const title = status === "available" ? "A new version is ready." : status === "current" ? "ChessQuest is up to date" : status === "checking" ? "Checking for updates…" : status === "downloading" ? `Downloading update · ${progress}%` : status === "restarting" ? "Update installed" : status === "unsupported" ? "Desktop updater" : "Update could not be completed";

  return <div className="app-updater">
    <button className="update-button" onClick={() => void checkForUpdate(true)} disabled={busy}>
      <LoaderCircle className={status === "checking" ? "spin" : ""} aria-hidden="true" />
      <span>Check update</span>
    </button>
    <Dialog open={modalOpen} onOpenChange={(open) => { if (!busy) setModalOpen(open); }}>
      <DialogContent className="update-dialog" showCloseButton={false}>
        <DialogHeader>
          <div className="update-heading-row">
            <span className="update-dialog-icon" aria-hidden="true">{status === "available" ? <Download /> : status === "current" ? <CheckCircle2 /> : status === "error" || status === "unsupported" ? <TriangleAlert /> : <LoaderCircle className="spin" />}</span>
            <div className="update-heading-copy">
              <span className="update-dialog-kicker">ChessQuest update</span>
              <DialogTitle>{title}</DialogTitle>
              <DialogDescription>{status === "available" ? "A polished new version is ready for your library and games." : status === "downloading" ? "Keep ChessQuest open while the signed package downloads." : message}</DialogDescription>
            </div>
          </div>
        </DialogHeader>
        {status === "available" && update && <>
          <div className="update-version-route" aria-label={`Updating from ${update.currentVersion} to ${update.version}`}>
            <div><span>Installed</span><strong>{update.currentVersion}</strong></div>
            <ArrowRight aria-hidden="true" />
            <div><span>Ready</span><strong>{update.version}</strong></div>
          </div>
          {update.body && <section className="update-release-notes"><span>What’s new</span><p>{update.body}</p></section>}
        </>}
        {(status === "downloading" || status === "restarting") && <div className="update-download-progress">
          <div className="update-progress-copy"><span>{status === "restarting" ? "Installed" : "Downloading"}</span><strong>{progress}%</strong></div>
          <div className="update-progress" role="progressbar" aria-label="Update download progress" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress}><i style={{ width: `${progress}%` }} /></div>
        </div>}
        <DialogFooter>
          {status === "available" && <div className="update-actions"><Button className="update-secondary-action" variant="outline" onClick={() => setModalOpen(false)}>Not now</Button><Button className="update-primary-action" onClick={() => void installUpdate()}><Download data-icon="inline-start" /> Download, install and restart</Button></div>}
          {(status === "current" || status === "error" || status === "unsupported") && <Button className="update-secondary-action" variant="outline" onClick={() => setModalOpen(false)}>Close</Button>}
          {(status === "available" || status === "downloading" || status === "restarting") && <small className="update-security"><ShieldCheck aria-hidden="true" /> Signed and verified before installation</small>}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </div>;
}
