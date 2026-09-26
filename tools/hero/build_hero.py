"""
Gera os spritesheets do personagem principal a partir do esboço (reference_east.png).

    python3 tools/hero/build_hero.py

Saída (usada pelo jogo):
    public/sprites/hero.png         corpo: idle(4) + corrida(6) + pulo + queda + dano  (quadros 32x48)
    public/sprites/hero_laptop.png  braço + MacBook: normal, disparo, overclock          (quadros 28x16)

O que o script faz:
  1. Recolore o moletom (tons quentes) para roxo escuro, preservando pele e cabelo.
  2. Separa tronco/cabeça do MacBook e da mão (o MacBook vira uma peça que gira para mirar).
  3. Desenha as pernas de cada quadro de animação com a mesma paleta do esboço.
  4. Adiciona detalhes cibernéticos (circuitos brilhantes no moletom e no capuz).

Requer Pillow (pip install pillow).
"""

import colorsys
import os

from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, '..', '..', 'public', 'sprites')

FRAME_W, FRAME_H = 32, 48
REF_X0 = 4  # coluna do esboço que vira x=0 no quadro

OUTLINE = (0, 1, 5, 255)

# Pele e cabelo do rosto: não recolorir.
FACE_BOX = (24, 5, 31, 17)
KEEP_COLORS = {
    '#f6b089', '#e89974', '#d98063', '#c46a53', '#b27b67', '#b35c4c',  # pele
    '#65372d', '#8c5130', '#77432e', '#eba346', '#a14732', '#b1542c', '#442b2e',  # cabelo
}

CYAN = (89, 194, 244, 255)
CYAN_LIGHT = (168, 240, 252, 255)
CYAN_CORE = (230, 252, 255, 255)
MAGENTA = (230, 90, 255, 255)
MAGENTA_LIGHT = (255, 190, 255, 255)


def hexc(c):
    return '#%02x%02x%02x' % c[:3]


def rgb(h, a=255):
    h = h.lstrip('#')
    return (int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16), a)


def to_purple(p, x, y):
    r, g, b, a = p
    if a < 128:
        return (0, 0, 0, 0)
    if FACE_BOX[0] <= x <= FACE_BOX[2] and FACE_BOX[1] <= y <= FACE_BOX[3] and hexc(p) in KEEP_COLORS:
        return p
    h, l, s = colorsys.rgb_to_hls(r / 255, g / 255, b / 255)
    hd = h * 360
    if s > 0.18 and (hd <= 48 or hd >= 320) and l > 0.06:
        rr, gg, bb = colorsys.hls_to_rgb(272 / 360, l * 0.78, min(1, s * 0.8))
        return (round(rr * 255), round(gg * 255), round(bb * 255), 255)
    return p


# ---------------------------------------------------------------- partes do esboço

def is_laptop_or_hand(x, y):
    """Máscara do MacBook + mão que o segura (coordenadas do esboço 48x48)."""
    if 21 <= y <= 23 and x >= 23:
        return True
    if 20 <= y <= 29 and x >= 24:
        return x >= 25 or y >= 21
    if 30 <= y <= 33 and x >= 24:
        return True
    return False


def extract(ref):
    upper = Image.new('RGBA', (48, 34), (0, 0, 0, 0))
    laptop = Image.new('RGBA', (48, 48), (0, 0, 0, 0))
    for y in range(48):
        for x in range(48):
            p = to_purple(ref.getpixel((x, y)), x, y)
            if p[3] == 0:
                continue
            if is_laptop_or_hand(x, y) and y >= 19:
                laptop.putpixel((x, y), p)
            elif y <= 33:
                upper.putpixel((x, y), p)
    # Fecha o contorno onde o MacBook foi removido
    for y in range(19, 34):
        row = [x for x in range(48) if upper.getpixel((x, y))[3] > 0]
        if row:
            edge = max(row)
            if upper.getpixel((edge, y))[:3] not in ((0, 1, 5), (0, 0, 0)):
                upper.putpixel((edge + 1, y), OUTLINE)
    return upper, laptop


def add_circuits(img, bright):
    """Trilhas de circuito brilhantes no moletom (toque robótico)."""
    line = CYAN if bright else (60, 150, 210, 255)
    node = CYAN_CORE if bright else CYAN_LIGHT
    # manga: desce do emblema do ombro e dobra para frente
    for y in range(24, 30):
        img.putpixel((17, y), line)
    for x in range(17, 21):
        img.putpixel((x, 30), line)
    img.putpixel((17, 23), node)
    img.putpixel((21, 30), node)
    # capuz: trilha saindo do emblema para trás
    for x in range(15, 20):
        img.putpixel((x, 9), line)
    for y in range(9, 14):
        img.putpixel((14, y), line)
    img.putpixel((14, 14), node)
    # LED do fone/óculos na lateral do capuz
    img.putpixel((22, 11), node)
    img.putpixel((22, 12), line)


