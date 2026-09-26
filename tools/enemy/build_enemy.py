"""
Gera os spritesheets dos inimigos: robôs-esqueleto humanoides corrompidos por vírus.

    python3 tools/enemy/build_enemy.py

Base: esboço em reference_east.png (crânio com dentes, olhos vermelhos, manchas de vírus no metal),
redesenhado como um endoesqueleto cromado: crânio, costelas vazadas, coluna segmentada,
pistões nas pernas, mãos de garra.

Saída em public/sprites/ (quadros de 40x56, virados para a direita):
    bot_soldier.png   Exterminador (rifle de plasma)
        0-3 parado | 4-9 andando | 10-11 disparo | 12-14 desabando (sem crânio)
    bot_hunter.png    Rastreador (garras, corre curvado)
        0-3 parado | 4-9 correndo | 10-11 ataque de garra | 12-14 desabando (sem crânio)
    bot_parts.png     peças que voam quando o robô é destruído (16x16):
        0 crânio | 1 osso | 2 rifle | 3 engrenagem

Requer Pillow (pip install pillow).
"""

import math
import os
import random

from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, '..', '..', 'public', 'sprites')

FW, FH = 40, 56
GROUND = 54  # última linha dos pés


def rgb(h):
    h = h.lstrip('#')
    return (int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16), 255)


# Cromo levemente azulado (reflexo frio) — frente e trás (mais escuro)
CHROME = {k: rgb(v) for k, v in dict(
    k='#07080c', D='#23262f', d='#3d414d', m='#6b707e', l='#a3a9b6', h='#d5dae3', w='#ffffff',
    R='#ff2a2a', r='#a01010', E='#ffe0d0', c='#c0182a', C='#ff5060', g='#3a1015',
).items()}
CHROME_BACK = {**CHROME, **{k: rgb(v) for k, v in dict(
    D='#17191f', d='#272a33', m='#454955', l='#6b707e', h='#8c92a0', w='#b8bec9',
).items()}}

# ---------------------------------------------------------------- peças desenhadas à mão

SKULL = [
    '...kkkkkk...',
    '.kkhhhhhlkk.',
    'khhwwhhlllmk',
    'klhhhhlllmdk',
    'kllllllmmkkk',
    'kmlllllmkRRk',
    'kdmcllmkrERk',
    'kdmmlmmkkkhk',
    '.kdmmmlmhlkk',
    '.kdkwkwkwkk.',
    '..kkwkwkwk..',
    '..kdddkkk...',
    '...kdmk.....',
]
SKULL_NECK = (4, 12)

RIBCAGE = [
    '...kkkkkkkk.',
    '..kmllllhhk.',
    '.kmkkkkkklhk',
    '.kdmlllllhlk',
    '.kdk..g..kmk',
    '.kdmlllllhmk',
    '.kdk.gRg.kmk',
    '.kdmllcllhk.',
    '.kdk..g.kmk.',
    '.kdmlllhmk..',
    '.kdk.kkkk...',
    '.kdk........',
]

PELVIS = [
    '.kkkkkkkkk.',
    'kmllllhhhmk',
    'kdmmkkkmmdk',
    '.kdk...kdk.',
]

RIFLE = [
    '.......kkkkkkkkkkk....',
    '..kkkkkmmmmllllhhhkkkk',
    '.kddmmmmmrRRRRrmmmlhhk',
    'kddkkkkdddddddkkkkkkk.',
    'kk..kddk.kdk..........',
    '....kkk...kk..........',
]
RIFLE_GRIP = (6, 4)
RIFLE_FORE = (12, 3)
RIFLE_MUZZLE = (22, 2)

GEAR = [
    '..k.k.k..',
    '.kkmkmkk.',
    'kkmllhmkk',
    '.kl.k.lk.',
    'kmhk.kmmk',
    '.kl.k.dk.',
    'kkmddmmkk',
    '.kkdkdkk.',
    '..k.k.k..',
]


def put(canvas, q, c):
    x, y = round(q[0]), round(q[1])
    if 0 <= x < canvas.width and 0 <= y < canvas.height:
        canvas.putpixel((x, y), c)


