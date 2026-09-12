import Phaser from "phaser";
import { GAME_H, GAME_W, GROUND_Y } from "../gameConfig";
import { ENEMY_DEFS, type EnemyData } from "../systems/Enemies";
import { createPixelTextures } from "../systems/PixelTextures";
import { intensityAt, stageAt, type StageDef } from "../systems/Stages";
import { accuracyText, StatsTracker, type RunStats } from "../systems/Stats";
import { TouchControls } from "../systems/TouchControls";
import { decayClimb, GUNS, type GunId } from "../systems/Weapons";

const PLAYER_SPEED = 78;
const JUMP_V = -168;
const PLAYER_HP = 100;
const FLASH_MS = 1800;

type BulletData = {
  friendly: boolean;
  damage: number;
};

export class PlayScene extends Phaser.Scene {
  private controls!: TouchControls;
  private player!: Phaser.Physics.Arcade.Sprite;
  private enemies!: Phaser.Physics.Arcade.Group;
  private covers!: Phaser.Physics.Arcade.StaticGroup;
  private ground!: Phaser.Physics.Arcade.StaticGroup;
  private playerBullets!: Phaser.Physics.Arcade.Group;
  private enemyBullets!: Phaser.Physics.Arcade.Group;
  private roomBits: Phaser.GameObjects.GameObject[] = [];
  private keys: {
    left: Phaser.Input.Keyboard.Key;
    right: Phaser.Input.Keyboard.Key;
    jump: Phaser.Input.Keyboard.Key;
    crouch: Phaser.Input.Keyboard.Key;
    reload: Phaser.Input.Keyboard.Key;
    flash: Phaser.Input.Keyboard.Key;
  } | null = null;
  private gun: GunId = "pistol";
  private ammo = GUNS.pistol.mag;
  private reloading = false;
  private lastShot = 0;
  private climb = 0;
  private hp = PLAYER_HP;
  private facing = 1;
  private aim = 0;
  private crouched = false;
  private flashLeft = true;
  private flashUntil = 0;
  private ended = false;
  private stageIndex = 0;
  private stageKills = 0;
  private nextSpawn = 0;
  private stats = new StatsTracker();
  private hpEl!: HTMLElement;
  private ammoEl!: HTMLElement;
  private stageEl!: HTMLElement;
  private resultEl!: HTMLElement;
  private resultTitle!: HTMLElement;
  private resultStats!: HTMLElement;
  private flashBtn!: HTMLButtonElement;

  constructor() {
    super("play");
  }

  create(): void {
    createPixelTextures(this);
    this.controls = new TouchControls();
    this.ended = false;
    this.hp = PLAYER_HP;
    this.gun = "pistol";
    this.ammo = GUNS.pistol.mag;
    this.reloading = false;
    this.climb = 0;
    this.flashLeft = true;
    this.flashUntil = 0;
    this.stageIndex = 0;
    this.stageKills = 0;
    this.stats.begin();
    this.cacheEls();
    this.makeWorld();
    this.bindUi();
    this.bindKeys();
    this.enterStage(0, false);
    this.updateHud();
    if (!mustEl("#start-overlay").hidden) {
      this.scene.pause();
    }
  }

  update(_time: number, delta: number): void {
    if (this.ended) return;
    const dt = delta / 1000;
    const input = this.controls.read();
    const kb = this.keys;
    const kbLeft = kb?.left.isDown ?? false;
    const kbRight = kb?.right.isDown ?? false;
    const moveX = input.move.x !== 0 ? input.move.x : (kbRight ? 1 : 0) - (kbLeft ? 1 : 0);
    const crouch = input.crouch || Boolean(kb?.crouch.isDown);
    const jump = input.jumpPressed || Boolean(kb && Phaser.Input.Keyboard.JustDown(kb.jump));

    this.setCrouch(crouch);
    const body = this.player.body as Phaser.Physics.Arcade.Body;
    body.setVelocityX(this.crouched ? moveX * PLAYER_SPEED * 0.55 : moveX * PLAYER_SPEED);
    if (jump && body.blocked.down && !this.crouched) {
      body.setVelocityY(JUMP_V);
    }
    if (moveX !== 0) this.facing = Math.sign(moveX);

    this.updateAim(input.aim.x, input.aim.y);
    this.climb = decayClimb(this.climb, dt);

    const firing =
      (input.aim.active && Math.hypot(input.aim.x, input.aim.y) > 0.2) ||
      this.input.activePointer.leftButtonDown();
    if (firing) this.tryShoot();

    if (kb && Phaser.Input.Keyboard.JustDown(kb.reload)) this.reload();
    if (kb && Phaser.Input.Keyboard.JustDown(kb.flash)) this.useFlash();

    this.tickSpawns();
    this.updateEnemies();
    this.tryAdvance();
    this.drawAimLine();
    this.updateHud();
  }

