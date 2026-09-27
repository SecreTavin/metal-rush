"""
Desenha as armas e itens novos em pixel art (mesma paleta e contorno do herói).

    python3 tools/weapons/build_weapons.py

Saída:
    tools/weapons/out/*.png      cada sprite em tamanho real
    tools/weapons/preview.png    prancha ampliada para aprovação do visual

Requer Pillow (pip install pillow).
"""

import math
import os

from PIL import Image, ImageDraw, ImageFont

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, 'out')
SPRITES = os.path.join(HERE, '..', '..', 'public', 'sprites')


def rgb(h, a=255):
    h = h.lstrip('#')
    return (int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16), a)


T = (0, 0, 0, 0)
OUTLINE = rgb('000105')

# paleta compartilhada com o herói
CYAN = rgb('59c2f4')
CYAN_L = rgb('a8f0fc')
CYAN_CORE = rgb('e6fcff')
CYAN_D = rgb('2a6f9a')
MAGENTA = rgb('e65aff')
MAGENTA_L = rgb('ffbeff')
SLEEVE = rgb('4a2a6a')
SLEEVE_D = rgb('2e1a48')
CUFF = rgb('c7c63e')
SKIN = rgb('c46a53')
SKIN_L = rgb('f6b089')
STEEL_L = rgb('d7e9f0')
STEEL = rgb('8da7bb')
STEEL_D = rgb('617187')
DARK = rgb('39415a')


# ---------------------------------------------------------------- utilitários

def canvas(w, h):
    return Image.new('RGBA', (w, h), T)


def put(im, x, y, c):
    x, y = int(round(x)), int(round(y))
    if 0 <= x < im.width and 0 <= y < im.height:
        im.putpixel((x, y), c)


def rect(im, x0, y0, x1, y1, c):
    x0, y0, x1, y1 = (int(round(v)) for v in (x0, y0, x1, y1))
    for y in range(y0, y1 + 1):
        for x in range(x0, x1 + 1):
            put(im, x, y, c)


def ellipse(im, cx, cy, rx, ry, c):
    for y in range(int(cy - ry) - 1, int(cy + ry) + 2):
        for x in range(int(cx - rx) - 1, int(cx + rx) + 2):
            if ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1.0:
                put(im, x, y, c)


def poly(im, pts, c):
    d = ImageDraw.Draw(im)
    d.polygon(pts, fill=c)