# ---------------------------------------------------------------- pernas

PANTS_BACK = {'o': rgb('#000105'), 'f': rgb('#1f2538'), 'h': rgb('#2f3d52')}
PANTS_FRONT = {'o': rgb('#000105'), 'f': rgb('#2b324a'), 'h': rgb('#506d84'), 'l': rgb('#617187')}

# Tênis (virado para a direita). Tons vermelhos viram roxo na recoloração.
SHOE = [
    '..kkkk....',
    '.kRRwwk...',
    'kRxRwwwkk.',
    'kwwwwwwwwk',
    'kggsssgggk',
    '.kSSSSSSk.',
]
SHOE_PAL = {
    'k': OUTLINE, 'R': rgb('#862734'), 'x': rgb('#be3731'), 'w': rgb('#eaf4f7'),
    'g': rgb('#a2bacc'), 's': rgb('#8da7bb'), 'S': rgb('#677c93'),
}
SHOE_BACK_PAL = {**SHOE_PAL, 'w': rgb('#b9c8d4'), 'R': rgb('#5a2030'), 'x': rgb('#7a2a34'), 'g': rgb('#7d8fa0')}


def stamp(img, cx, cy, r, color):
    for y in range(cy - r, cy + r + 1):
        for x in range(cx - r, cx + r + 1):
            if 0 <= x < img.width and 0 <= y < img.height:
                img.putpixel((x, y), color)


def line_points(x0, y0, x1, y1):
    pts = []
    n = max(abs(x1 - x0), abs(y1 - y0), 1)
    for i in range(n + 1):
        pts.append((round(x0 + (x1 - x0) * i / n), round(y0 + (y1 - y0) * i / n)))
    return pts


def draw_leg(img, hip, knee, ankle, pal, front):
    segs = line_points(*hip, *knee) + line_points(*knee, *ankle)
    for (x, y) in segs:
        stamp(img, x, y, 3, pal['o'])
    for (x, y) in segs:
        stamp(img, x, y, 2, pal['f'])
    # luz na frente da perna
    for (x, y) in segs:
        img.putpixel((x + 1, y), pal['h'])
        if front:
            img.putpixel((x + 2, y), pal.get('l', pal['h']))
    if front:  # remendo laranja do esboço (vira roxo)
        kx, ky = knee
        img.putpixel((kx, ky), rgb('#cb7935'))
        img.putpixel((kx + 1, ky), rgb('#cb7935'))


def draw_shoe(img, ankle, pal, tilt=0):
    ax, ay = ankle
    ox, oy = ax - 4, ay
    for r, row in enumerate(SHOE):
        for c, ch in enumerate(row):
            if ch == '.':
                continue
            # inclinação simples: desloca linhas de baixo (bico para baixo) ou de cima
            dy = 0
            if tilt > 0 and c >= 6:
                dy = 1
            if tilt < 0 and c <= 2:
                dy = -1
            x, y = ox + c, oy + r + dy
            if 0 <= x < img.width and 0 <= y < img.height:
                img.putpixel((x, y), pal[ch])


# Poses: (joelho, tornozelo) em coords do quadro; quadril fixo. Pés tocam o chão quando tornozelo y=41.
HIP_F = (17, 35)
HIP_B = (14, 35)
POSES = {
    #          perna de trás            perna da frente          tilt trás, tilt frente, bob do tronco
    'idle':  (((13, 38), (12, 41)), ((18, 38), (19, 41)), 0, 0, 0),
    'run0':  (((12, 38), (8, 40)), ((20, 38), (22, 41)), -1, 0, 1),
    'run1':  (((13, 38), (11, 39)), ((19, 38), (19, 41)), -1, 0, 0),
    'run2':  (((15, 37), (16, 38)), ((16, 38), (15, 41)), 0, 0, -1),
    'run3':  (((16, 38), (20, 41)), ((14, 38), (10, 40)), 0, -1, 1),
    'run4':  (((15, 38), (17, 41)), ((16, 38), (13, 39)), 0, -1, 0),
    'run5':  (((14, 38), (13, 41)), ((18, 37), (18, 38)), 0, 0, -1),
    'jump':  (((11, 37), (10, 39)), ((20, 36), (21, 38)), -1, 1, -1),
    'fall':  (((12, 38), (11, 41)), ((20, 38), (22, 40)), 0, 1, 0),
}


