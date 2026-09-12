export type EnemyKind = "gunner" | "rusher" | "heavy" | "sprayer" | "jumper";

export type EnemyDef = {
  kind: EnemyKind;
  name: string;
  texture: string;
  hp: number;
  speed: number;
  shotMs: number;
  damage: number;
  spread: number;
  bulletSpeed: number;
  melee: number;
  hopMs: number;
};

export const ENEMY_DEFS: Record<EnemyKind, EnemyDef> = {
  gunner: {
    kind: "gunner",
    name: "步槍兵",
    texture: "enemy-gunner",
    hp: 36,
    speed: 22,
    shotMs: 1080,
    damage: 10,
    spread: 8,
    bulletSpeed: 160,
    melee: 0,
    hopMs: 0,
  },
  rusher: {
    kind: "rusher",
    name: "衝鋒兵",
    texture: "enemy-rusher",
    hp: 28,
    speed: 76,
    shotMs: 920,
    damage: 7,
    spread: 10,
    bulletSpeed: 150,
    melee: 14,
    hopMs: 0,
  },
  heavy: {
    kind: "heavy",
    name: "重裝兵",
    texture: "enemy-heavy",
    hp: 86,
    speed: 10,
    shotMs: 1500,
    damage: 20,
    spread: 3,
    bulletSpeed: 130,
    melee: 0,
    hopMs: 0,
  },
  sprayer: {
    kind: "sprayer",
    name: "掃射兵",
    texture: "enemy-sprayer",
    hp: 34,
    speed: 26,
    shotMs: 150,
    damage: 5,
    spread: 12,
    bulletSpeed: 200,
    melee: 0,
    hopMs: 0,
  },
  jumper: {
    kind: "jumper",
    name: "躍擊兵",
    texture: "enemy-jumper",
    hp: 32,
    speed: 40,
    shotMs: 820,
    damage: 11,
    spread: 7,
    bulletSpeed: 170,
    melee: 10,
    hopMs: 780,
  },
};

export type EnemyData = {
  kind: EnemyKind;
  hp: number;
  nextShot: number;
  nextHop: number;
  nextMelee: number;
};
