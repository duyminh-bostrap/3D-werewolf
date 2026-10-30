export class CameraDrag {
  private pointer: { id: number; startX: number; startY: number; x: number; y: number; moved: boolean } | null = null;

  start(id: number, x: number, y: number) {
    if (!this.pointer) this.pointer = { id, startX: x, startY: y, x, y, moved: false };
  }

  move(id: number, x: number, y: number) {
    const p = this.pointer;
    if (!p || p.id !== id) return null;
    const delta = { dx: x - p.x, dy: y - p.y };
    p.x = x;
    p.y = y;
    if (Math.hypot(x - p.startX, y - p.startY) > 8) p.moved = true;
    return delta;
  }

  end(id: number, x: number, y: number) {
    const p = this.pointer;
    if (!p || p.id !== id) return null;
    const tap = !p.moved && Math.hypot(x - p.startX, y - p.startY) <= 8;
    this.pointer = null;
    return tap;
  }

  clear() { this.pointer = null; }
}
