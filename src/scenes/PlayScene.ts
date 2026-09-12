import Phaser from "phaser";
import { COLORS, GAME_H, GAME_W, GROUND_Y } from "../gameConfig";
import { createPixelTextures } from "../systems/PixelTextures";
import { accuracyText, StatsTracker, type RunStats } from "../systems/Stats";
import { TouchControls } from "../systems/TouchControls";
import { decayClimb, GUNS, type GunId } from "../systems/Weapons";

const PLAYER_SPEED = 78;
const JUMP_V = -168;
const ENEMY_HP = 90;
const PLAYER_HP = 100;
const FLASH_MS = 1800;

type BulletData = {
  friendly: boolean;
  damage: number;
};

export class PlayScene extends Phaser.Scene {
  private controls!: TouchControls;
  private player!: Phaser.Physics.Arcade.Sprite;
  private enemy!: Phaser.Physics.Arcade.Sprite;
  private covers!: Phaser.Physics.Arcade.StaticGroup;
  private playerBullets!: Phaser.Physics.Arcade.Group;
  private enemyBullets!: Phaser.Physics.Arcade.Group;
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
  private enemyHp = ENEMY_HP;
  private facing = 1;
  private aim = 0;
  private crouched = false;
  private flashLeft = true;
  private flashUntil = 0;
  private enemyNextShot = 0;
  private ended = false;
  private stats = new StatsTracker();
  private hpEl!: HTMLElement;
  private ammoEl!: HTMLElement;
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
    this.enemyHp = ENEMY_HP;
    this.gun = "pistol";
    this.ammo = GUNS.pistol.mag;
    this.reloading = false;
    this.climb = 0;
    this.flashLeft = true;
    this.flashUntil = 0;
    this.stats.begin();
    this.cacheEls();
    this.drawRoom();
    this.spawnActors();
    this.bindUi();
    this.bindKeys();
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