  private cacheEls(): void {
    this.hpEl = mustEl("#hud-hp");
    this.ammoEl = mustEl("#hud-ammo");
    this.stageEl = mustEl("#hud-stage");
    this.resultEl = mustEl("#result");
    this.resultTitle = mustEl("#result-title");
    this.resultStats = mustEl("#result-stats");
    this.flashBtn = mustEl("#btn-flash") as HTMLButtonElement;
  }

  private makeWorld(): void {
    this.covers = this.physics.add.staticGroup();
    this.ground = this.physics.add.staticGroup();
    const floor = this.add.rectangle(GAME_W / 2, GROUND_Y + 6, GAME_W, 12, 0x000000, 0);
    this.physics.add.existing(floor, true);
    this.ground.add(floor);

    this.playerBullets = this.physics.add.group();
    this.enemyBullets = this.physics.add.group();
    this.enemies = this.physics.add.group();

    this.player = this.physics.add.sprite(42, GROUND_Y, "player-stand");
    this.player.setOrigin(0.5, 1);
    this.player.setCollideWorldBounds(true);
    this.player.setDepth(5);
    const pBody = this.player.body as Phaser.Physics.Arcade.Body;
    pBody.setSize(12, 18);
    pBody.setOffset(2, 2);
    this.player.setGravityY(520);

    this.physics.add.collider(this.player, this.ground);
    this.physics.add.collider(this.enemies, this.ground);
    this.physics.add.collider(this.playerBullets, this.covers, (bullet) => {
      (bullet as Phaser.Physics.Arcade.Image).destroy();
    });
    this.physics.add.collider(this.enemyBullets, this.covers, (bullet) => {
      (bullet as Phaser.Physics.Arcade.Image).destroy();
    });
    this.physics.add.overlap(this.playerBullets, this.enemies, (bullet, enemy) => {
      this.hitEnemy(bullet as Phaser.Physics.Arcade.Image, enemy as Phaser.Physics.Arcade.Sprite);
    });
    this.physics.add.overlap(this.enemyBullets, this.player, (_player, bullet) => {
      this.hitPlayer(bullet as Phaser.Physics.Arcade.Image);
    });
    this.physics.add.overlap(this.player, this.enemies, (_player, enemy) => {
      this.meleePlayer(enemy as Phaser.Physics.Arcade.Sprite);
    });
  }

  private enterStage(index: number, announce: boolean): void {
    this.stageIndex = index;
    this.stageKills = 0;
    this.flashLeft = true;
    this.flashBtn.disabled = false;
    this.playerBullets.clear(true, true);
    this.enemyBullets.clear(true, true);
    this.enemies.clear(true, true);
    this.covers.clear(true, true);
    this.drawRoom(stageAt(index));
    this.player.setPosition(42, GROUND_Y);
    this.player.setVelocity(0, 0);
    this.nextSpawn = this.time.now;
    this.spawnEnemy();
    this.spawnEnemy();
    if (announce) {
      this.cameras.main.flash(160, 220, 220, 200);
      this.hp = Math.min(PLAYER_HP, this.hp + 12);
    }
  }

  private drawRoom(stage: StageDef): void {
    this.roomBits.forEach((bit) => bit.destroy());
    this.roomBits = [];
    this.roomBits.push(this.add.rectangle(GAME_W / 2, GAME_H / 2, GAME_W, GAME_H, stage.sky));
    this.roomBits.push(this.add.rectangle(GAME_W / 2, 64, GAME_W, 88, stage.wall));
    this.roomBits.push(this.add.rectangle(GAME_W / 2, GROUND_Y + 6, GAME_W, 24, stage.floor));
    this.paintDeco(stage);
    const door = this.add.rectangle(304, 78, 26, 46, stage.accent);
    door.setName("door");
    this.roomBits.push(door);
    stage.covers.forEach((x) => this.placeCover(x));
  }

