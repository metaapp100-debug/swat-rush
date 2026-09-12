export type StickState = {
  x: number;
  y: number;
  active: boolean;
};

export type ControlState = {
  move: StickState;
  aim: StickState;
  jumpPressed: boolean;
  crouch: boolean;
};

const DEAD = 0.18;

function clampStick(dx: number, dy: number, radius: number): { x: number; y: number } {
  const len = Math.hypot(dx, dy);
  if (len <= 0) return { x: 0, y: 0 };
  const scale = Math.min(len, radius) / len;
  return { x: (dx * scale) / radius, y: (dy * scale) / radius };
}

class Stick {
  readonly el: HTMLElement;
  readonly knob: HTMLElement;
  id: number | null = null;
  x = 0;
  y = 0;
  active = false;
  private originX = 0;
  private originY = 0;

  constructor(el: HTMLElement) {
    this.el = el;
    const knob = el.querySelector(".stick-knob");
    if (!(knob instanceof HTMLElement)) {
      throw new Error("stick knob missing");
    }
    this.knob = knob;
    this.bind();
  }

  private bind(): void {
    this.el.addEventListener("pointerdown", (ev) => {
      ev.preventDefault();
      this.el.setPointerCapture(ev.pointerId);
      this.id = ev.pointerId;
      const rect = this.el.getBoundingClientRect();
      this.originX = rect.left + rect.width / 2;
      this.originY = rect.top + rect.height / 2;
      this.active = true;
      this.update(ev.clientX, ev.clientY);
    });
    this.el.addEventListener("pointermove", (ev) => {
      if (this.id !== ev.pointerId) return;
      ev.preventDefault();
      this.update(ev.clientX, ev.clientY);
    });
    const end = (ev: PointerEvent) => {
      if (this.id !== ev.pointerId) return;
      this.reset();
    };
    this.el.addEventListener("pointerup", end);
    this.el.addEventListener("pointercancel", end);
  }

  private update(clientX: number, clientY: number): void {
    const radius = this.el.clientWidth / 2;
    const next = clampStick(clientX - this.originX, clientY - this.originY, radius);
    this.x = Math.abs(next.x) < DEAD ? 0 : next.x;
    this.y = Math.abs(next.y) < DEAD ? 0 : next.y;
    this.knob.style.transform = `translate(${next.x * 28}px, ${next.y * 28}px)`;
  }

  reset(): void {
    this.id = null;
    this.x = 0;
    this.y = 0;
    this.active = false;
    this.knob.style.transform = "translate(0, 0)";
  }
}

export class TouchControls {
  private left: Stick;
  private right: Stick;
  private jumpLatch = false;

  constructor() {
    const leftEl = document.querySelector("#stick-left");
    const rightEl = document.querySelector("#stick-right");
    if (!(leftEl instanceof HTMLElement) || !(rightEl instanceof HTMLElement)) {
      throw new Error("touch sticks missing");
    }
    this.left = new Stick(leftEl);
    this.right = new Stick(rightEl);
  }

  read(): ControlState {
    const jumpHeld = this.left.y < -0.55;
    const jumpPressed = jumpHeld && !this.jumpLatch;
    this.jumpLatch = jumpHeld;
    return {
      move: { x: this.left.x, y: this.left.y, active: this.left.active },
      aim: { x: this.right.x, y: this.right.y, active: this.right.active },
      jumpPressed,
      crouch: this.left.y > 0.5,
    };
  }

  reset(): void {
    this.left.reset();
    this.right.reset();
    this.jumpLatch = false;
  }
}
