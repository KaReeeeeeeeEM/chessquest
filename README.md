<p align="center">
  <img src="public/chessquest-logo.png" width="112" height="112" alt="ChessQuest logo" />
</p>

<h1 align="center">ChessQuest</h1>

<p align="center"><strong>Read chess. See it. Play it.</strong></p>

<p align="center">
  An offline-first desktop learning companion that turns the chess books you own into manageable reading sessions, playable positions, computer games, and book-grounded reviews—without generative AI.
</p>

<p align="center">
  <a href="https://kareeeeeeeem.github.io/chessquest/">Website</a> ·
  <a href="https://github.com/KaReeeeeeeeEM/chessquest/releases/latest">Latest release</a> ·
  <a href="https://github.com/KaReeeeeeeeEM/chessquest/releases/latest/download/ChessQuest_0.1.0_aarch64.dmg">Download for macOS</a>
</p>

## Why ChessQuest exists

Chess books contain extraordinary lessons, but sustained reading can become passive or tiring. ChessQuest connects four activities:

1. Read a short, real section from an imported book.
2. Continue in small increments instead of facing an entire chapter.
3. Apply ideas on a legal interactive board or against the computer.
4. Review completed games and connect explanations to relevant library passages.

ChessQuest does not send book content to a generative model. EPUB processing, progress, games, analysis, preferences, and reminders stay on the device.

## Highlights

### Reading that encourages momentum

- Import EPUB chess books that you legally own.
- Split genuine chapter text into readable local pages.
- Track progress only when a real page is completed.
- Offer another five pages at natural stopping points.
- Build a streak from actual consecutive reading days.
- Show a daily chess tip and practical exercise.

### Interactive chess practice

- Click or drag pieces on guided lesson boards.
- Animate moves and provide move, capture, check, and checkmate sounds.
- Play a local engine with beginner, casual, club, and expert levels.
- Choose bullet, blitz, rapid, or classical time controls.
- Watch computer-versus-computer matches with Coach Rook commentary.
- Play a calibration match for an explicitly provisional Elo estimate.

### Honest game review

- Store complete move histories from finished computer matches.
- Autoplay matches from their real board positions.
- Pause, restart, or switch completed games.
- Identify good, sound, and risky moves with rule-based explanations.
- Search imported excerpts for relevant supporting passages.
- Report when no matching source exists instead of inventing a citation.

### Personal and glanceable

- Guided onboarding for goals, experience, name, and reading rhythm.
- Personalized prompts and Coach Rook feedback.
- Light and dark themes with a click-origin ripple transition.
- Forest, ocean, plum, and ember application-wide palettes.
- Nunito Sans, Geist, and classic serif typography choices.
- Configurable sounds, haptics, reminders, and sidebar behavior.
- A widget gallery with small, medium, and large previews.

## Download

The current release supports Apple-silicon Macs.

**[Download ChessQuest 0.1.0 for macOS](https://github.com/KaReeeeeeeeEM/chessquest/releases/latest/download/ChessQuest_0.1.0_aarch64.dmg)**

The immutable artifact and release notes are also available from [GitHub Releases](https://github.com/KaReeeeeeeeEM/chessquest/releases).

> ChessQuest is currently distributed directly and is not notarized through the Mac App Store. macOS may ask you to confirm that you want to open an application downloaded from the internet.

## Privacy and data

ChessQuest is local-first:

- Imported EPUB text is parsed locally.
- Reading progress and preferences use device-local storage.
- Saved matches and review history remain on the device.
- The computer opponent and move classification run locally.
- Native reminder permission is requested only when reminders are enabled.
- No account is required for the current release.

Removing the application does not necessarily clear WebView application data. Use the application’s controls before uninstalling when data removal is important.

## Technology

| Layer | Technology | Purpose |
| --- | --- | --- |
| Desktop | Tauri 2 + Rust | Native macOS packaging and notifications |
| Interface | React 19 + TypeScript | Typed application state and UI |
| Build | Vite | Development and production bundling |
| Chess | chess.js | Legal moves, board state, and game rules |
| EPUB | JSZip + browser XML APIs | Local EPUB extraction and parsing |
| Components | shadcn foundations + Base UI | Accessible dialogs, selects, and inputs |
| Storage | localStorage | Offline preferences, progress, and history |
| Website | Static HTML/CSS/JS | Public download and product site |

## Repository map

```text
src/
  components/ui/       Shared accessible interface primitives
  features/game/       Computer play, review, and analysis
  features/library/    EPUB importing and parsing
  features/reading/    Real progress and streak calculations
  features/tips/       365-day tip system
src-tauri/              Native Tauri configuration and Rust entrypoint
public/                 Approved product logo and web assets
website/                Public marketing and download website
.ai/                    Repository engineering standards
```

## Local development

### Requirements

- Node.js 20 or newer
- npm
- Rust toolchain
- Tauri 2 system prerequisites for macOS

### Install and run

```bash
git clone https://github.com/KaReeeeeeeeEM/chessquest.git
cd chessquest
npm install
npm run dev
```

Run the desktop application:

```bash
npm run desktop
```

Build the macOS app and DMG:

```bash
npm run desktop:build
```

Release bundles appear under `src-tauri/target/release/bundle/` and are excluded from Git. Published installers belong in GitHub Releases.

## Verification

```bash
npm run typecheck
npx vitest run
npm run build
cargo check --manifest-path src-tauri/Cargo.toml
```

The automated suite covers reading progress and streaks, computer move analysis, book-citation integrity, and 365 distinct daily tip/practice combinations.

## Website

The public website source lives in [`website/`](website/) and deploys from this repository. Download buttons reference GitHub Release assets, so the site never advertises an unavailable local installer.

- Website: [kareeeeeeeem.github.io/chessquest](https://kareeeeeeeem.github.io/chessquest/)
- Repository: [github.com/KaReeeeeeeeEM/chessquest](https://github.com/KaReeeeeeeeEM/chessquest)
- Releases: [github.com/KaReeeeeeeeEM/chessquest/releases](https://github.com/KaReeeeeeeeEM/chessquest/releases)

`website/vercel.json` remains ready for a future Vercel deployment when the account’s current fair-use restriction is cleared.

## Release process

1. Run TypeScript, unit, web-build, and Rust checks.
2. Build Tauri from the tested commit.
3. Tag a semantic version.
4. Create a GitHub Release from that commit.
5. Attach the matching DMG.
6. Confirm the website download resolves to that release.

## Current limitations

- The published build targets Apple silicon only.
- Widget selection changes the in-app Today widget. A native macOS Notification Center widget requires a separately signed WidgetKit extension.
- Match review is deterministic and rule-based rather than powered by a full-strength external engine.
- Elo after one calibration game is provisional, not an official rating.

## Contributing

Focused issues and pull requests are welcome. Preserve local-first data handling, avoid fabricated progress or citations, use shared components, and run verification before opening a pull request.

Engineering standards are documented in [`.ai/AGENTS.md`](.ai/AGENTS.md).