  private paintDeco(stage: StageDef): void {
    if (stage.deco === "alley") {
      this.roomBits.push(this.add.rectangle(40, 52, 22, 18, 0x10140f));
      this.roomBits.push(this.add.rectangle(70, 52, 22, 18, 0x10140f));
      this.roomBits.push(this.add.rectangle(220, 40, 8, 50, 0x232820));
    } else if (stage.deco === "hall") {
      this.roomBits.push(this.add.rectangle(48, 70, 16, 36, stage.accent));
      this.roomBits.push(this.add.rectangle(160, 48, GAME_W - 40, 6, 0x0a1016));
      this.roomBits.push(this.add.rectangle(250, 70, 16, 36, stage.accent));
    } else if (stage.deco === "warehouse") {
      this.roomBits.push(this.add.rectangle(36, 120, 28, 36, 0x6a4a1c));
      this.roomBits.push(this.add.rectangle(248, 112, 34, 44, 0x5a3e16));
      this.roomBits.push(this.add.rectangle(160, 36, 80, 8, stage.accent));
    } else if (stage.deco === "roof") {
      this.roomBits.push(this.add.rectangle(GAME_W / 2, 28, GAME_W, 18, 0x0a1220));
      this.roomBits.push(this.add.rectangle(30, 90, 10, 50, 0x4a6070));
      this.roomBits.push(this.add.rectangle(290, 90, 10, 50, 0x4a6070));
    } else {
      this.roomBits.push(this.add.rectangle(60, 44, 18, 18, stage.accent));
      this.roomBits.push(this.add.rectangle(160, 36, 40, 10, 0x6a2020));
      this.roomBits.push(this.add.rectangle(240, 44, 18, 18, stage.accent));
    }
  }

  private placeCover(x: number): void {
    const cover = this.covers.create(x, GROUND_Y, "cover") as Phaser.Physics.Arcade.Sprite;
    cover.setOrigin(0.5, 1);
    cover.setTint(stageAt(this.stageIndex).floor);
    cover.refreshBody();
  }

  private currentStage(): StageDef {
    return stageAt(this.stageIndex);
  }

  private currentIntensity(): number {
    return intensityAt(this.stageIndex);
  }

  private quotaMet(): boolean {
    return this.stageKills >= this.currentStage().quota;
  }

  private tickSpawns(): void {
    const stage = this.currentStage();
    const intensity = this.currentIntensity();
    const interval = Math.max(280, stage.spawnMs / intensity);
    if (this.time.now < this.nextSpawn) return;
    this.nextSpawn = this.time.now + interval;
    if (this.enemies.countActive(true) >= stage.maxAlive + Math.floor(intensity) - 1) return;
    this.spawnEnemy();
  }

  private spawnEnemy(): void {
    const stage = this.currentStage();
    const kinds = stage.kinds;
    const kind = kinds[Math.floor(Math.random() * kinds.length)] ?? "gunner";
    const def = ENEMY_DEFS[kind];
    const intensity = this.currentIntensity();
    const slots = [214, 242, 270, 298];
    const taken = new Set<number>();
    this.enemies.children.iterate((obj) => {
      const sprite = obj as Phaser.Physics.Arcade.Sprite | null;
      if (!sprite?.active) return true;
      const near = slots.find((slot) => Math.abs(sprite.x - slot) < 12);
      if (near !== undefined) taken.add(near);
      return true;
    });
    const free = slots.filter((slot) => !taken.has(slot));
    const x = free[0] ?? slots[Math.floor(Math.random() * slots.length)] ?? 298;
    const enemy = this.enemies.create(x, GROUND_Y, def.texture) as Phaser.Physics.Arcade.Sprite;
    enemy.setOrigin(0.5, 1);
    enemy.setDepth(4);
    enemy.setGravityY(520);
    const body = enemy.body as Phaser.Physics.Arcade.Body;
    body.setSize(12, 18);
    body.setOffset(2, 2);
    enemy.setData("payload", {
      kind,
      hp: Math.round(def.hp * intensity),
      nextShot: this.time.now + 240,
      nextHop: this.time.now + (def.hopMs || 99999),
      nextMelee: 0,
    } satisfies EnemyData);
  }

