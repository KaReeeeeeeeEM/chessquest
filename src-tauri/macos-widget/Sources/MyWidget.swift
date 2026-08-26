import WidgetKit
import SwiftUI
import TauriWidgets

// ─── Entry Point ─────────────────────────────────────────────────────────────
// Adjust `appGroup`, `kind`, and `widgetId` to match your app.
// Placeholders: group.com.chessquest.club, MyTauriWidget, default

@main
struct MyWidget: Widget {
    let kind = "ChessQuestWidget"
    let appGroup = "group.com.chessquest.club"
    let widgetId = "chessquest"

    var body: some WidgetConfiguration {
        StaticConfiguration(
            kind: kind,
            provider: TauriWidgetProvider(appGroup: appGroup, widgetId: widgetId, refreshMinutes: 15)
        ) { entry in
            TauriWidgetView(entry: entry)
        }
        .configurationDisplayName("ChessQuest")
        .description("Keep your reading streak and daily chess pages visible.")
        .supportedFamilies([.systemSmall, .systemMedium, .systemLarge])
        .contentMarginsDisabled()
    }
}
