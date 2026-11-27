export class Effects {
  constructor() {
    this.items = [];
  }

  hit(x, y, color, count = 8) {
    this.items.push({kind: 'flash', x, y, life: .12, length: .12, color, size: count + 11});
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 65 + Math.random() * 260;
      const length = .17 + Math.random() * .36;
      this.items.push({
        kind: 'spark', x, y, life: length, length, color,
        vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
        size: 1.2 + Math.random() * 2.2,
      });
    }
  }

  dust(x, y, drift, count = 6) {
    for (let i = 0; i < count; i++) {
      const length = .24 + Math.random() * .21;
      this.items.push({
        kind: 'dust', x: x - 16 + Math.random() * 32, y, life: length, length,
        vx: drift * 70 + (Math.random() - .5) * 97, vy: -15 - Math.random() * 23,
        size: 3 + Math.random() * 6,
      });
    }
  }

  ring(x, y, color, size) {
    this.items.push({kind: 'ring', x, y, life: .43, length: .43, color, size});
  }

  beam(x, y, face, reach) {
    this.items.push({kind: 'wave', x, y, face, life: .31, length: .31, size: reach});
  }

  update(dt) {
    for (const item of this.items) {
      item.life -= dt;
      if (item.kind === 'spark' || item.kind === 'dust') {
        item.x += item.vx * dt;
        item.y += item.vy * dt;
        if (item.kind === 'spark') item.vy += dt * 530;
      }
    }
    this.items = this.items.filter(item => item.life > 0);
  }
}