  private updateEnemies(): void {
    const stunned = this.time.now < this.flashUntil;
    this.enemies.children.iterate((obj) => {
      const enemy = obj as Phaser.Physics.Arcade.Sprite | null;
      if (!enemy?.active) return true;
      const data = enemy.getData("payload") as EnemyData | undefined;
      if (!data) return true;
      const def = ENEMY_DEFS[data.kind];
      enemy.setAlpha(stunned ? 0.55 : 1);
      const dir = Math.sign(this.player.x - enemy.x) || -1;
      const body = enemy.body as Phaser.Physics.Arcade.Body;
      const speed = stunned ? def.speed * 0.2 : def.speed;
      if (data.kind === "heavy") {
        body.setVelocityX(dir * speed);
      } else if (data.kind === "sprayer") {
        const dist = Math.abs(this.player.x - enemy.x);
        body.setVelocityX(dist > 110 ? dir * speed : dist < 70 ? -dir * speed : 0);
      } else {
        body.setVelocityX(dir * speed);
      }
      if (!stunned && def.hopMs && this.time.now >= data.nextHop && body.blocked.down) {
        body.setVelocityY(-150);
        data.nextHop = this.time.now + def.hopMs;
      }
      if (!stunned && this.time.now >= data.nextShot) {
        data.nextShot = this.time.now + def.shotMs;
        const angle = Phaser.Math.Angle.Between(
          enemy.x,
          enemy.y - 14,
          this.player.x,
          this.player.y - (this.crouched ? 8 : 14),
        );
        const spread = Phaser.Math.DegToRad((Math.random() * 2 - 1) * def.spread);
        const dmg = Math.round(def.damage * this.currentIntensity());
        this.spawnBullet(enemy.x - 6 * dir, enemy.y - 14, angle + spread, false, dmg, def.bulletSpeed);
      }
      enemy.setData("payload", data);
      return true;
    });
  }

  private bindKeys(): void {
    const kb = this.input.keyboard;
    if (!kb) {
      this.keys = null;
      return;
    }
    this.keys = {
      left: kb.addKey("A"),
      right: kb.addKey("D"),
      jump: kb.addKey("SPACE"),
      crouch: kb.addKey("S"),
      reload: kb.addKey("R"),
      flash: kb.addKey("F"),
    };
    kb.on("keydown-ONE", () => this.setGun("pistol"));
    kb.on("keydown-TWO", () => this.setGun("smg"));
    kb.on("keydown-THREE", () => this.setGun("shotgun"));
  }

  private bindUi(): void {
    document.querySelectorAll<HTMLButtonElement>(".gun-btn").forEach((btn) => {
      btn.onclick = () => {
        const id = btn.dataset.gun;
        if (id === "pistol" || id === "smg" || id === "shotgun") this.setGun(id);
      };
    });
    mustEl("#btn-reload").onclick = () => this.reload();
    this.flashBtn.onclick = () => this.useFlash();
    this.flashBtn.disabled = false;
    mustEl("#btn-pause").onclick = () => this.pauseGame(true);
    mustEl("#btn-resume").onclick = () => this.pauseGame(false);
    mustEl("#btn-retry").onclick = () => this.scene.restart();
    this.resultEl.hidden = true;
    mustEl("#pause-overlay").hidden = true;
    this.input.on("pointermove", (p: Phaser.Input.Pointer) => {
      if (p.isDown && p.x >= 80 && p.x <= 240) {
        this.aim = Phaser.Math.Angle.Between(this.player.x, this.player.y - 14, p.x, p.y);
      }
    });
  }

  private setGun(id: GunId): void {
    if (this.gun === id) return;
    this.gun = id;
    this.ammo = GUNS[id].mag;
    this.reloading = false;
    document.querySelectorAll(".gun-btn").forEach((btn) => {
      btn.classList.toggle("active", btn instanceof HTMLButtonElement && btn.dataset.gun === id);
    });
  }

