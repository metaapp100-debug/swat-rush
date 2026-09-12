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
};

export function createPixelTextures(scene: Phaser.Scene): void {
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
  ]);
  paint(scene, "player-crouch", [
    "..HHHH..",
    ".FHHHHF.",
    "..BBBB..",
    "BBBNNBBB",
    ".NNNNNN.",
    ".LL..LL.",
  ]);
  paint(scene, "enemy-stand", [
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
  ]);
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
  ]);
  paint(scene, "bullet", ["WY", "YW"]);
  paint(scene, "enemy-bullet", ["R.", ".R"]);
  paint(scene, "muzzle", ["Y.", "WY"]);
}
