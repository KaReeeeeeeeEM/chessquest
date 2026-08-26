# ChessQuest

A local-first, non-AI desktop and web application that turns public-domain chess books into short read–move–remember sessions.

## Included vertical slice

- Guided lesson with a legal-move chessboard, progressive hints, and authored feedback
- Persistent completion and theme preferences stored locally
- Library roles for Edward Lasker, Howard Staunton, and H. E. Bird
- Review queue and private-club concept screens
- Local EPUB import with deterministic chapter, notation, and activity detection
- Responsive, keyboard-operable light and dark interfaces

## Development

```sh
npm install
npm run dev
npm run desktop
```

Create a production web bundle with `npm run build`, or create the macOS installer with `npm run desktop:build`. DevCanon standards live in `.ai/` and can be validated with `npx devcanon check`.

## Dependency decisions

- `chess.js`: mature rules engine used only to validate and apply legal chess moves.
- `jszip`: reads the standard ZIP-based EPUB container locally without uploading book content.
- Tauri 2: packages the same verified interface as a native desktop application.
- React, Vite, Tailwind, and shadcn foundations: typed UI composition and semantic design tokens.
- Local storage: keeps progress and compact imported lesson excerpts offline on the device.

This template should help get you started developing with Tauri, React and Typescript in Vite.

## Recommended IDE Setup

- [VS Code](https://code.visualstudio.com/) + [Tauri](https://marketplace.visualstudio.com/items?itemName=tauri-apps.tauri-vscode) + [rust-analyzer](https://marketplace.visualstudio.com/items?itemName=rust-lang.rust-analyzer)