  private setCrouch(on: boolean): void {
    if (this.crouched === on) return;
    this.crouched = on;
    this.player.setTexture(on ? "player-crouch" : "player-stand");
    const body = this.player.body as Phaser.Physics.Arcade.Body;
    if (on) {
      body.setSize(12, 12);
      body.setOffset(2, 0);
    } else {
      body.setSize(12, 18);
      body.setOffset(2, 2);
    }
  }

  private updateAim(ax: number, ay: number): void {
    if (Math.hypot(ax, ay) > 0.2) {
      this.aim = Math.atan2(ay, ax);
      this.facing = ax < 0 ? -1 : 1;
      return;
    }
    if (!this.input.activePointer.leftButtonDown()) {
      this.aim = this.facing > 0 ? 0 : Math.PI;
    }
  }

  private tryShoot(): void {
    if (this.reloading || this.ammo <= 0) {
      if (this.ammo <= 0 && !this.reloading) this.reload();
      return;
    }
    const gun = GUNS[this.gun];
    const now = this.time.now;
    if (now - this.lastShot < gun.cooldown) return;
    this.lastShot = now;
    this.ammo -= 1;
    this.climb += gun.climb;
    const base = this.aim - Phaser.Math.DegToRad(this.climb + gun.kick * 0.3);
    for (let i = 0; i < gun.pellets; i += 1) {
      const spread = Phaser.Math.DegToRad((Math.random() * 2 - 1) * gun.spread);
      this.spawnBullet(
        this.player.x + this.facing * 6,
        this.player.y - (this.crouched ? 8 : 14),
        base + spread,
        true,
        gun.damage,
        gun.speed,
      );
    }
    this.stats.shots += gun.pellets;
    if (this.ammo <= 0) this.reload();
  }

  private spawnBullet(
    x: number,
    y: number,
    angle: number,
    friendly: boolean,
    damage: number,
    speed: number,
  ): void {
    const group = friendly ? this.playerBullets : this.enemyBullets;
    const bullet = group.create(x, y, friendly ? "bullet" : "enemy-bullet") as Phaser.Physics.Arcade.Image;
    bullet.setData("payload", { friendly, damage } satisfies BulletData);
    const body = bullet.body as Phaser.Physics.Arcade.Body | null;
    if (body) {
      this.physics.velocityFromRotation(angle, speed, body.velocity);
    }
    this.time.delayedCall(900, () => {
      if (bullet.active) bullet.destroy();
    });
  }

  private reload(): void {
    if (this.reloading) return;
    const gun = GUNS[this.gun];
    if (this.ammo >= gun.mag) return;
    this.reloading = true;
    this.time.delayedCall(gun.reload, () => {
      this.ammo = gun.mag;
      this.reloading = false;
    });
  }

  private useFlash(): void {
    if (!this.flashLeft || this.ended) return;
    this.flashLeft = false;
    this.flashUntil = this.time.now + FLASH_MS;
    this.flashBtn.disabled = true;
    this.cameras.main.flash(180, 240, 240, 210);
    this.enemies.children.iterate((obj) => {
      const enemy = obj as Phaser.Physics.Arcade.Sprite | null;
      enemy?.setTint(0xf0e6a8);
      return true;
    });
    this.time.delayedCall(FLASH_MS, () => {
      this.enemies.children.iterate((obj) => {
        (obj as Phaser.Physics.Arcade.Sprite | null)?.clearTint();
        return true;
      });
    });
  }

  private hitEnemy(bullet: Phaser.Physics.Arcade.Image, enemy: Phaser.Physics.Arcade.Sprite): void {
    const payload = bullet.getData("payload") as BulletData | undefined;
    bullet.destroy();
    if (!payload?.friendly || !enemy.active) return;
    const data = enemy.getData("payload") as EnemyData | undefined;
    if (!data) return;
    this.stats.hits += 1;
    data.hp -= payload.damage;
    enemy.setTintFill(0xf0e6a8);
    this.time.delayedCall(50, () => {
      if (enemy.active) enemy.clearTint();
    });
    if (data.hp <= 0) {
      enemy.destroy();
      this.stats.kills += 1;
      this.stageKills += 1;
      return;
    }
    enemy.setData("payload", data);
  }

