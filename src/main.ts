import Phaser from "phaser";
import { GAME_H, GAME_W } from "./gameConfig";
import { PlayScene } from "./scenes/PlayScene";

const hud = document.querySelector("#hud");
const touch = document.querySelector("#touch");
const startOverlay = document.querySelector("#start-overlay");
const startBtn = document.querySelector("#start-btn");

if (
  !(hud instanceof HTMLElement) ||
  !(touch instanceof HTMLElement) ||
  !(startOverlay instanceof HTMLElement) ||
  !(startBtn instanceof HTMLButtonElement)
) {
  throw new Error("shell markup missing");
}

const game = new Phaser.Game({
  type: Phaser.CANVAS,
  parent: "game",
  width: GAME_W,
  height: GAME_H,
  backgroundColor: "#1c221c",
  pixelArt: true,
  antialias: false,
  roundPixels: true,
  physics: {
    default: "arcade",
    arcade: {
      gravity: { x: 0, y: 0 },
      debug: false,
    },
  },
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  input: {
    activePointers: 3,
  },
  scene: [PlayScene],
});

startBtn.addEventListener("click", () => {
  startOverlay.hidden = true;
  hud.hidden = false;
  touch.hidden = false;
  game.sound.unlock();
  if (game.scene.isPaused("play")) {
    game.scene.resume("play");
  }
});

document.addEventListener(
  "touchmove",
  (event) => {
    event.preventDefault();
  },
  { passive: false },
);

window.addEventListener("orientationchange", () => {
  game.scale.refresh();
});