def line(im, x0, y0, x1, y1, c, w=1):
    n = int(max(abs(x1 - x0), abs(y1 - y0))) + 1
    for i in range(n + 1):
        t = i / max(n, 1)
        x, y = x0 + (x1 - x0) * t, y0 + (y1 - y0) * t
        for dx in range(w):
            for dy in range(w):
                put(im, x + dx - w // 2, y + dy - w // 2, c)


def outline(im, c=OUTLINE):
    """Contorno de 1px em volta de tudo que é opaco (estilo do herói)."""
    src = im.copy()
    for y in range(im.height):
        for x in range(im.width):
            if src.getpixel((x, y))[3] > 0:
                continue
            for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                nx, ny = x + dx, y + dy
                if 0 <= nx < im.width and 0 <= ny < im.height and src.getpixel((nx, ny))[3] > 0 and src.getpixel((nx, ny)) != c:
                    im.putpixel((x, y), c)
                    break
    return im


def grid(rows, pal):
    w = len(rows[0])
    for i, r in enumerate(rows):
        assert len(r) == w, f'linha {i} tem {len(r)} (esperado {w}): {r}'
    im = canvas(w, len(rows))
    for y, r in enumerate(rows):
        for x, ch in enumerate(r):
            if ch != '.':
                im.putpixel((x, y), pal[ch])
    return im


def recolor(im, fn):
    out = im.copy()
    for y in range(im.height):
        for x in range(im.width):
            p = im.getpixel((x, y))
            if p[3]:
                out.putpixel((x, y), fn(p, x, y))
    return out


def paste(dst, src, x, y):
    dst.alpha_composite(src, (int(x), int(y)))


# fonte 3x5 para textos minúsculos nos sprites
DIGITS = {
    '1': ['.#.', '##.', '.#.', '.#.', '###'],
    '4': ['#.#', '#.#', '###', '..#', '..#'],
    'H': ['#.#', '#.#', '###', '#.#', '#.#'],
    'Z': ['###', '..#', '.#.', '#..', '###'],
    '8': ['###', '#.#', '###', '#.#', '###'],
    'S': ['###', '#..', '###', '..#', '###'],
}


def text3(im, x, y, s, c):
    for ch in s:
        for dy, row in enumerate(DIGITS[ch]):
            for dx, v in enumerate(row):
                if v == '#':
                    put(im, x + dx, y + dy, c)
        x += 4


def text3v(im, x, y, s, c):
    """Texto 3x5 girado 90 graus (lê de baixo para cima); (x, y) é o canto inferior esquerdo."""
    for ch in s:
        for r, row in enumerate(DIGITS[ch]):
            for col, v in enumerate(row):
                if v == '#':
                    put(im, x + r, y - col, c)
        y -= 4


def sleeve(im, y=6):
    """Braço do moletom (igual ao do MacBook): ombro em x=0, mão em x~11."""
    rect(im, 0, y, 10, y, OUTLINE)
    rect(im, 0, y + 1, 8, y + 2, SLEEVE)
    rect(im, 0, y + 3, 8, y + 3, SLEEVE_D)
    rect(im, 0, y + 4, 10, y + 4, OUTLINE)
    rect(im, 9, y + 1, 9, y + 3, CYAN)
    rect(im, 10, y + 1, 10, y + 3, CUFF)


# ================================================================ 1. ESCUDO 144HZ

def monitor_icon():
    """Monitor gamer de frente: borda fina, tela 144Hz, fita RGB e base."""
    im = canvas(26, 22)
    rect(im, 1, 1, 24, 15, rgb('1c1e28'))  # moldura
    for y in range(2, 15):  # tela em degradê
        t = (y - 2) / 12
        c = tuple(int(a + (b - a) * t) for a, b in zip(rgb('7a3aff')[:3], rgb('1fb8ff')[:3])) + (255,)
        rect(im, 2, y, 23, y, c if y % 2 else tuple(max(0, v - 18) for v in c[:3]) + (255,))
    text3(im, 5, 5, '144', CYAN_CORE)
    text3(im, 17, 5, 'HZ', MAGENTA_L)
    line(im, 4, 12, 21, 12, rgb('e6fcff', 255))  # barra de FPS
    rect(im, 4, 12, 9, 12, rgb('7aff9a'))
    put(im, 22, 3, rgb('ffffff'))  # brilho
    put(im, 21, 2, rgb('ffffff'))
    for i, x in enumerate(range(3, 23)):  # fita RGB embaixo da tela
        hue = [rgb('ff4a5a'), rgb('ffcf3a'), rgb('7aff9a'), rgb('59c2f4'), rgb('e65aff')][(i // 4) % 5]
        put(im, x, 16, hue)
    rect(im, 11, 17, 14, 18, rgb('3a3d4c'))  # pescoço
    rect(im, 7, 19, 18, 19, rgb('2a2d3a'))  # base
    rect(im, 8, 19, 17, 19, rgb('4a4e60'))
    return outline(im)


def monitor_shield(state):
    """Monitor em modo retrato usado como escudo; o braço da tela vira a alça.
    state: 'on' (defendendo), 'hit' (acabou de levar tiro), 'off' (recarregando)."""
    im = canvas(28, 30)
    sleeve(im, 12)
    # alça (braço VESA) da mão até a traseira do monitor
    rect(im, 11, 13, 15, 15, rgb('3a3d4c'))
    rect(im, 11, 14, 15, 14, rgb('5a5e72'))
    # espessura lateral (perspectiva)
    rect(im, 15, 1, 17, 28, rgb('2a2d3a'))
    rect(im, 16, 1, 16, 28, rgb('4a4e60'))
    # frente
    rect(im, 17, 0, 26, 29, rgb('1c1e28'))
    if state == 'off':
        for y in range(2, 28):
            rect(im, 18, y, 25, y, rgb('14141e') if y % 2 else rgb('1a1a28'))
        # rachaduras e contagem
        for x, y in ((19, 5), (20, 6), (20, 7), (21, 8), (22, 8), (23, 9), (21, 9), (20, 10)):
            put(im, x, y, rgb('5a5e72'))
        text3(im, 20, 13, '8', rgb('ff4a5a'))
        put(im, 25, 26, rgb('ff4a5a'))  # LED de standby
    else:
        for y in range(2, 28):
            t = (y - 2) / 25
            c = tuple(int(a + (b - a) * t) for a, b in zip(rgb('7a3aff')[:3], rgb('1fb8ff')[:3])) + (255,)
            if state == 'hit':
                c = tuple(min(255, v + 120) for v in c[:3]) + (255,)
            rect(im, 18, y, 25, y, c if y % 2 else tuple(max(0, v - 18) for v in c[:3]) + (255,))
        # emblema de escudo hexagonal
        hexa = [(21, 6), (22, 6), (24, 8), (24, 11), (22, 13), (21, 13), (19, 11), (19, 8)]
        col = rgb('ffffff') if state == 'hit' else CYAN_CORE
        for i in range(len(hexa)):
            x0, y0 = hexa[i]
            x1, y1 = hexa[(i + 1) % len(hexa)]
            line(im, x0, y0, x1, y1, col)
        rect(im, 21, 9, 22, 10, MAGENTA_L if state == 'on' else rgb('ffffff'))
        # "144HZ" girado junto com a tela (modo retrato)
        text3v(im, 20, 26, '144', CYAN_CORE)
        put(im, 25, 2, rgb('ffffff'))
        put(im, 24, 3, rgb('ffffff'))
    # fita RGB na lateral da moldura
    rgbs = [rgb('ff4a5a'), rgb('ffcf3a'), rgb('7aff9a'), rgb('59c2f4'), rgb('e65aff')]
    for i, y in enumerate(range(2, 28)):
        put(im, 26, y, rgbs[(i // 5) % 5] if state != 'off' else rgb('2a2d3a'))
    return outline(im)


# ================================================================ 2. TÁ NA HORA DE MORFAR

TOY = {
    'o': OUTLINE,
    'R': rgb('ff3b3b'), 'r': rgb('c41e3a'),
    'W': rgb('ffffff'),
    'Y': rgb('ffd83a'), 'y': rgb('e09a1a'),
    'B': rgb('3a8cff'), 'b': rgb('1f4fbf'),
    'K': rgb('14141e'), 'v': rgb('4a5a8a'),
    'S': rgb('e8ecf8'), 's': rgb('9098b8'),
    'G': rgb('4be36a'), 'P': rgb('ff6ad5'),
}

HELMET = [
    '.........oYYo........',
    '.......ooYyYoooo.....',
    '....oooRRRyRRRRRoo...',
    '...oRRRRRRRRRRRRWRo..',
    '..oRRRRRRRRRRRRRRWRo.',
    '..oRRRYRRRRRRRRRRRRo.',
    '.oRRRRYYRRRRRRRRRRRo.',
    '.oRRRYYRRRRooooooooo.',
    '.orRRYYYYRoKKKKKKKKKo',
    '.orRRRYYRRoKWvKKKKKKo',
    '.orRRRYRRRoKWKKKKKKKo',
    '.orRRGRRRRoKvKKKKKKKo',
    '.orrGGGRRRRoooooooooo',
    '.oorrGRRRRRRRRoSsSsSo',
    '..oorrrRRRRRRRoSsSsSo',
    '....oorrrrrrrrrooooo.',
    '......ooooooooooo....',
]

CHEST = [
    'oooooooooooooo',
    'oRRRRRRRRRRRRo',
    'oRWWRRRRRRWWRo',
    'oRRWWRRRRWWRRo',
    'oRRRWWRRWWRRRo',
    'oRRRRWWWWRRRRo',
    'orRRRRWWRRPRRo',
    'orRRRRRRRPPPro',
    'orrRRRRRRRPrro',
    'oooooooooooooo',
    'oBBBBoYYoBBBBo',
    'obbbboyyobbbbo',
    'oooooooooooooo',
]

# braçadeira de plástico por cima da manga
ARMBAND = [
    'oooooo',
    'oYYYYo',
    'oyyyyo',
    'oooooo',
]


def toy_icon():
    im = canvas(24, 22)
    paste(im, grid(HELMET, TOY), 1, 2)
    for x, y in ((0, 1), (22, 0), (23, 12)):  # brilhinhos
        put(im, x, y, TOY['Y'])
    put(im, 21, 1, TOY['W'])
    return im


def hero_frame(i=0):
    sheet = Image.open(os.path.join(SPRITES, 'hero.png')).convert('RGBA')
    return sheet.crop((i * 32, 0, i * 32 + 32, 48))


def laptop_frame(i=0):
    sheet = Image.open(os.path.join(SPRITES, 'hero_laptop.png')).convert('RGBA')
    return sheet.crop((i * 28, 0, i * 28 + 28, 16))


def hero_morph(rainbow_phase=None):
    """Herói de armadura de brinquedo (quadro parado + braço do MacBook)."""
    im = canvas(48, 56)
    paste(im, hero_frame(0), 4, 4)
    paste(im, grid(CHEST, TOY), 4 + 10, 4 + 18)
    paste(im, grid(HELMET, TOY), 4 + 10, 4 + 1)
    arm = laptop_frame(0)
    paste(arm, grid(ARMBAND, TOY), 3, 5)
    paste(im, arm, 4 + 14, 4 + 16)
    if rainbow_phase is not None:
        im = rainbow_aura(im, rainbow_phase)
    return im


def rainbow_aura(im, phase):
    cols = [rgb('ff4a5a'), rgb('ffcf3a'), rgb('7aff9a'), rgb('59c2f4'), rgb('e65aff')]
    out = im.copy()
    for y in range(im.height):
        for x in range(im.width):
            if im.getpixel((x, y))[3]:
                continue
            near = any(
                0 <= x + dx < im.width and 0 <= y + dy < im.height and im.getpixel((x + dx, y + dy))[3]
                for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1), (2, 0), (-2, 0), (0, 2), (0, -2))
            )
            if near:
                c = cols[((x + y) // 3 + phase) % len(cols)]
                out.putpixel((x, y), c[:3] + (200,))
    for x, y in ((3, 10), (42, 6), (44, 30), (2, 40), (38, 50)):  # estrelinhas
        for dx, dy in ((0, 0), (1, 0), (-1, 0), (0, 1), (0, -1)):
            put(out, x + dx, y + dy, rgb('ffffff') if (dx, dy) == (0, 0) else cols[(phase + x) % 5])
    return out


# ================================================================ 3. MASSAGEM DEV (cabo VGA)

VGA_BLUE = rgb('2f5bd8')
VGA_BLUE_L = rgb('6f98ff')
VGA_BLUE_D = rgb('1c348a')
CABLE = rgb('1a1a24')
CABLE_L = rgb('4a4e60')


def vga_plug(im, x, y, facing=1):
    """Conector VGA de lado: capa azul, parafusos, carcaça metálica e pinos."""
    # capa azul
    rect(im, x, y, x + 4, y + 6, VGA_BLUE)
    rect(im, x, y, x + 4, y, VGA_BLUE_L)
    rect(im, x, y + 6, x + 4, y + 6, VGA_BLUE_D)
    # parafusos
    put(im, x + 2, y - 1, STEEL_L)
    put(im, x + 2, y + 7, STEEL_L)
    # carcaça D-sub
    sx = x + 5 if facing > 0 else x - 2
    rect(im, sx, y + 1, sx + 1, y + 5, STEEL)
    rect(im, sx, y + 1, sx + 1, y + 1, STEEL_L)
    pin = sx + 2 if facing > 0 else sx - 1
    for py in (y + 2, y + 3, y + 4):
        put(im, pin, py, rgb('ffcf3a'))


def cable_path(im, pts, sweet=None):
    for (x0, y0), (x1, y1) in zip(pts, pts[1:]):
        line(im, x0, y0, x1, y1, CABLE, 2)
    for (x0, y0), (x1, y1) in zip(pts, pts[1:]):
        line(im, x0, y0 - 1, x1, y1 - 1, CABLE_L)
    if sweet:
        for (x0, y0), (x1, y1) in zip(pts[sweet:], pts[sweet + 1:]):
            line(im, x0, y0 - 1, x1, y1 - 1, rgb('ffcf3a'))


def ferrite(im, x, y):
    rect(im, x, y - 2, x + 3, y + 2, rgb('2a2d3a'))
    rect(im, x, y - 2, x + 3, y - 2, rgb('5a5e72'))


def vga_icon():
    im = canvas(24, 22)
    # cabo enrolado
    for a in range(0, 360, 4):
        r = math.radians(a)
        for rr, c in ((7.5, CABLE), (6.5, CABLE_L)):
            put(im, 10 + math.cos(r) * rr, 10 + math.sin(r) * rr * 0.8, c)
        put(im, 11 + math.cos(r) * 4.5, 10 + math.sin(r) * 3.6, CABLE)
    ferrite(im, 15, 16)
    line(im, 18, 16, 19, 12, CABLE, 2)
    vga_plug(im, 16, 4)
    return outline(im)


def whip_frame(kind):
    """Braço + chicote. kind: 'hold', 'windup', 'crack'."""
    W, H = 110, 44
    im = canvas(W, H)
    hy = 20
    sleeve(im, hy - 3)
    vga_plug(im, 12, hy - 3)  # conector da mão (a pega)
    rect(im, 11, hy - 1, 12, hy + 1, SKIN)  # dedos por cima
    start = (19, hy)
    if kind == 'hold':
        pts = [start, (22, hy + 6), (21, hy + 13), (17, hy + 18), (14, hy + 20)]
        cable_path(im, pts)
        ferrite(im, 18, hy + 17)
        vga_plug(im, 9, hy + 18, -1)
    elif kind == 'windup':
        pts = [start, (16, hy - 8), (8, hy - 14), (-2, hy - 14)]
        pts = [(x + 8, y) for x, y in pts]
        pts[0] = start
        cable_path(im, pts)
        ferrite(im, 8, hy - 14)
        vga_plug(im, 1, hy - 17, -1)
    else:  # crack: cabo esticado em onda, a ponta é a zona perfeita
        pts = []
        for i in range(0, 64, 3):
            x = start[0] + i
            amp = 3.5 * math.sin(i / 64 * math.pi) * math.cos(i / 8)
            pts.append((x, hy + amp))
        cable_path(im, pts, sweet=int(len(pts) * 0.72))
        ex, ey = pts[-1]
        ferrite(im, ex - 14, ey)
        vga_plug(im, ex, ey - 3)
        # estalo na ponta
        cx, cy = ex + 10, ey
        for a in range(0, 360, 45):
            r = math.radians(a)
            line(im, cx + math.cos(r) * 2, cy + math.sin(r) * 2, cx + math.cos(r) * 5, cy + math.sin(r) * 5, rgb('ffcf3a'))
        put(im, cx, cy, rgb('ffffff'))
        ellipse(im, cx, cy, 1.2, 1.2, rgb('ffffff'))
    return outline(im)


# ================================================================ 4. SÊNIOR VIBE CODING (pet holográfico)

def holo_dog(mood, step=0):
    """Filhote holográfico (cabeça grande, corpo pequeno). mood: 'cute' ou 'angry'. step: quadro da corrida."""
    im = canvas(26, 20)
    if mood == 'cute':
        base, light, dark, core = CYAN, CYAN_L, CYAN_D, CYAN_CORE
    else:
        base, light, dark, core = rgb('ff3a6a'), rgb('ff9ab8'), rgb('8a1238'), rgb('ffe0ea')
    ly = 1 if step else 0
    # rabo
    if mood == 'cute':
        line(im, 4, 11, 2, 7 - ly, base, 2)
        put(im, 2, 6 - ly, light)
    else:
        line(im, 4, 11, 0, 9, base, 2)
    # patas (alternam na corrida)
    legs = ((5, 11), (7, 13)) if not step else ((4, 12), (8, 12))
    for lx in (legs[0][0], legs[0][1]):
        rect(im, lx, 14, lx + 1, 17, dark)
    for lx in (legs[1][0], legs[1][1]):
        rect(im, lx, 14, lx + 1, 17, base)
        put(im, lx, 17, light)
    # corpo pequeno
    ellipse(im, 8.5, 12, 5, 3.4, base)
    ellipse(im, 9, 13.5, 3.5, 1.4, light)
    # coleira de LED
    for y in range(8, 14):
        put(im, 13, y, MAGENTA if mood == 'cute' else rgb('ffcf3a'))
    put(im, 14, 13, core)
    # cabeça grande e redonda + focinho curto
    ellipse(im, 17.5, 8, 5.6, 5.2, base)
    ellipse(im, 17, 6, 3.5, 2.5, light)
    ellipse(im, 22.5, 10, 2.2, 1.7, light)
    if mood == 'cute':
        # orelha caída pendurada do lado da cabeça
        poly(im, [(13, 3), (16, 3), (15, 11), (13, 10)], dark)
        # antena
        line(im, 19, 3, 20, 0, light)
        put(im, 20, 0, core)
        # olhão com brilho
        rect(im, 19, 5, 20, 8, rgb('0b2a44'))
        put(im, 19, 5, rgb('ffffff'))
        put(im, 20, 6, rgb('ffffff'))
        put(im, 21, 9, rgb('ff8ad8'))  # bochecha
        put(im, 24, 9, rgb('0b2a44'))  # nariz
        put(im, 22, 12, rgb('ff8ad8'))  # linguinha
    else:
        # orelhas em pé
        poly(im, [(13, 5), (14, -1), (17, 3)], dark)
        poly(im, [(17, 3), (19, -1), (20, 4)], base)
        # pelo eriçado
        for x in (5, 8, 11):
            poly(im, [(x, 10), (x + 1, 6), (x + 2, 10)], base)
        # olho estreito com sobrancelha
        line(im, 18, 5, 21, 7, rgb('14141e'))
        rect(im, 19, 7, 20, 7, rgb('ffcf3a'))
        # rosnado: boca aberta com dentes
        rect(im, 20, 10, 25, 12, rgb('3a0414'))
        for x in (21, 23, 25):
            put(im, x, 10, rgb('ffffff'))
        put(im, 22, 12, rgb('ffffff'))
        put(im, 24, 12, rgb('ffffff'))
        put(im, 25, 9, rgb('14141e'))
    im = outline(im, dark if mood == 'cute' else rgb('3a0414'))
    # efeito holograma: linhas de varredura suaves + transparência
    out = canvas(26, 20)
    for y in range(20):
        for x in range(26):
            p = im.getpixel((x, y))
            if not p[3]:
                continue
            c = p[:3]
            a = 230
            if (y + step * 2) % 4 == 0:
                c = tuple(min(255, v + 45) for v in c)
                a = 190
            out.putpixel((x, y), c + (a,))
    return out


def dog_projector():
    """Pequeno emissor que fica no ombro do herói e projeta o pet."""
    im = canvas(8, 6)
    rect(im, 1, 2, 6, 4, DARK)
    rect(im, 2, 1, 5, 1, STEEL)
    put(im, 3, 2, CYAN_CORE)
    put(im, 4, 2, CYAN)
    return outline(im)


# ================================================================ 5. ARDUINO E VOLTANDO (Raspberry Pi)

PCB = rgb('1f8a3a')
PCB_L = rgb('3fbf5a')
PCB_D = rgb('125a26')
GOLD = rgb('e0b030')


def raspberry():
    """Placa vista de cima: GPIO dourado, portas USB, chip e o logo da framboesa."""
    im = canvas(18, 12)
    rect(im, 1, 1, 16, 10, PCB)
    rect(im, 1, 1, 16, 1, PCB_L)
    rect(im, 1, 10, 16, 10, PCB_D)
    for x in range(2, 13):  # GPIO: duas fileiras de pinos
        put(im, x, 2, GOLD if x % 2 else rgb('8a6a1a'))
        put(im, x, 3, rgb('8a6a1a') if x % 2 else GOLD)
    rect(im, 14, 2, 16, 4, STEEL)  # USB
    rect(im, 14, 2, 16, 2, STEEL_L)
    rect(im, 14, 6, 16, 8, STEEL)  # USB/ethernet
    rect(im, 14, 6, 16, 6, STEEL_L)
    rect(im, 8, 5, 10, 7, rgb('14141e'))  # chip
    put(im, 8, 5, rgb('4a4e60'))
    # framboesa
    rect(im, 3, 6, 4, 7, rgb('e8305a'))
    put(im, 3, 6, rgb('ff7a9a'))
    put(im, 4, 8, rgb('b0183a'))
    put(im, 3, 8, rgb('e8305a'))
    put(im, 3, 5, PCB_L)
    put(im, 4, 5, rgb('7aff7a'))
    # LEDs
    put(im, 12, 9, rgb('ff4a5a'))
    put(im, 11, 9, rgb('7aff9a'))
    # micro HDMI embaixo
    put(im, 6, 10, STEEL)
    put(im, 9, 10, STEEL)
    return outline(im)


def spin_frames(img, n=8):
    frames = []
    for i in range(n):
        r = img.rotate(-i * 360 / n, resample=Image.NEAREST, expand=True)
        f = canvas(24, 24)
        paste(f, r, (24 - r.width) // 2, (24 - r.height) // 2)
        frames.append(f)
    return frames


# ================================================================ poses (braço que gira no ombro)

SHOULDER = (19, 28)  # ombro do herói quando o quadro é colado em (4, 4)


def rotated_at(dst, img, pivot, angle, at):
    """Cola `img` girada `angle` graus (horário, eixo y para baixo) com `pivot` sobre o ponto `at`."""
    R = max(img.width, img.height) + 4
    pad = canvas(2 * R, 2 * R)
    paste(pad, img, R - pivot[0], R - pivot[1])
    r = pad.rotate(-angle, resample=Image.NEAREST)
    paste(dst, r, at[0] - R, at[1] - R)


def rot_pt(pt, pivot, angle, at):
    a = math.radians(angle)
    dx, dy = pt[0] - pivot[0], pt[1] - pivot[1]
    return (at[0] + dx * math.cos(a) - dy * math.sin(a), at[1] + dx * math.sin(a) + dy * math.cos(a))


def bezier(p0, p1, p2, n=16):
    return [
        ((1 - t) ** 2 * p0[0] + 2 * (1 - t) * t * p1[0] + t * t * p2[0],
         (1 - t) ** 2 * p0[1] + 2 * (1 - t) * t * p1[1] + t * t * p2[1])
        for t in (i / n for i in range(n + 1))
    ]


def fist(im, x, y):
    """Mão fechada (3x5) segurando algo; os dedos ficam por cima."""
    rect(im, x, y, x + 2, y + 4, SKIN)
    rect(im, x, y, x + 2, y, SKIN_L)
    put(im, x + 2, y + 2, rgb('a14732'))


def whip_arm():
    """Braço + punho fechado segurando o conector VGA (o cabo sai pela frente)."""
    im = canvas(22, 11)
    sleeve(im, 3)
    rect(im, 12, 4, 17, 6, VGA_BLUE)  # conector atravessando o punho
    rect(im, 12, 4, 17, 4, VGA_BLUE_L)
    put(im, 18, 5, STEEL)
    fist(im, 11, 3)
    return outline(im), (0, 5), (19, 5)  # imagem, ombro, saída do cabo


def throw_arm(open_hand):
    im = canvas(18, 11)
    sleeve(im, 3)
    if open_hand:  # dedos esticados após soltar
        rect(im, 11, 4, 14, 6, SKIN)
        rect(im, 11, 4, 14, 4, SKIN_L)
        put(im, 12, 3, SKIN_L)
    else:
        fist(im, 11, 3)
    return outline(im), (0, 5), (13, 5)


def cable_layer(w, h, pts, sweet=None, ferrite_at=None, plug=None):
    im = canvas(w, h)
    cable_path(im, pts, sweet)
    if ferrite_at:
        ferrite(im, *ferrite_at)
    if plug:
        vga_plug(im, *plug)
    return outline(im)


def whip_pose(kind):
    """Herói com o chicote VGA, sem o MacBook: 'rest', 'windup' ou 'crack'."""
    ox = 22 if kind == 'windup' else 4  # espaço atrás do herói para o cabo no preparo
    W = 130 if kind == 'crack' else 70
    im = canvas(W, 60)
    arm, pivot, tip = whip_arm()
    at = (SHOULDER[0] + ox - 4, SHOULDER[1])
    angle = {'rest': 62, 'windup': -105, 'crack': 0}[kind]
    hx, hy = rot_pt(tip, pivot, angle, at)
    if kind == 'windup':
        # cabo passa por trás do herói num arco largo
        pts = bezier((hx, hy), (hx - 30, hy - 10), (6, 40), 18)
        paste(im, cable_layer(W, 60, pts, ferrite_at=(6, 34)), 0, 0)
        paste(im, hero_frame(0), ox, 4)
        tail = canvas(W, 60)
        vga_plug(tail, 3, 40)
        paste(im, outline(tail), 0, 0)
        rotated_at(im, arm, pivot, angle, at)
    elif kind == 'rest':
        paste(im, hero_frame(0), ox, 4)
        # cabo enrolado pendurado da mão até o chão
        lay = canvas(W, 60)
        for a in range(0, 360, 3):
            r = math.radians(a)
            put(lay, hx + 3 + math.cos(r) * 4.5, hy + 9 + math.sin(r) * 5, CABLE)
            put(lay, hx + 3 + math.cos(r) * 3.5, hy + 9 + math.sin(r) * 4, CABLE_L)
        for x0, y0, x1, y1 in ((hx, hy, hx + 1, hy + 4), (hx + 6, hy + 13, hx + 10, hy + 22), (hx + 10, hy + 22, hx + 16, hy + 23)):
            line(lay, x0, y0, x1, y1, CABLE, 2)
        vga_plug(lay, int(hx + 16), int(hy + 20))
        paste(im, outline(lay), 0, 0)
        rotated_at(im, arm, pivot, angle, at)
    else:
        paste(im, hero_frame(0), ox, 4)
        pts = []
        for i in range(0, 76, 3):
            amp = 3.5 * math.sin(i / 76 * math.pi) * math.cos(i / 8)
            pts.append((hx + i, hy + amp))
        ex, ey = pts[-1]
        lay = cable_layer(W, 60, pts, sweet=int(len(pts) * 0.72), ferrite_at=(int(ex - 14), int(ey)), plug=(int(ex), int(ey - 3)))
        paste(im, lay, 0, 0)
        cx, cy = ex + 10, ey
        for a in range(0, 360, 45):
            r = math.radians(a)
            line(im, cx + math.cos(r) * 2, cy + math.sin(r) * 2, cx + math.cos(r) * 5, cy + math.sin(r) * 5, rgb('ffcf3a'))
        ellipse(im, cx, cy, 1.2, 1.2, rgb('ffffff'))
        rotated_at(im, arm, pivot, angle, at)
    return im


def throw_pose(kind, pi, spins):
    """Herói arremessando o Raspberry, sem o MacBook: 'windup', 'release' ou 'flight'."""
    W = 130 if kind == 'flight' else 60
    im = canvas(W, 60)
    paste(im, hero_frame(0), 4, 4)
    open_hand = kind != 'windup'
    arm, pivot, tip = throw_arm(open_hand)
    angle = {'windup': -100, 'release': 18, 'flight': 18}[kind]
    hx, hy = rot_pt(tip, pivot, angle, SHOULDER)
    if kind == 'windup':
        rotated_at(im, arm, pivot, angle, SHOULDER)
        paste(im, spins[2], hx - 12, hy - 16)  # placa erguida na mão
        rotated_at(im, arm, pivot, angle, SHOULDER)  # dedos por cima da placa
        return im
    rotated_at(im, arm, pivot, angle, SHOULDER)
    if kind == 'release':
        for i, dy in enumerate((-3, 0, 3)):  # riscos de velocidade
            line(im, hx + 4, hy - 6 + dy, hx + 10 - i, hy - 6 + dy, CYAN_L)
        paste(im, spins[1], hx + 8, hy - 18)
        return im
    # voo: vai para frente e volta (bumerangue)
    for t in range(0, 101, 5):
        a = t / 100 * math.pi
        put(im, hx + 4 + math.sin(a) * 84, hy - 4 - math.sin(a * 2) * 9, CYAN if t % 10 else CYAN_L)
    paste(im, spins[3], hx + 76, hy - 16)
    return im


# ================================================================ prancha de aprovação

BG = rgb('0c0a18')
PANEL = rgb('16122a')
FONT_PATHS = [
    '/Applications/VN.app/Contents/Resources/FlowFontResources.bundle/FontResources/PressStart2P-Regular.ttf',
]


def font(size):
    for p in FONT_PATHS:
        if os.path.exists(p):
            return ImageFont.truetype(p, size)
    return ImageFont.load_default(size)


def crop(im):
    return im.crop(im.getbbox())


def big(im, s):
    return im.resize((im.width * s, im.height * s), Image.NEAREST)


def preview(items):
    S = 5
    W = 1500
    row_h = 330
    pv = Image.new('RGBA', (W, 90 + row_h * len(items)), BG)
    d = ImageDraw.Draw(pv)
    d.text((30, 28), 'METAL RUSH - ARMAS E ITENS (PARA APROVACAO)', font=font(20), fill=rgb('ffcf3a'))
    for i, it in enumerate(items):
        y0 = 80 + i * row_h
        d.rectangle((20, y0, W - 20, y0 + row_h - 16), fill=PANEL, outline=rgb('3a3350'))
        d.text((40, y0 + 18), it['name'], font=font(16), fill=rgb('ffffff'))
        d.text((40, y0 + 46), it['rarity'][0], font=font(10), fill=it['rarity'][1])
        d.text((40, y0 + 64), it['kind'], font=font(10), fill=rgb('b8b0d8'))
        ty = y0 + 94
        for ln in it['notes']:
            d.text((40, ty), ln, font=font(8), fill=rgb('8a84a8'))
            ty += 16
        x = 440
        for label, img, scale in it['sprites']:
            b = big(img, scale)
            bx, by = x, y0 + 40 + (240 - b.height) // 2
            d.rectangle((bx - 8, y0 + 30, bx + b.width + 8, y0 + row_h - 50), fill=rgb('0e0c1c'))
            paste(pv, b, bx, by)
            d.text((bx, y0 + row_h - 42), label, font=font(8), fill=rgb('b8b0d8'))
            x += b.width + 34
    return pv


def sheet(frames, fw, fh):
    out = canvas(fw * len(frames), fh)
    for i, f in enumerate(frames):
        paste(out, f, i * fw + (fw - f.width) // 2, (fh - f.height) // 2)
    return out


def export_game(mon_icon, shields, toy, vga, dogs, pi):
    """Spritesheets usados pelo jogo (public/sprites/gear_*.png)."""
    save = lambda im, name: im.save(os.path.join(SPRITES, name))
    # ícones: escudo, morfar, vga, pet, raspberry (ordem de GEAR_ICON em src/run/gear.ts)
    save(sheet([mon_icon, toy, vga, dogs['cute0'], pi], 26, 22), 'gear_icons.png')
    save(sheet([shields['on'], shields['hit'], shields['off']], 28, 30), 'gear_shield.png')
    save(whip_arm()[0], 'gear_whip_arm.png')
    plug = canvas(10, 10)
    vga_plug(plug, 1, 1)
    save(outline(plug), 'gear_vga_plug.png')
    save(sheet([throw_arm(False)[0], throw_arm(True)[0]], 18, 11), 'gear_throw_arm.png')
    save(pi, 'gear_raspberry.png')
    save(sheet([dogs['cute0'], dogs['cute1'], dogs['angry0'], dogs['angry1']], 26, 20), 'gear_dog.png')
    save(grid(HELMET, TOY), 'gear_helmet.png')
    save(grid(CHEST, TOY), 'gear_chest.png')
    save(grid(ARMBAND, TOY), 'gear_armband.png')


def main():
    os.makedirs(OUT, exist_ok=True)
    S = 5

    mon_icon = monitor_icon()
    shields = {s: monitor_shield(s) for s in ('on', 'hit', 'off')}
    toy = toy_icon()
    morph = hero_morph()
    morph_rb = hero_morph(rainbow_phase=0)
    vga = vga_icon()
    whips = {k: whip_frame(k) for k in ('hold', 'windup', 'crack')}
    dogs = {
        'cute0': holo_dog('cute', 0), 'cute1': holo_dog('cute', 1),
        'angry0': holo_dog('angry', 0), 'angry1': holo_dog('angry', 1),
    }
    pi = raspberry()
    spins = spin_frames(pi)

    export_game(mon_icon, shields, toy, vga, dogs, pi)

    # herói segurando o escudo e o chicote, para ver a proporção em jogo
    def hero_with(arm, ax=18, ay=20, w=48, h=56):
        im = canvas(max(w, ax + arm.width + 4), max(h, ay + arm.height + 4))
        paste(im, hero_frame(0), 4, 4)
        paste(im, arm, ax, ay)
        return im

    hero_shield = hero_with(shields['on'], 16, 10)
    hero_whip = hero_with(whips['crack'], 16, 16, 130)
    hero_pet = canvas(80, 56)
    paste(hero_pet, hero_frame(0), 4, 4)
    paste(hero_pet, laptop_frame(0), 18, 20)
    paste(hero_pet, dog_projector(), 14, 16)
    paste(hero_pet, dogs['cute0'], 44, 34)
    hero_pi = canvas(110, 56)
    paste(hero_pi, hero_frame(0), 4, 4)
    paste(hero_pi, laptop_frame(0), 18, 20)
    # trajetória de bumerangue (vai e volta)
    for t in range(0, 101, 6):
        a = t / 100 * math.pi
        px = 30 + math.sin(a) * 66
        py = 24 - math.sin(a * 2) * 10
        put(hero_pi, px, py, CYAN if t % 12 else CYAN_L)
    paste(hero_pi, spins[1], 84, 10)

    items = [
        {
            'name': 'ESCUDO 144HZ', 'rarity': ('COMUM', rgb('8ff0ff')), 'kind': 'ESCUDO / CORPO A CORPO',
            'notes': ['Monitor gamer girado em', 'modo retrato; o braco', 'VESA vira a alca.', 'Fita RGB na lateral.',
                      'Tela apagada e rachada', 'durante a recarga (8s).'],
            'sprites': [('ICONE', mon_icon, S), ('DEFENDENDO', shields['on'], S), ('TIRO', shields['hit'], S),
                        ('RECARGA', shields['off'], S), ('EM JOGO', hero_shield, 4)],
        },
        {
            'name': 'TA NA HORA DE MORFAR', 'rarity': ('EPICO', rgb('ff5aff')), 'kind': 'SKILL (BOTAO DE SKILL)',
            'notes': ['Armadura de brinquedo:', 'capacete vermelho com', 'viseira, raio amarelo e', 'adesivos; peitoral com',
                      'losangos e cinto de', 'plastico. Imortal = aura', 'arco-iris piscando.'],
            'sprites': [('ICONE', toy, S), ('VESTIDO', morph, 4), ('IMORTAL', morph_rb, 4)],
        },
        {
            'name': 'MASSAGEM DEV', 'rarity': ('RARO', rgb('ffcf3a')), 'kind': 'CORPO A CORPO (SLOT)',
            'notes': ['Cabo VGA azul com', 'ferrite; a ponta e o', 'outro conector.', 'Um braco so: o punho', 'segura o conector e o',
                      'MacBook some. Trecho', 'amarelo = chicotada', 'perfeita (mais dano).'],
            'sprites': [('ICONE', vga, S), ('PARADO', crop(whip_pose('rest')), 3), ('PREPARO', crop(whip_pose('windup')), 3),
                        ('ESTALO', crop(whip_pose('crack')), 3)],
        },
        {
            'name': 'SENIOR VIBE CODING', 'rarity': ('LENDARIO', rgb('ff9a3a')), 'kind': 'SKILL (PET)',
            'notes': ['Holograma de cachorrinho', 'com antena e coleira LED.', 'Ve inimigo: fica', 'vermelho, orelhas em pe,',
                      'pelo ericado e dentes.', 'Projetor no ombro.'],
            'sprites': [('FOFO', dogs['cute0'], S), ('FOFO 2', dogs['cute1'], S), ('RAIVOSO', dogs['angry0'], S),
                        ('RAIVOSO 2', dogs['angry1'], S), ('EM JOGO', hero_pet, 3)],
        },
        {
            'name': 'ARDUINO E VOLTANDO', 'rarity': ('RARO', rgb('ffcf3a')), 'kind': 'GRANADA (INFINITA)',
            'notes': ['Raspberry Pi visto de', 'cima: GPIO dourado,', 'USBs, chip e framboesa.', 'Arremesso sem MacBook:',
                      'sempre para frente.', 'Gira, vai e volta e', 'ricocheteia no mapa.'],
            'sprites': [('PLACA', pi, S), ('PREPARO', crop(throw_pose('windup', pi, spins)), 3),
                        ('ARREMESSO', crop(throw_pose('release', pi, spins)), 3),
                        ('VAI E VOLTA', crop(throw_pose('flight', pi, spins)), 3)],
        },
    ]
    pv = preview(items)
    pv.save(os.path.join(HERE, 'preview.png'))
    print('ok:', os.path.join(HERE, 'preview.png'), pv.size)


if __name__ == '__main__':
    main()
