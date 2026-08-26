const principles = [
  ["Control the centre", "Central influence gives your pieces more routes and makes it harder for the opponent to move freely."],
  ["Develop with purpose", "Bring a new piece toward an active square instead of moving the same piece repeatedly in the opening."],
  ["Ask what changed", "After every move, identify which lines opened, which squares weakened, and which pieces became attacked."],
  ["Count attackers and defenders", "Before a capture, count every attacker and defender on the destination square."],
  ["Checks are candidates, not commands", "Consider checks first, but reject them when they only help the opposing king improve."],
  ["Protect the king", "A safe king lets you calculate plans without answering immediate threats every move."],
  ["Improve the worst piece", "When no tactic exists, find the piece contributing least and give it a better job."],
  ["Loose pieces invite tactics", "An undefended piece can become the target of forks, skewers, and discovered attacks."],
  ["Use all your pieces", "An attack usually succeeds because several pieces participate, not because one piece moves many times."],
  ["Passed pawns must be pushed", "A passed pawn becomes stronger as it advances, but check that its path is tactically safe."],
  ["Rooks need open files", "Place rooks where few pawns block them, especially on files that lead into the opponent’s position."],
  ["Knights need stable squares", "A knight is strongest on a protected square where enemy pawns cannot chase it away."],
  ["Bishops value open diagonals", "Pawn moves can either release a bishop or lock it behind its own structure."],
  ["Trade with a reason", "Exchange pieces to gain something concrete: safety, structure, space, material, or an easier ending."],
  ["Calculate forcing moves", "Checks, captures, and direct threats narrow the opponent’s replies and make calculation clearer."],
  ["Look for the opponent’s idea", "Before choosing your move, explain what their previous move threatened or improved."],
  ["Create a flight square", "Giving the king an escape square can prevent back-rank tactics later."],
  ["Do not rush pawn moves", "Pawns cannot move backward, so each pawn advance permanently changes your position."],
  ["Activate the king in endings", "Once queens are gone, the king often becomes a fighting piece rather than something to hide."],
  ["Review without the engine first", "Explain where you felt uncertain before checking analysis; that uncertainty is valuable evidence."],
];
const practices = [
  "Find one position in today’s reading that demonstrates this idea.", "Pause before each move today and say the principle aloud.", "Set up a simple board and find two examples.", "Look for the opponent’s best reply before you commit.", "Spend three minutes on this idea without moving a piece.", "Use it as your question after every opposing move.", "Notice one moment where ignoring it would change the game.", "Write one sentence explaining it in your own words.", "Find a move that follows the idea and one that violates it.", "Use today’s computer game as a small experiment.", "Revisit yesterday’s game and locate the first relevant moment.", "Teach the idea to an imaginary beginner in plain language.", "Try it once in a slow game rather than blitz.", "Connect it to a passage in your current chess book.", "Before reading on, predict how the author might apply it.", "Look for an exception; chess principles are guides, not laws.", "Use the board coordinates when describing your example.", "Compare two candidate moves through this lens.", "After playing, note whether it made calculation easier.", "End today’s session by recalling the idea without looking."
];

export function tipForDay(date = new Date()) {
  const epoch = Date.UTC(2026, 7, 26);
  const day = Math.max(0, Math.floor((Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) - epoch) / 86400000));
  const principle = principles[day % principles.length];
  const practice = practices[Math.floor(day / principles.length) % practices.length];
  return { number: (day % 365) + 1, title: principle[0], body: principle[1], practice };
}
