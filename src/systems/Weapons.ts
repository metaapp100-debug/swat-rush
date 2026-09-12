export type GunId = "pistol" | "smg" | "shotgun";

export type GunDef = {
  id: GunId;
  name: string;
  cooldown: number;
  climb: number;
  kick: number;
  spread: number;
  damage: number;
  mag: number;
  reload: number;
  pellets: number;
  speed: number;
};

export const GUNS: Record<GunId, GunDef> = {
  pistol: {
    id: "pistol",
    name: "手槍",
    cooldown: 280,
    climb: 1.2,
    kick: 2,
    spread: 1.4,
    damage: 14,
    mag: 12,
    reload: 900,
    pellets: 1,
    speed: 280,
  },
  smg: {
    id: "smg",
    name: "衝鋒槍",
    cooldown: 72,
    climb: 3.4,
    kick: 1.1,
    spread: 5,
    damage: 6,
    mag: 30,
    reload: 1200,
    pellets: 1,
    speed: 300,
  },
  shotgun: {
    id: "shotgun",
    name: "散彈",
    cooldown: 680,
    climb: 0.4,
    kick: 7,
    spread: 16,
    damage: 8,
    mag: 6,
    reload: 1400,
    pellets: 5,
    speed: 240,
  },
};

export function decayClimb(climb: number, dt: number): number {
  return Math.max(0, climb - 28 * dt);
}
