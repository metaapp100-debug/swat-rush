import type { EnemyKind } from "./Enemies";

export type StageDef = {
  name: string;
  sky: number;
  wall: number;
  floor: number;
  accent: number;
  deco: "alley" | "hall" | "warehouse" | "roof" | "core";
  covers: number[];
  kinds: EnemyKind[];
  spawnMs: number;
  maxAlive: number;
  quota: number;
};

export const STAGES: StageDef[] = [
  {
    name: "外圍巷戰",
    sky: 0x1c221c,
    wall: 0x2a2e28,
    floor: 0x3e3a32,
    accent: 0x161814,
    deco: "alley",
    covers: [96, 176],
    kinds: ["gunner"],
    spawnMs: 1600,
    maxAlive: 3,
    quota: 8,
  },
  {
    name: "巢穴走廊",
    sky: 0x12161c,
    wall: 0x1c2430,
    floor: 0x2a3038,
    accent: 0x3a5068,
    deco: "hall",
    covers: [78, 148, 210],
    kinds: ["gunner", "rusher"],
    spawnMs: 1200,
    maxAlive: 4,
    quota: 10,
  },
  {
    name: "地下倉庫",
    sky: 0x2a2014,
    wall: 0x4a3820,
    floor: 0x3a2e1c,
    accent: 0xc9a24a,
    deco: "warehouse",
    covers: [70, 128, 200],
    kinds: ["heavy", "gunner"],
    spawnMs: 1400,
    maxAlive: 4,
    quota: 10,
  },
  {
    name: "工廠頂樓",
    sky: 0x0e1828,
    wall: 0x1a2838,
    floor: 0x243040,
    accent: 0x6aa0c8,
    deco: "roof",
    covers: [120],
    kinds: ["sprayer", "rusher"],
    spawnMs: 1000,
    maxAlive: 5,
    quota: 12,
  },
  {
    name: "核心機房",
    sky: 0x220c0c,
    wall: 0x3a1414,
    floor: 0x2a1010,
    accent: 0xc45a3a,
    deco: "core",
    covers: [88, 168, 236],
    kinds: ["jumper", "sprayer", "heavy"],
    spawnMs: 820,
    maxAlive: 6,
    quota: 14,
  },
];

export function stageAt(index: number): StageDef {
  const stage = STAGES[index % STAGES.length];
  if (!stage) {
    throw new Error("stage missing");
  }
  return stage;
}

export function intensityAt(index: number): number {
  const loop = Math.floor(index / STAGES.length);
  const step = index % STAGES.length;
  return 1 + loop * 0.35 + step * 0.08;
}