def build_body_frame(upper, pose, circuits_bright):
    frame = Image.new('RGBA', (FRAME_W, FRAME_H), (0, 0, 0, 0))
    (bk, ba), (fk, fa), tb, tf, bob = POSES[pose]
    legs = Image.new('RGBA', (FRAME_W, FRAME_H), (0, 0, 0, 0))
    draw_leg(legs, HIP_B, bk, ba, PANTS_BACK, False)
    draw_shoe(legs, ba, SHOE_BACK_PAL, tb)
    draw_leg(legs, HIP_F, fk, fa, PANTS_FRONT, True)
    draw_shoe(legs, fa, SHOE_PAL, tf)
    legs = Image.frombytes('RGBA', legs.size, bytes(
        v for px in [to_purple(p, 0, 0) for p in legs.getdata()] for v in px))
    frame.alpha_composite(legs)

    up = upper.copy()
    add_circuits(up, circuits_bright)
    crop = up.crop((REF_X0, 0, REF_X0 + FRAME_W, 34))
    frame.alpha_composite(crop, (0, 1 + bob))
    return frame


# ---------------------------------------------------------------- braço + MacBook

LAPTOP_W, LAPTOP_H = 28, 16
SLEEVE = rgb('#4a2a6a')
SLEEVE_DARK = rgb('#2e1a48')


def build_laptop_frame(laptop_px, mode):
    """Pivô no ombro = (1, 8). Braço na horizontal, MacBook à frente."""
    img = Image.new('RGBA', (LAPTOP_W, LAPTOP_H), (0, 0, 0, 0))
    # manga
    for x in range(0, 9):
        for y in range(6, 11):
            c = OUTLINE if y in (6, 10) else (SLEEVE if y < 9 else SLEEVE_DARK)
            img.putpixel((x, y), c)
    # punho cibernético (ciano/amarelo como no esboço)
    for y in range(6, 11):
        img.putpixel((9, y), OUTLINE if y in (6, 10) else CYAN)
        img.putpixel((10, y), OUTLINE if y in (6, 10) else rgb('#c7c63e'))
    # MacBook recortado do esboço (x 23..37, y 20..29)
    src = laptop_px.crop((23, 20, 38, 30))
    img.alpha_composite(src, (12, 3))
    # mão/luva segurando a lateral
    for y in range(7, 10):
        for x in range(11, 14):
            img.putpixel((x, y), OUTLINE if x == 11 else rgb('#39415a'))
    img.putpixel((13, 8), rgb('#c46a53'))

    # Logo trocado por um símbolo brilhante (diamante)
    lx, ly = 20, 7
    glow = CYAN_LIGHT if mode == 0 else (CYAN_CORE if mode == 1 else MAGENTA_LIGHT)
    base = CYAN if mode != 2 else MAGENTA
    for dx, dy in ((0, -1), (-1, 0), (1, 0), (0, 1)):
        img.putpixel((lx + dx, ly + dy), base)
    img.putpixel((lx, ly), glow)

    # Borda da tela acesa (lado que aponta para o inimigo)
    edge = {0: CYAN, 1: CYAN_CORE, 2: MAGENTA_LIGHT}[mode]
    for y in range(4, 12):
        if img.getpixel((25, y))[3] > 0:
            img.putpixel((25, y), edge)
    if mode:
        for y in range(5, 11):
            img.putpixel((26, y), edge if mode == 1 else MAGENTA)
    return img


def main():
    ref = Image.open(os.path.join(HERE, 'reference_east.png')).convert('RGBA')
    upper, laptop_px = extract(ref)

    body_frames = [
        ('idle', False), ('idle', False), ('idle', True), ('idle', True),
        ('run0', True), ('run1', True), ('run2', False), ('run3', True), ('run4', True), ('run5', False),
        ('jump', True), ('fall', True), ('fall', False),
    ]
    sheet = Image.new('RGBA', (FRAME_W * len(body_frames), FRAME_H), (0, 0, 0, 0))
    for i, (pose, bright) in enumerate(body_frames):
        f = build_body_frame(upper, pose, bright)
        # quadros "idle" 2 e 3 respiram (tronco 1px para baixo)
        if pose == 'idle' and i >= 2:
            shifted = Image.new('RGBA', f.size, (0, 0, 0, 0))
            legs_only = build_body_frame(Image.new('RGBA', (48, 34), (0, 0, 0, 0)), pose, bright)
            shifted.alpha_composite(legs_only)
            up = upper.copy()
            add_circuits(up, bright)
            shifted.alpha_composite(up.crop((REF_X0, 0, REF_X0 + FRAME_W, 34)), (0, 2))
            f = shifted
        sheet.alpha_composite(f, (i * FRAME_W, 0))

    lap = Image.new('RGBA', (LAPTOP_W * 3, LAPTOP_H), (0, 0, 0, 0))
    for i in range(3):
        lap.alpha_composite(build_laptop_frame(laptop_px, i), (i * LAPTOP_W, 0))

    os.makedirs(OUT, exist_ok=True)
    sheet.save(os.path.join(OUT, 'hero.png'))
    lap.save(os.path.join(OUT, 'hero_laptop.png'))
    print('ok:', len(body_frames), 'quadros de corpo, 3 de MacBook')


if __name__ == '__main__':
    main()
