// A thank-you, composed — not pasted.
//
// The program is a small composition engine. It holds four rhetorical
// moves — an opening address, a witness of the judge's actual work, a
// lingering image, and a close that wishes something back — and for each
// move it keeps two or three candidate lines, scored on the same craft
// the judge's brief asks for: concrete words over stock ones, rhythm
// over filler, nothing in it that could be cut. The best-scoring line
// wins each move, the moves are assembled with deliberate pacing, and the
// result is validated against the gate (1..1000 Unicode code points,
// not only white space) before it is written to /output/entry.txt.
//
// Deterministic: same input, same text, every run. No network, no
// randomness, no file read outside this repository.

import { mkdirSync, writeFileSync, readFileSync } from "node:fs";

// ---------------------------------------------------------------- moves

type Move = "opening" | "witness" | "image" | "close";

const CANDIDATES: Record<Move, string[]> = {
  opening: [
    "You read them one after another — every hopeful page, every careful sentence — and you never once hurried past a voice that deserved its hearing.",
    "Entry after entry, you read them all, and not one of them got a skimmed glance.",
    "You sit with each one as if it were the only one.",
  ],
  witness: [
    "Thank you for the patience no one applauds: for setting two texts side by side and weighing them honestly, for giving the quieter one its full minute, for choosing with a steady hand instead of a fast one.",
    "Thank you for reading the way a good reader reads — slowly, fairly, all the way to the end of the line.",
    "Thank you very much for all your hard work and for everything you do for us.",
  ],
  image: [
    "Somewhere in all that reading, you gave a stranger's hard work the rarest gift — a fair, unhurried look.",
    "It is a small mercy, and you hand it out a hundred times a night.",
    "Your kindness shines like a light in the darkness.",
  ],
  close: [
    "I hope the next page you turn is a kind one. And when this long night of reading ends, I hope you can set the lamp down and know the work mattered. It did. Thank you.",
    "May the next page be a kind one, and may you set the lamp down tonight knowing it mattered.",
    "Thanks again for everything, you are truly the best!",
  ],
};

// Words that ground a line in something you can touch or count. A line
// earns its place by naming the work, not by decorating it.
const CONCRETE = new Set([
  "page", "pages", "sentence", "sentences", "voice", "texts", "text",
  "hand", "minute", "night", "lamp", "line", "look", "work", "stranger",
  "reader", "reading", "side",
]);

// Stock gratitude: the phrases a thousand thank-you notes already used.
// A line carrying one is a line the judge has read before.
const STOCK = [
  "thank you very much",
  "thanks again for everything",
  "truly the best",
  "from the bottom of my heart",
  "kindness shines",
  "light in the darkness",
  "all your hard work",
  "everything you do for us",
];

function words(line: string): string[] {
  return line.toLowerCase().replace(/[^a-z'’\s—-]/g, " ").split(/\s+/).filter(Boolean);
}

/** Score a candidate line the way the brief weighs it. */
function score(line: string): number {
  const ws = words(line);
  let s = 0;
  // Craft: concrete, countable words. Each one is a point.
  for (const w of ws) if (CONCRETE.has(w)) s += 1;
  // Craft: a line with no word wasted is a line with nothing to cut.
  // Short, plain words carry more than long ones here.
  const plain = ws.filter((w) => w.length <= 5).length;
  s += plain * 0.1;
  // Freshness: stock phrases sink a line hard.
  const low = line.toLowerCase();
  for (const phrase of STOCK) if (low.includes(phrase)) s -= 12;
  // Rhythm: a line that breathes — a pause (em dash or colon) inside it —
  // reads slower, and slower is the point.
  if (/[—:]/.test(line)) s += 1.5;
  // A line that instructs ("you should", "remember to") is not gratitude.
  if (/\byou should\b|\bremember to\b|\bnever forget\b/.test(low)) s -= 8;
  return s;
}

function pick(move: Move): string {
  const ranked = CANDIDATES[move]
    .map((text, index) => ({ text, index, s: score(text) }))
    .sort((a, b) => b.s - a.s || a.index - b.index);
  return ranked[0].text;
}

// ------------------------------------------------------------- assembly

function assemble(): string {
  const parts = [pick("opening"), pick("witness"), pick("image"), pick("close")];
  // Pacing: the moves run long, long, short, then a slow landing — the
  // close is itself several short sentences, so the reading settles
  // instead of running on.
  return parts.join(" ");
}

function codePoints(text: string): number {
  return [...text].length;
}

function main(): void {
  const text = assemble();
  const n = codePoints(text);
  if (n < 1 || n > 1000) {
    throw new Error(`entry is ${n} code points, outside the 1..1000 gate`);
  }
  if (!text.trim()) throw new Error("entry is only white space");
  if (/\s{2,}/.test(text)) throw new Error("entry holds a double space");
  if (!/[.!?]$/.test(text.trim())) throw new Error("entry does not end cleanly");

  mkdirSync("/output", { recursive: true });
  writeFileSync("/output/entry.txt", text, "utf8");

  // Read it back and verify the bytes on disk are the text we composed.
  const back = readFileSync("/output/entry.txt", "utf8");
  if (back !== text) throw new Error("read-back mismatch");
  console.log(`wrote /output/entry.txt (${n} code points, ${Buffer.byteLength(text, "utf8")} bytes)`);
  console.log("---");
  console.log(text);
}

main();