def comp(canvas, img, xy):
    """alpha_composite tolerante a posições fora do quadro."""
    x, y = round(xy[0]), round(xy[1])
    layer = Image.new('RGBA', canvas.size, (0, 0, 0, 0))
    layer.paste(img, (x, y), img)
    canvas.alpha_composite(layer)


def sprite(rows, pal):
    w = max(len(r) for r in rows)
    img = Image.new('RGBA', (w, len(rows)), (0, 0, 0, 0))
    for y, row in enumerate(rows):
        for x, ch in enumerate(row):
            if ch != '.':
                img.putpixel((x, y), pal[ch])
    return img


def paste_rotated(canvas, part, anchor, target, angle=0):
    """Cola `part` girando `angle` graus (anti-horário) em torno de `anchor`, que cai em `target`."""
    ax, ay = anchor
    pad = int(max(part.width, part.height) * 2) + 4
    big = Image.new('RGBA', (pad, pad), (0, 0, 0, 0))
    ox, oy = pad // 2 - ax, pad // 2 - ay
    big.alpha_composite(part, (ox, oy))
    if angle:
        big = big.rotate(angle, resample=Image.NEAREST)
    comp(canvas, big, (target[0] - pad // 2, target[1] - pad // 2))


def rot(v, angle):
    """Gira o vetor v pelo ângulo (graus, anti-horário na tela)."""
    a = math.radians(-angle)
    return (v[0] * math.cos(a) - v[1] * math.sin(a), v[0] * math.sin(a) + v[1] * math.cos(a))


# ---------------------------------------------------------------- ossos e juntas

def bone(canvas, p0, p1, pal, width=2, piston=False, seed=0):
    """Osso cromado: núcleo com sombreamento automático (luz vindo de cima-esquerda) + contorno."""
    p0 = (round(p0[0]), round(p0[1]))
    p1 = (round(p1[0]), round(p1[1]))
    core = set()
    n = max(abs(p1[0] - p0[0]), abs(p1[1] - p0[1]), 1)
    for i in range(n + 1):
        x = round(p0[0] + (p1[0] - p0[0]) * i / n)
        y = round(p0[1] + (p1[1] - p0[1]) * i / n)
        for dx in range(width):
            for dy in range(width if abs(p1[0] - p0[0]) > abs(p1[1] - p0[1]) else 1):
                core.add((x + dx, y + dy))
    if piston:
        # cilindro hidráulico paralelo, atrás do osso
        dxv, dyv = p1[0] - p0[0], p1[1] - p0[1]
        ln = math.hypot(dxv, dyv) or 1
        nx, ny = -dyv / ln, dxv / ln
        off = -2
        for i in range(int(n * 0.2), int(n * 0.85) + 1):
            x = round(p0[0] + dxv * i / n + nx * off)
            y = round(p0[1] + dyv * i / n + ny * off)
            core.add((x, y))
    outline = set()
    for (x, y) in core:
        for dx in (-1, 0, 1):
            for dy in (-1, 0, 1):
                q = (x + dx, y + dy)
                if q not in core:
                    outline.add(q)
    for q in outline:
        put(canvas, q, pal['k'])
    rnd = random.Random(seed)
    for (x, y) in core:
        up_left = (x - 1, y - 1) not in core or (x, y - 1) not in core
        down_right = (x + 1, y + 1) not in core or (x + 1, y) not in core
        c = pal['l'] if up_left and not down_right else pal['d'] if down_right and not up_left else pal['m']
        if up_left and rnd.random() < 0.18:
            c = pal['h']
        if rnd.random() < 0.05:
            c = pal['c']  # corrosão do vírus
        put(canvas, (x, y), c)


def joint(canvas, p, pal, r=2):
    x0, y0 = p
    for y in range(-r - 1, r + 2):
        for x in range(-r - 1, r + 2):
            d = x * x + y * y
            q = (x0 + x, y0 + y)
            if d <= r * r:
                put(canvas, q, pal['l'] if x + y < 0 else pal['m'] if x + y < 2 else pal['d'])
            elif d <= (r + 1) * (r + 1):
                put(canvas, q, pal['k'])
    put(canvas, (x0 - 1, y0 - 1), pal['h'])


def ik(root, target, l1, l2, bend):
    """IK de 2 ossos. bend=+1 dobra para frente (joelho), -1 para trás (cotovelo)."""
    dx, dy = target[0] - root[0], target[1] - root[1]
    d = min(math.hypot(dx, dy), l1 + l2 - 0.01)
    a = math.atan2(dy, dx)
    cos_b = (l1 * l1 + d * d - l2 * l2) / (2 * l1 * d) if d else 1
    b = math.acos(max(-1, min(1, cos_b)))
    ang = a - bend * b
    return (round(root[0] + math.cos(ang) * l1), round(root[1] + math.sin(ang) * l1))


def foot(canvas, ankle, pal, flat=True):
    x, y = ankle
    rows = ['.kkkkkk..', 'kmllhhkk.', 'kdmmmmmdk', '.kk.k.kk.'] if flat else ['..kkkk.', '.kmlhk.', 'kdmmmdk', '.kkkkk.']
    img = sprite(rows, pal)
    comp(canvas, img, (x - 2, y - 1))


def claw(canvas, hand, pal, open_=True):
    rows = ['.kkk..', 'kmlhkk', 'kdmk.k', '.kk..k'] if open_ else ['.kkk.', 'kmlhk', 'kdmmk', '.kkk.']
    comp(canvas, sprite(rows, pal), (hand[0] - 1, hand[1] - 1))


# ---------------------------------------------------------------- rig

THIGH, SHIN = 9, 9
UPPER, FORE = 8, 8


def torso_points(hip, tilt):
    """Pontos do tronco relativos ao quadril, girados pela inclinação (graus; + = inclina para trás)."""
    def at(v):
        r = rot(v, tilt)
        return (round(hip[0] + r[0]), round(hip[1] + r[1]))
    return {
        'pelvis': at((0, 0)),
        'spine_bottom': at((-4, -2)),
        'spine_top': at((-5, -9)),
        'rib_anchor': at((-4, -9)),          # base das costelas (coluna)
        'shoulder_f': at((0, -17)),
        'shoulder_b': at((-3, -17)),
        'neck': at((-3, -19)),
        'skull_anchor': at((-3, -19)),
        'hip_f': at((1, 1)),
        'hip_b': at((-2, 1)),
    }


def draw_robot(pose, variant):
    canvas = Image.new('RGBA', (FW, FH), (0, 0, 0, 0))
    hip = pose['hip']
    tilt = pose.get('tilt', 0)
    T = torso_points(hip, tilt)

    # braço de trás
    arm_b = pose['arm_b']
    elbow = ik(T['shoulder_b'], arm_b, UPPER, FORE, -1)
    bone(canvas, T['shoulder_b'], elbow, CHROME_BACK, seed=1)
    bone(canvas, elbow, arm_b, CHROME_BACK, seed=2)
    joint(canvas, elbow, CHROME_BACK, 1)
    if variant == 'hunter':
        claw(canvas, arm_b, CHROME_BACK, pose.get('claw_open', True))

    # perna de trás
    for key, pal, side, seed in (('leg_b', CHROME_BACK, 'hip_b', 3),):
        ankle = pose[key]
        knee = ik(T[side], ankle, THIGH, SHIN, +1)
        bone(canvas, T[side], knee, pal, piston=True, seed=seed)
        bone(canvas, knee, ankle, pal, piston=True, seed=seed + 1)
        joint(canvas, knee, pal)
        foot(canvas, ankle, pal, pose.get('flat_b', True))

    # coluna (vértebras)
    sb, st = T['spine_bottom'], T['spine_top']
    bone(canvas, sb, st, CHROME, width=2, seed=5)
    for i in range(0, 4):
        t = i / 3
        vx = round(sb[0] + (st[0] - sb[0]) * t)
        vy = round(sb[1] + (st[1] - sb[1]) * t)
        put(canvas, (vx - 1, vy), CHROME['k'])
        put(canvas, (vx + 2, vy), CHROME['k'])

    # pelve
    paste_rotated(canvas, sprite(PELVIS, CHROME), (5, 1), T['pelvis'], tilt)
    # costelas
    paste_rotated(canvas, sprite(RIBCAGE, CHROME), (2, 11), T['rib_anchor'], tilt)
    # pescoço + crânio
    if pose.get('skull', True):
        neck_base = (T['neck'][0], T['neck'][1] + 2)
        bone(canvas, neck_base, T['neck'], CHROME, width=2, seed=7)
        paste_rotated(canvas, sprite(SKULL, CHROME), SKULL_NECK, T['skull_anchor'], tilt + pose.get('head_tilt', 0))
    else:
        # toco do pescoço com fios soltos
        n = T['neck']
        for dx, dy, c in ((0, 0, 'd'), (1, -1, 'r'), (-1, -2, 'R'), (2, -2, 'm')):
            put(canvas, (n[0] + dx, n[1] + dy), CHROME[c])

    # perna da frente
    ankle = pose['leg_f']
    knee = ik(T['hip_f'], ankle, THIGH, SHIN, +1)
    bone(canvas, T['hip_f'], knee, CHROME, piston=True, seed=8)
    bone(canvas, knee, ankle, CHROME, piston=True, seed=9)
    joint(canvas, knee, CHROME)
    foot(canvas, ankle, CHROME, pose.get('flat_f', True))

    # rifle + braço da frente
    if variant == 'soldier' and pose.get('rifle', True):
        grip = pose['arm_f']
        rifle = sprite(RIFLE, CHROME)
        paste_rotated(canvas, rifle, RIFLE_GRIP, grip, pose.get('rifle_angle', 0))
    arm_f = pose['arm_f']
    elbow = ik(T['shoulder_f'], arm_f, UPPER, FORE, -1)
    bone(canvas, T['shoulder_f'], elbow, CHROME, seed=10)
    bone(canvas, elbow, arm_f, CHROME, seed=11)
    joint(canvas, T['shoulder_f'], CHROME, 2)
    joint(canvas, elbow, CHROME, 1)
    if variant == 'hunter':
        claw(canvas, arm_f, CHROME, pose.get('claw_open', True))
    return canvas


def walk_leg(phase, hip_x, stride, lift):
    a = phase * math.pi * 2
    x = hip_x + stride * math.cos(a)
    y = GROUND - 2 - max(0, math.sin(a)) * lift
    return (round(x), round(y)), math.sin(a) <= 0.2


HIP = (19, 35)


def soldier_poses():
    poses = []
    for i in range(4):  # parado: respira 1px
        bob = 1 if i >= 2 else 0
        hip = (HIP[0], HIP[1] + bob)
        poses.append(dict(hip=hip, leg_b=(15, GROUND - 2), leg_f=(22, GROUND - 2),
                          arm_f=(24, 26 + bob), arm_b=(30, 24 + bob), head_tilt=-2 if i % 2 else 0))
    for i in range(6):  # andando: passo mecânico
        ph = i / 6
        bob = 1 if i % 3 == 0 else 0
        hip = (HIP[0], HIP[1] + bob)
        lf, flat_f = walk_leg(ph, hip[0] + 1, 6, 3)
        lb, flat_b = walk_leg(ph + 0.5, hip[0] - 2, 6, 3)
        poses.append(dict(hip=hip, leg_b=lb, leg_f=lf, flat_b=flat_b, flat_f=flat_f,
                          arm_f=(24, 26 + bob), arm_b=(30, 24 + bob)))
    for i in range(2):  # disparo: recuo
        kick = 2 if i == 0 else 1
        poses.append(dict(hip=HIP, tilt=3 if i == 0 else 1, leg_b=(15, GROUND - 2), leg_f=(22, GROUND - 2),
                          arm_f=(24 - kick, 25), arm_b=(30 - kick, 23), rifle_angle=4 if i == 0 else 2))
    poses += death_poses(rifle=True)
    return poses


def hunter_poses():
    poses = []
    hunch = -22  # inclinado para frente
    for i in range(4):
        bob = 1 if i >= 2 else 0
        hip = (HIP[0] - 1, HIP[1] + 2 + bob)
        poses.append(dict(hip=hip, tilt=hunch, leg_b=(13, GROUND - 2), leg_f=(23, GROUND - 2),
                          arm_f=(31, 32 + bob), arm_b=(27, 34 + bob), head_tilt=8, claw_open=i % 2 == 0))
    for i in range(6):
        ph = i / 6
        bob = 1 if i % 3 == 0 else -1
        hip = (HIP[0] - 1, HIP[1] + 2 + bob)
        lf, flat_f = walk_leg(ph, hip[0] + 2, 8, 5)
        lb, flat_b = walk_leg(ph + 0.5, hip[0] - 2, 8, 5)
        swing = math.cos(ph * math.pi * 2) * 4
        poses.append(dict(hip=hip, tilt=hunch - 6, leg_b=lb, leg_f=lf, flat_b=flat_b, flat_f=flat_f,
                          arm_f=(round(29 - swing), 33), arm_b=(round(27 + swing), 34), head_tilt=10))
    # ataque de garra: levanta e rasga
    poses.append(dict(hip=(HIP[0] - 1, HIP[1] + 2), tilt=hunch + 10, leg_b=(13, GROUND - 2), leg_f=(24, GROUND - 2),
                      arm_f=(30, 16), arm_b=(26, 20), head_tilt=6, claw_open=True))
    poses.append(dict(hip=(HIP[0], HIP[1] + 3), tilt=hunch - 12, leg_b=(12, GROUND - 2), leg_f=(25, GROUND - 2),
                      arm_f=(35, 38), arm_b=(32, 36), head_tilt=12, claw_open=False))
    poses += death_poses(rifle=False)
    return poses


def death_poses(rifle):
    """Robô sem crânio desabando: joelhos cedem, tronco tomba para trás."""
    out = []
    for i, (drop, tilt) in enumerate(((4, 12), (10, 35), (15, 70))):
        hip = (HIP[0] - i * 2, HIP[1] + drop)
        out.append(dict(hip=hip, tilt=tilt, skull=False, rifle=False,
                        leg_b=(15 - i, GROUND - 2), leg_f=(24 + i * 2, GROUND - 2),
                        arm_f=(hip[0] + 4 - i * 4, min(GROUND - 2, hip[1] - 4 + i * 6)),
                        arm_b=(hip[0] - i * 5, min(GROUND - 2, hip[1] - 2 + i * 6)),
                        claw_open=False))
    return out


def sheet(poses, variant):
    img = Image.new('RGBA', (FW * len(poses), FH), (0, 0, 0, 0))
    for i, p in enumerate(poses):
        img.alpha_composite(draw_robot(p, variant), (i * FW, 0))
    return img


def parts():
    img = Image.new('RGBA', (16 * 4, 16), (0, 0, 0, 0))
    img.alpha_composite(sprite(SKULL, CHROME), (1, 1))
    b = Image.new('RGBA', (16, 16), (0, 0, 0, 0))
    bone(b, (3, 12), (12, 4), CHROME, seed=20)
    joint(b, (3, 12), CHROME, 1)
    joint(b, (12, 4), CHROME, 1)
    img.alpha_composite(b, (16, 0))
    rifle = sprite(RIFLE, CHROME).crop((0, 0, 16, 6))
    img.alpha_composite(rifle, (32, 5))
    img.alpha_composite(sprite(GEAR, CHROME), (51, 3))
    return img


def main():
    os.makedirs(OUT, exist_ok=True)
    s = sheet(soldier_poses(), 'soldier')
    h = sheet(hunter_poses(), 'hunter')
    s.save(os.path.join(OUT, 'bot_soldier.png'))
    h.save(os.path.join(OUT, 'bot_hunter.png'))
    parts().save(os.path.join(OUT, 'bot_parts.png'))
    print('ok:', s.width // FW, 'quadros (exterminador),', h.width // FW, 'quadros (rastreador)')


if __name__ == '__main__':
    main()
