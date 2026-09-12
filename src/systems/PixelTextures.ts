import Phaser from "phaser";

type Pixel = string;

function paint(scene: Phaser.Scene, key: string, rows: Pixel[], scale = 1): void {
  if (scene.textures.exists(key)) return;
  const w = (rows[0]?.length ?? 0) * scale;
  const h = rows.length * scale;
  const tex = scene.textures.createCanvas(key, w, h);
  if (!tex) return;
  const ctx = tex.getContext();
  rows.forEach((row, y) => {
    for (let x = 0; x < row.length; x += 1) {
      const ch = row[x];
      const color = palette[ch ?? "."];
      if (!color) continue;
      ctx.fillStyle = color;
      ctx.fillRect(x * scale, y * scale, scale, scale);
    }
  });
  tex.refresh();
}

const palette: Record<string, string> = {
  H: "#1a2744",
  B: "#2c4a6e",
  N: "#243652",
  F: "#c9a07a",
  L: "#1a1a16",
  E: "#2a3318",
  V: "#4a5c2e",
  R: "#8a2a22",
  K: "#11110f",
  C: "#6b6b63",
  D: "#4a4a44",
  Y: "#f0e6a8",
  W: "#d7d2c4",
  G: "#3e3a32",
  P: "#5a2a6e",
  O: "#8a5a20",
  A: "#6a6a72",
  T: "#c9a24a",
};

export function createPixelTextures(scene: Phaser.Scene): void {
  const px = 2;
  paint(scene, "player-stand", [
    "..HHHH..",
    ".HHHHHH.",
    ".FHHHHF.",
    ".HHHHHH.",
    "..BBBB..",
    ".BBNNBB.",
    "BBBNNBBB",
    ".NNNNNN.",
    ".NN..NN.",
    ".LL..LL.",
  ], px);
  paint(scene, "player-crouch", [
    "..HHHH..",
    ".FHHHHF.",
    "..BBBB..",
    "BBBNNBBB",
    ".NNNNNN.",
    ".LL..LL.",
  ], px);
  paint(scene, "enemy-gunner", [
    "..KKKK..",
    ".KKRRKK.",
    ".EKKKKE.",
    ".KKKKKK.",
    "..VVVV..",
    ".VVEEVV.",
    "VVVEEVVV",
    ".EEEEEE.",
    ".EE..EE.",
    ".KK..KK.",
  ], px);
  paint(scene, "enemy-rusher", [
    "..RRRR..",
    ".RKKKKR.",
    ".FKKKKF.",
    ".KKKKKK.",
    "..RRRR..",
    ".RROORR.",
    "RRROORRR",
    ".OOOOOO.",
    ".OO..OO.",
    ".KK..KK.",
  ], px);
  paint(scene, "enemy-heavy", [
    ".AAAAAA.",
    "AAKKKKAA",
    "AAKAAKAA",
    "AAAAAAAA",
    ".AAAAAA.",
    "AAKAAKAA",
    "AAAAAAAA",
    ".AAAAAA.",
    ".AA..AA.",
    ".KK..KK.",
  ], px);
  paint(scene, "enemy-sprayer", [
    "..TTTT..",
    ".TKKKKT.",
    ".FKKKKF.",
    ".KKKKKK.",
    "..TTTT..",
    ".TTOOTT.",
    "TTTOOTTT",
    ".OOOOOO.",
    ".OO..OO.",
    ".KK..KK.",
  ], px);
  paint(scene, "enemy-jumper", [
    "..PPPP..",
    ".PKKKKP.",
    ".FKKKKF.",
    ".KKKKKK.",
    "..PPPP..",
    ".PPNNPP.",
    "PPPNNPPP",
    ".NNNNNN.",
    ".NN..NN.",
    ".LL..LL.",
  ], px);
  paint(scene, "cover", [
    "CCCCCCCCCCCC",
    "CDDDDDDDDDDC",
    "CDCCCCCCCCDC",
    "CDDDDDDDDDDC",
    "CCCCCCCCCCCC",
    "CDDDDDDDDDDC",
    "CDCCCCCCCCDC",
    "CDDDDDDDDDDC",
    "CCCCCCCCCCCC",
    "CDDDDDDDDDDC",
    "CCCCCCCCCCCC",
  ], px);
  paint(scene, "bullet", ["WY", "YW"], px);
  paint(scene, "enemy-bullet", ["R.", ".R"], px);
  paint(scene, "muzzle", ["Y.", "WY"], px);
}
