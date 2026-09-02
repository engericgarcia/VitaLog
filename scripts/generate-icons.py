"""
Gera os ícones do PWA a partir da mesma marca usada no cabeçalho do site:
um "V" branco sobre teal.

Sem dependência de imagem instalada (nem Pillow, nem ImageMagick): escreve o
PNG diretamente e desenha por campo de distância, o que dá antialiasing limpo
sem precisar de supersampling.

    python3 scripts/generate-icons.py

Regenerar só é necessário se a marca mudar.
"""
import math, struct, zlib

TEAL = (13, 125, 120)          # --accent do tema claro
WHITE = (255, 255, 255)

def write_png(path, w, h, px):
    raw = b"".join(b"\x00" + bytes(px[y * w * 4:(y + 1) * w * 4]) for y in range(h))
    def chunk(tag, data):
        return (struct.pack(">I", len(data)) + tag + data
                + struct.pack(">I", zlib.crc32(tag + data) & 0xFFFFFFFF))
    out = b"\x89PNG\r\n\x1a\n"
    out += chunk(b"IHDR", struct.pack(">IIBBBBB", w, h, 8, 6, 0, 0, 0))
    out += chunk(b"IDAT", zlib.compress(raw, 9))
    out += chunk(b"IEND", b"")
    open(path, "wb").write(out)

def seg_dist(px, py, ax, ay, bx, by):
    """Distância de um ponto ao segmento AB."""
    dx, dy = bx - ax, by - ay
    t = ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy)
    t = max(0.0, min(1.0, t))
    return math.hypot(px - (ax + t * dx), py - (ay + t * dy))

def render(size, radius_frac, scale, opaque_bg):
    """
    radius_frac: raio do canto (0 = quadrado). O iOS arredonda sozinho, então o
    ícone da Apple sai quadrado e opaco — com cantos transparentes ele ficaria
    com bordas pretas na tela de início.
    scale: tamanho do "V" dentro do quadro. Menor = mais margem, necessário para
    ícones maskable do Android, que sofrem recorte.
    """
    px = bytearray(size * size * 4)
    r = radius_frac * size
    # Traço do V, em coordenadas normalizadas e centrado.
    c = size / 2
    half = size * scale / 2
    ax, ay = c - half, c - half * 0.78
    mx, my = c, c + half * 0.82
    bx, by = c + half, c - half * 0.78
    stroke = size * scale * 0.155

    for y in range(size):
        for x in range(size):
            fx, fy = x + 0.5, y + 0.5

            # Cobertura do fundo (retângulo arredondado por campo de distância).
            if radius_frac <= 0:
                bg = 1.0
            else:
                qx = max(abs(fx - c) - (c - r), 0.0)
                qy = max(abs(fy - c) - (c - r), 0.0)
                bg = max(0.0, min(1.0, 0.5 - (math.hypot(qx, qy) - r)))

            # Cobertura do V.
            d = min(seg_dist(fx, fy, ax, ay, mx, my),
                    seg_dist(fx, fy, mx, my, bx, by))
            v = max(0.0, min(1.0, 0.5 - (d - stroke / 2)))

            rr = TEAL[0] * (1 - v) + WHITE[0] * v
            gg = TEAL[1] * (1 - v) + WHITE[1] * v
            bb = TEAL[2] * (1 - v) + WHITE[2] * v
            a = 255 if opaque_bg else int(round(bg * 255))

            i = (y * size + x) * 4
            px[i] = int(round(rr)); px[i+1] = int(round(gg))
            px[i+2] = int(round(bb)); px[i+3] = a
    return px

targets = [
    # (arquivo, tamanho, raio, escala do V, fundo opaco)
    ("public/icon-192.png",           192, 0.22, 0.52, False),
    ("public/icon-512.png",           512, 0.22, 0.52, False),
    # Maskable: Android recorta em círculo/squircle, então o V vive na zona
    # segura (~60% central) e o fundo sangra até a borda.
    ("public/icon-maskable-512.png",  512, 0.0,  0.38, True),
    # iOS arredonda sozinho: quadrado, opaco, sem transparência.
    ("public/apple-icon.png",         180, 0.0,  0.52, True),
]

for path, size, radius, scale, opaque in targets:
    write_png(path, size, size, render(size, radius, scale, opaque))
    print(f"  {path}  {size}x{size}")