    this.updateEnemy();
    this.drawAimLine();
    this.updateHud();
  }

  private cacheEls(): void {
    this.hpEl = mustEl("#hud-hp");
    this.ammoEl = mustEl("#hud-ammo");
    this.resultEl = mustEl("#result");
    this.resultTitle = mustEl("#result-title");
    this.resultStats = mustEl("#result-stats");
    this.flashBtn = mustEl("#btn-flash") as HTMLButtonElement;
  }

  private drawRoom(): void {
    this.add.rectangle(GAME_W / 2, GAME_H / 2, GAME_W, GAME_H, COLORS.sky);
    this.add.rectangle(GAME_W / 2, 64, GAME_W, 88, COLORS.wall);
    this.add.rectangle(292, 78, 28, 42, 0x161814);
    this.add.rectangle(GAME_W / 2, GROUND_Y + 6, GAME_W, 24, COLORS.floor);

    this.covers = this.physics.add.staticGroup();
    this.placeCover(96);
    this.placeCover(176);

    this.playerBullets = this.physics.add.group();
    this.enemyBullets = this.physics.add.group();
  }

  private placeCover(x: number): void {
    const cover = this.covers.create(x, GROUND_Y, "cover") as Phaser.Physics.Arcade.Sprite;
    cover.setOrigin(0.5, 1);
    cover.refreshBody();
  }

  private spawnActors(): void {
    this.player = this.physics.add.sprite(42, GROUND_Y, "player-stand");
    this.player.setOrigin(0.5, 1);
    this.player.setCollideWorldBounds(true);
    const pBody = this.player.body as Phaser.Physics.Arcade.Body;
    pBody.setSize(12, 18);
    pBody.setOffset(2, 2);
    this.player.setGravityY(520);

    this.enemy = this.physics.add.sprite(286, GROUND_Y, "enemy-stand");
    this.enemy.setOrigin(0.5, 1);
    const eBody = this.enemy.body as Phaser.Physics.Arcade.Body;
    eBody.setAllowGravity(false);
    eBody.setImmovable(true);
    eBody.setSize(12, 18);
    eBody.setOffset(2, 2);

    const ground = this.physics.add.staticGroup();
    const floor = this.add.rectangle(GAME_W / 2, GROUND_Y + 6, GAME_W, 12, COLORS.floor, 0);
    this.physics.add.existing(floor, true);
    ground.add(floor);
    this.physics.add.collider(this.player, ground);

    this.physics.add.collider(this.playerBullets, this.covers, (bullet) => {
      (bullet as Phaser.Physics.Arcade.Image).destroy();
    });
    this.physics.add.collider(this.enemyBullets, this.covers, (bullet) => {
      (bullet as Phaser.Physics.Arcade.Image).destroy();
    });
    this.physics.add.overlap(this.playerBullets, this.enemy, (bullet) => {
      this.hitEnemy(bullet as Phaser.Physics.Arcade.Image);
    });
    this.physics.add.overlap(this.enemyBullets, this.player, (_player, bullet) => {
      this.hitPlayer(bullet as Phaser.Physics.Arcade.Image);
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
      this.spawnBullet(this.player.x + this.facing * 6, this.player.y - (this.crouched ? 8 : 14), base + spread, true, gun.damage, gun.speed);
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
    this.enemy.setTint(0xf0e6a8);
    this.time.delayedCall(FLASH_MS, () => this.enemy.clearTint());
  }

  private updateEnemy(): void {
    if (!this.enemy.active) return;
    const stunned = this.time.now < this.flashUntil;
    this.enemy.setAlpha(stunned ? 0.65 : 1);
    if (stunned) return;
    if (this.time.now < this.enemyNextShot) return;
    this.enemyNextShot = this.time.now + 1100;
    const angle = Phaser.Math.Angle.Between(
      this.enemy.x,
      this.enemy.y - 14,
      this.player.x,
      this.player.y - (this.crouched ? 8 : 14),
    );
    const spread = Phaser.Math.DegToRad((Math.random() * 2 - 1) * 7);
    this.spawnBullet(this.enemy.x - 6, this.enemy.y - 14, angle + spread, false, 12, 160);
  }

  private hitEnemy(bullet: Phaser.Physics.Arcade.Image): void {
    const payload = bullet.getData("payload") as BulletData | undefined;
    bullet.destroy();
    if (!payload?.friendly) return;
    this.stats.hits += 1;
    this.enemyHp -= payload.damage;
    this.enemy.setTintFill(0xf0e6a8);
    this.time.delayedCall(50, () => {
      if (this.enemy.active) this.enemy.clearTint();
    });
    if (this.enemyHp <= 0) {
      this.enemy.destroy();
      this.stats.kills += 1;
      this.finish(true);
    }
  }

  private hitPlayer(bullet: Phaser.Physics.Arcade.Image): void {
    const payload = bullet.getData("payload") as BulletData | undefined;
    bullet.destroy();
    if (payload?.friendly) return;
    this.hp = Math.max(0, this.hp - (payload?.damage ?? 10));
    this.cameras.main.shake(80, 0.004);
    if (this.hp <= 0) this.finish(false);
  }

  private drawAimLine(): void {
    const g = this.children.getByName("aim") as Phaser.GameObjects.Graphics | null;
    const gfx = g ?? this.add.graphics().setName("aim");
    gfx.clear();
    const gun = GUNS[this.gun];
    const angle = this.aim - Phaser.Math.DegToRad(this.climb);
    const x = this.player.x + this.facing * 6;
    const y = this.player.y - (this.crouched ? 8 : 14);
    gfx.lineStyle(1, COLORS.muzzle, 0.55);
    gfx.beginPath();
    gfx.moveTo(x, y);
    gfx.lineTo(x + Math.cos(angle) * 22, y + Math.sin(angle) * 22);
    gfx.strokePath();
    if (gun.id === "shotgun") {
      gfx.lineStyle(1, COLORS.danger, 0.35);
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
  }

  private pauseGame(on: boolean): void {
    mustEl("#pause-overlay").hidden = !on;
    if (on) this.scene.pause();
    else this.scene.resume();
  }

  private finish(won: boolean): void {
    if (this.ended) return;
    this.ended = true;
    this.player.setVelocity(0, 0);
    this.showResult(this.stats.snapshot(this.hp, won));
  }

  private showResult(stats: RunStats): void {
    this.resultTitle.textContent = stats.won ? "房間肅清" : "任務失敗";
    this.resultStats.innerHTML = [
      `<li>命中率 ${accuracyText(stats)}</li>`,
      `<li>剩餘體力 ${stats.hp}</li>`,
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
