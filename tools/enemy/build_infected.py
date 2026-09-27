"""
Gera o Infectado: o Rastreador tomado pelo vírus worm (Missão 3 — Zona de Contágio).

    python3 tools/enemy/build_infected.py     (rodar depois de build_enemy.py)

Parte de public/sprites/bot_hunter.png e aplica a infecção, quadro a quadro:
  - cromo escurecido e esverdeado (metal oxidado pelo vírus)
  - olhos e manchas vermelhas viram verde tóxico
  - veias verdes brilhantes escorrendo pelo corpo (mesmo padrão em todos os quadros)
  - uma placa do crânio faltando e faixas de "glitch" deslocadas em alguns quadros

Saída: public/sprites/bot_infected.png (mesmo layout de quadros do Rastreador).
"""

import os
import random

from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
SPRITES = os.path.join(HERE, '..', '..', 'public', 'sprites')
FW, FH = 40, 56

GREEN = (122, 255, 90, 255)
GREEN_L = (200, 255, 170, 255)
GREEN_D = (40, 150, 60, 255)


def infect_color(c):
    r, g, b, a = c
    if not a:
        return c
    # vermelho (olhos e manchas do vírus antigo) -> verde tóxico
    if r > 150 and g < 80 and b < 80:
        return GREEN if r > 220 else GREEN_D
    if r > 240 and g > 200 and b > 190 and r - b > 20:  # brilho do olho
        return GREEN_L
    # cromo -> metal oxidado esverdeado e mais escuro
    lum = (r + g + b) / 3
    k = 0.78
    return (int(lum * k * 0.82), int(lum * k * 0.98 + 6), int(lum * k * 0.84), a)


def main():
    src = Image.open(os.path.join(SPRITES, 'bot_hunter.png')).convert('RGBA')
    n = src.width // FW
    out = Image.new('RGBA', src.size, (0, 0, 0, 0))
    veins_rng = random.Random(42)
    # veias: caminhos fixos relativos ao quadro (o corpo mexe pouco entre quadros)
    veins = []
    for _ in range(7):
        x, y = veins_rng.randint(10, 30), veins_rng.randint(6, 30)
        path = []
        for _ in range(veins_rng.randint(5, 10)):
            path.append((x, y))
            x += veins_rng.choice((-1, 0, 0, 1))
            y += 1
        veins.append(path)
    for i in range(n):
        f = src.crop((i * FW, 0, i * FW + FW, FH))
        px = f.load()
        for y in range(FH):
            for x in range(FW):
                px[x, y] = infect_color(px[x, y])
        for path in veins:
            for k, (x, y) in enumerate(path):
                if 0 <= x < FW and 0 <= y < FH and px[x, y][3]:
                    px[x, y] = GREEN_L if k == 0 else GREEN
        rng = random.Random(100 + i)
        if i < 12:
            # faixas deslocadas (o corpo "falha" enquanto o vírus reescreve o firmware)
            for _ in range(2 if i % 3 else 3):
                y = rng.randrange(4, FH - 6)
                band = f.crop((0, y, FW, y + 2))
                f.paste((0, 0, 0, 0), (0, y, FW, y + 2))
                f.paste(band, (rng.choice((-2, -1, 1, 2)), y), band)
        out.paste(f, (i * FW, 0))
    out.save(os.path.join(SPRITES, 'bot_infected.png'))
    print('ok', out.size)


if __name__ == '__main__':
    main()
