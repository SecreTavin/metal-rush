import Phaser from 'phaser';
import { makeSheet, makeTexture } from '../gfx/art/kit';

/* Arte do sistema de run: escudo, fragmentos, cura, terminal de upgrade. */

export function generateRunArt(scene: Phaser.Scene) {
  if (scene.textures.exists('frag')) return;

  // Bolha hexagonal do Firewall
  makeTexture(scene, 'shield_bubble', 40, 54, (ctx) => {
    ctx.strokeStyle = 'rgba(143,240,255,0.9)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.ellipse(20, 27, 18, 25, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(143,240,255,0.35)';
    for (let y = 6; y < 50; y += 7) {
      for (let x = (y / 7) % 2 ? 7 : 3; x < 38; x += 8) {
        const dx = (x - 20) / 18;
        const dy = (y - 27) / 25;
        if (dx * dx + dy * dy > 0.85) continue;
        ctx.beginPath();
        for (let k = 0; k < 6; k++) {
          const a = (k / 6) * Math.PI * 2;
          const px = x + Math.cos(a) * 3;
          const py = y + Math.sin(a) * 3;
          if (k === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.stroke();
      }
    }
  });

  // Fragmento de dados (losango que gira: 4 quadros)
  makeSheet(scene, 'frag', 8, 10, 4, (ctx, i) => {
    const w = [4, 3, 1, 3][i];
    ctx.fillStyle = '#0a3a50';
    ctx.beginPath();
    ctx.moveTo(4, 0);
    ctx.lineTo(4 + w, 5);
    ctx.lineTo(4, 10);
    ctx.lineTo(4 - w, 5);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#8ff0ff';
    ctx.beginPath();
    ctx.moveTo(4, 1);
    ctx.lineTo(4 + Math.max(0.5, w - 1), 5);
    ctx.lineTo(4, 9);
    ctx.lineTo(4 - Math.max(0.5, w - 1), 5);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(3, 2, 1, 3);
  });
  scene.anims.create({ key: 'frag', frames: [0, 1, 2, 3].map((frame) => ({ key: 'frag', frame })), frameRate: 10, repeat: -1 });

  // Kit de reparo (+1 de vida)
  makeTexture(scene, 'heal', 12, 12, (ctx) => {
    ctx.fillStyle = '#07080c';
    ctx.fillRect(0, 0, 12, 12);
    ctx.fillStyle = '#4a2a6a';
    ctx.fillRect(1, 1, 10, 10);
    ctx.fillStyle = '#7aff9a';
    ctx.fillRect(5, 2, 2, 8);
    ctx.fillRect(2, 5, 8, 2);
    ctx.fillStyle = '#d8ffe0';
    ctx.fillRect(5, 2, 1, 3);
  });

  // Terminal de upgrade (onde se escolhe a skill)
  makeSheet(scene, 'upgrade_terminal', 30, 46, 2, (ctx, used) => {
    ctx.fillStyle = '#07080c';
    ctx.fillRect(6, 16, 18, 30);
    ctx.fillRect(0, 42, 30, 4);
    ctx.fillStyle = '#2e1a48';
    ctx.fillRect(7, 17, 16, 28);
    ctx.fillStyle = '#4a2a6a';
    ctx.fillRect(7, 17, 2, 28);
    // tela
    ctx.fillStyle = '#07080c';
    ctx.fillRect(2, 0, 26, 18);
    ctx.fillStyle = used ? '#1a1a24' : '#123a50';
    ctx.fillRect(3, 1, 24, 16);
    if (!used) {
      ctx.fillStyle = '#8ff0ff';
      ctx.fillRect(5, 4, 4, 1);
      ctx.fillRect(5, 7, 12, 1);
      ctx.fillRect(5, 10, 8, 1);
      ctx.fillStyle = '#ff5aff';
      ctx.fillRect(19, 9, 5, 5);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(21, 10, 1, 3);
      ctx.fillRect(20, 11, 3, 1);
    }
    // teclado
    ctx.fillStyle = '#5a4a8a';
    ctx.fillRect(4, 22, 22, 4);
    ctx.fillStyle = '#07080c';
    for (let x = 5; x < 25; x += 3) ctx.fillRect(x, 23, 1, 2);
    ctx.fillStyle = used ? '#3a3a48' : '#8ff0ff';
    ctx.fillRect(13, 32, 4, 4);
  });
}
