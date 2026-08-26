import { createWidgetWindow, requestWidget, setRegisterWidget, setWidgetConfig, type WidgetConfig } from "tauri-plugin-widgets-api";

export const CHESSQUEST_WIDGET_GROUP = "group.com.chessquest.club";
export const CHESSQUEST_WIDGET_ID = "chessquest";

type WidgetSnapshot = {
  choice: string;
  streak: number;
  pagesToday: number;
};

function widgetConfig({ choice, streak, pagesToday }: WidgetSnapshot): WidgetConfig {
  const isReminder = choice.startsWith("reminder");
  const isReading = choice.startsWith("reading");
  const headline = isReminder ? "Your book is waiting" : isReading ? `${pagesToday} pages today` : `${streak} day streak`;
  const supporting = pagesToday > 0 ? "Today complete · keep going" : "Read one real page today";
  const background = { light: "#fffdf7", dark: "#10201a" };
  const foreground = { light: "#17251f", dark: "#f7f3e8" };
  const muted = { light: "#68736e", dark: "#aebbb5" };
  const primary = "#176b4d";

  return {
    version: 1,
    small: {
      type: "vstack",
      padding: 16,
      spacing: 8,
      background,
      cornerRadius: 24,
      children: [
        { type: "label", text: "ChessQuest", systemName: "flame.fill", iconColor: primary, color: foreground, fontSize: 13, fontWeight: "bold" },
        { type: "spacer", minLength: 6 },
        { type: "text", content: headline, fontSize: 25, fontWeight: "bold", fontDesign: "rounded", color: foreground, lineLimit: 2 },
        { type: "text", content: supporting, fontSize: 12, color: muted, lineLimit: 2 },
      ],
    },
    medium: {
      type: "hstack",
      padding: 18,
      spacing: 18,
      background,
      cornerRadius: 24,
      children: [
        {
          type: "vstack",
          spacing: 7,
          flex: 1,
          children: [
            { type: "label", text: "ChessQuest", systemName: "book.closed.fill", iconColor: primary, color: foreground, fontSize: 13, fontWeight: "bold" },
            { type: "text", content: headline, fontSize: 26, fontWeight: "bold", fontDesign: "rounded", color: foreground, lineLimit: 2 },
            { type: "text", content: supporting, fontSize: 13, color: muted, lineLimit: 1 },
          ],
        },
        { type: "gauge", value: Math.min(1, pagesToday / 5), min: 0, max: 1, label: "Daily five", currentValueLabel: `${pagesToday}/5`, tint: primary, gaugeStyle: "circular", frame: { width: 92, height: 92 } },
      ],
    },
    large: {
      type: "vstack",
      padding: 20,
      spacing: 14,
      background,
      cornerRadius: 26,
      children: [
        { type: "label", text: "ChessQuest today", systemName: "book.closed.fill", iconColor: primary, color: foreground, fontSize: 15, fontWeight: "bold" },
        { type: "text", content: headline, fontSize: 31, fontWeight: "bold", fontDesign: "serif", color: foreground, lineLimit: 2 },
        { type: "progress", value: Math.min(1, pagesToday / 5), total: 1, label: `${pagesToday} of 5 daily pages`, tint: primary, barStyle: "linear" },
        { type: "hstack", spacing: 10, children: [
          { type: "container", flex: 1, padding: 13, background: { light: "#eef3ef", dark: "#1b3027" }, cornerRadius: 16, children: [
            { type: "text", content: `${streak} days`, fontSize: 22, fontWeight: "bold", color: foreground },
            { type: "text", content: "Reading streak", fontSize: 12, color: muted },
          ] },
          { type: "container", flex: 1, padding: 13, background: { light: "#eef3ef", dark: "#1b3027" }, cornerRadius: 16, children: [
            { type: "text", content: `${pagesToday} pages`, fontSize: 22, fontWeight: "bold", color: foreground },
            { type: "text", content: "Completed today", fontSize: 12, color: muted },
          ] },
        ] },
        { type: "spacer", minLength: 4 },
        { type: "text", content: supporting, fontSize: 14, color: muted },
      ],
    },
  };
}

export async function syncNativeWidget(snapshot: WidgetSnapshot) {
  if (!("__TAURI_INTERNALS__" in window)) return { available: false as const };
  const outcome = await setWidgetConfig(widgetConfig(snapshot), CHESSQUEST_WIDGET_GROUP, CHESSQUEST_WIDGET_ID);
  return { available: true as const, outcome };
}

export async function makeNativeWidgetAvailable(snapshot: WidgetSnapshot) {
  const synced = await syncNativeWidget(snapshot);
  if (!synced.available) return { available: false as const, pinned: false };
  await setRegisterWidget(["ChessQuestWidget", "git.s00d.widgets.TauriGlanceWidgetReceiver"]);
  const pinned = await requestWidget();
  return { ...synced, pinned };
}

export async function openDesktopWidget(snapshot: WidgetSnapshot) {
  await syncNativeWidget(snapshot);
  return createWidgetWindow({
    label: "chessquest-widget",
    width: snapshot.choice.endsWith("large") ? 440 : snapshot.choice.endsWith("medium") ? 390 : 260,
    height: snapshot.choice.endsWith("large") ? 430 : snapshot.choice.endsWith("medium") ? 220 : 260,
    alwaysOnTop: false,
    skipTaskbar: true,
    group: CHESSQUEST_WIDGET_GROUP,
    widgetId: CHESSQUEST_WIDGET_ID,
    size: snapshot.choice.endsWith("large") ? "large" : snapshot.choice.endsWith("medium") ? "medium" : "small",
  });
}