  private hitPlayer(bullet: Phaser.Physics.Arcade.Image): void {
    const payload = bullet.getData("payload") as BulletData | undefined;
    bullet.destroy();
    if (payload?.friendly) return;
    this.hurt(payload?.damage ?? 10);
  }

  private meleePlayer(enemy: Phaser.Physics.Arcade.Sprite): void {
    const data = enemy.getData("payload") as EnemyData | undefined;
    if (!data) return;
    const def = ENEMY_DEFS[data.kind];
    if (!def.melee || this.time.now < data.nextMelee) return;
    data.nextMelee = this.time.now + 500;
    enemy.setData("payload", data);
    this.hurt(Math.round(def.melee * this.currentIntensity()));
  }

  private hurt(amount: number): void {
    this.hp = Math.max(0, this.hp - amount);
    this.cameras.main.shake(80, 0.004);
    if (this.hp <= 0) this.finish();
  }

  private tryAdvance(): void {
    if (!this.quotaMet()) return;
    const door = this.children.getByName("door") as Phaser.GameObjects.Rectangle | null;
    door?.setFillStyle(0xf0e6a8);
    if (this.player.x >= 292) {
      this.stats.stages += 1;
      this.enterStage(this.stageIndex + 1, true);
    }
  }

  private drawAimLine(): void {
    const g = this.children.getByName("aim") as Phaser.GameObjects.Graphics | null;
    const gfx = g ?? this.add.graphics().setName("aim").setDepth(8);
    gfx.clear();
    const gun = GUNS[this.gun];
    const angle = this.aim - Phaser.Math.DegToRad(this.climb);
    const x = this.player.x + this.facing * 6;
    const y = this.player.y - (this.crouched ? 8 : 14);
    gfx.lineStyle(1, 0xf0e6a8, 0.55);
    gfx.beginPath();
    gfx.moveTo(x, y);
    gfx.lineTo(x + Math.cos(angle) * 22, y + Math.sin(angle) * 22);
    gfx.strokePath();
    if (gun.id === "shotgun") {
      gfx.lineStyle(1, 0xc45a3a, 0.35);
      const a1 = angle - Phaser.Math.DegToRad(gun.spread);
      const a2 = angle + Phaser.Math.DegToRad(gun.spread);
      gfx.lineBetween(x, y, x + Math.cos(a1) * 18, y + Math.sin(a1) * 18);
      gfx.lineBetween(x, y, x + Math.cos(a2) * 18, y + Math.sin(a2) * 18);
    }
  }

  private updateHud(): void {
    this.hpEl.textContent = `體力 ${this.hp} / 100`;
    const gun = GUNS[this.gun];
    this.ammoEl.textContent = this.reloading ? `${gun.name} 換彈中` : `${gun.name} ${this.ammo}/${gun.mag}`;
    const stage = this.currentStage();
    const loop = Math.floor(this.stageIndex / 5) + 1;
    const ready = this.quotaMet() ? " 右移過關" : "";
    this.stageEl.textContent = `${stage.name} · ${this.stageKills}/${stage.quota}${ready}${loop > 1 ? ` · 第${loop}輪` : ""}`;
  }

  private pauseGame(on: boolean): void {
    mustEl("#pause-overlay").hidden = !on;
    if (on) this.scene.pause();
    else this.scene.resume();
  }

  private finish(): void {
    if (this.ended) return;
    this.ended = true;
    this.player.setVelocity(0, 0);
    this.showResult(this.stats.snapshot(this.hp, false));
  }

  private showResult(stats: RunStats): void {
    this.resultTitle.textContent = "突圍中止";
    this.resultStats.innerHTML = [
      `<li>過關畫面 ${stats.stages}</li>`,
      `<li>命中率 ${accuracyText(stats)}</li>`,
      `<li>擊殺 ${stats.kills}</li>`,
      `<li>時間 ${stats.seconds.toFixed(1)} 秒</li>`,
    ].join("");
    this.resultEl.hidden = false;
  }
}

function mustEl(sel: string): HTMLElement {
  const el = document.querySelector(sel);
  if (!(el instanceof HTMLElement)) {
    throw new Error(`missing ${sel}`);
  }
  return el;
}

