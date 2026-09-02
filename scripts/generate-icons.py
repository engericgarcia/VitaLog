"""
Gera os ícones do PWA a partir da mesma marca do cabeçalho do site:
uma cruz de saúde com degradê do verde para o branco, sobre um quadrado teal.

Sem dependência de biblioteca de imagem (nem Pillow, nem ImageMagick): escreve
o PNG direto e desenha por campo de distância, o que dá antialiasing limpo sem
precisar de supersampling.

    python3 scripts/generate-icons.py

Os valores de cor e a geometria acompanham src/components/Logo.tsx — mudou lá,
rode isto de novo.
"""
import math, struct, zlib

BG_FROM, BG_TO = (0x0F, 0x8F, 0x88), (0x0A, 0x62, 0x5E)
CROSS_STOPS = [
    (0.00, (0x22, 0xB8, 0xA4)),
    (0.55, (0x9E, 0xEC, 0xDD)),
    (1.00, (0xFF, 0xFF, 0xFF)),
]

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

def rrect(px, py, cx, cy, halfw, halfh, r):
    """Distância assinada de um ponto a um retângulo de cantos arredondados."""
    dx = abs(px - cx) - (halfw - r)
    dy = abs(py - cy) - (halfh - r)
    return math.hypot(max(dx, 0.0), max(dy, 0.0)) + min(max(dx, dy), 0.0) - r

def project(px, py, x0, y0, x1, y1):
    """Posição 0..1 do ponto ao longo do eixo do degradê."""
    dx, dy = x1 - x0, y1 - y0
    t = ((px - x0) * dx + (py - y0) * dy) / (dx * dx + dy * dy)
    return max(0.0, min(1.0, t))

def ramp(t, stops):
    for i in range(len(stops) - 1):
        t0, c0 = stops[i]
        t1, c1 = stops[i + 1]
        if t <= t1 or i == len(stops) - 2:
            k = 0.0 if t1 == t0 else max(0.0, min(1.0, (t - t0) / (t1 - t0)))
            return tuple(c0[j] + (c1[j] - c0[j]) * k for j in range(3))
    return stops[-1][1]

def render(size, radius_frac, scale, opaque_bg):
    """
    radius_frac: raio do canto do quadrado (0 = quadrado reto). O iOS arredonda
    sozinho, então o ícone da Apple sai reto e opaco — com cantos transparentes
    ele ganharia bordas pretas na tela de início.
    scale: tamanho da cruz dentro do quadro. Menor = mais margem, necessário no
    ícone maskable do Android, que sofre recorte.
    """
    px = bytearray(size * size * 4)
    r = radius_frac * size
    c = size / 2
    arm = size * scale            # comprimento total do braço
    thick = arm * 0.26            # espessura, proporcional ao braço
    tip = thick * 0.35            # arredondamento das pontas

    for y in range(size):
        for x in range(size):
            fx, fy = x + 0.5, y + 0.5

            # Fundo: quadrado arredondado com degradê diagonal.
            if radius_frac <= 0:
                bg_cov = 1.0
            else:
                bg_cov = max(0.0, min(1.0, 0.5 - rrect(fx, fy, c, c, c, c, r)))
            tb = project(fx, fy, 0, 0, size, size)
            br = BG_FROM[0] + (BG_TO[0] - BG_FROM[0]) * tb
            bgc = BG_FROM[1] + (BG_TO[1] - BG_FROM[1]) * tb
            bb = BG_FROM[2] + (BG_TO[2] - BG_FROM[2]) * tb

            # Cruz: união de dois retângulos arredondados.
            d = min(
                rrect(fx, fy, c, c, thick / 2, arm / 2, tip),
                rrect(fx, fy, c, c, arm / 2, thick / 2, tip),
            )
            cov = max(0.0, min(1.0, 0.5 - d))
            # Degradê da cruz: do verde na base esquerda ao branco no topo
            # direito. O eixo vai de ponta a ponta da CRUZ (arm/4), não dos
            # cantos da caixa (arm/2): numa cruz os cantos estão vazios, e medir
            # por eles jogava metade da rampa em pixels que não existem — a
            # figura nunca chegava nem ao verde cheio nem ao branco.
            tc = project(fx, fy, c - arm / 4, c + arm / 4, c + arm / 4, c - arm / 4)
            cr, cg, cbl = ramp(tc, CROSS_STOPS)

            rr = br * (1 - cov) + cr * cov
            gg = bgc * (1 - cov) + cg * cov
            bbb = bb * (1 - cov) + cbl * cov
            a = 255 if opaque_bg else int(round(bg_cov * 255))

            i = (y * size + x) * 4
            px[i] = int(round(rr)); px[i+1] = int(round(gg))
            px[i+2] = int(round(bbb)); px[i+3] = a
    return px

targets = [
    # (arquivo, tamanho, raio, escala da cruz, fundo opaco)
    ("public/icon-192.png",          192, 0.24, 0.60, False),
    ("public/icon-512.png",          512, 0.24, 0.60, False),
    # Maskable: Android recorta em círculo/squircle, então a cruz fica na zona
    # segura (~60% central) e o fundo sangra até a borda.
    ("public/icon-maskable-512.png", 512, 0.0,  0.44, True),
    # iOS arredonda sozinho: quadrado reto, opaco, sem transparência.
    ("public/apple-icon.png",        180, 0.0,  0.60, True),
]

for path, size, radius, scale, opaque in targets:
    write_png(path, size, size, render(size, radius, scale, opaque))
    print(f"  {path}  {size}x{size}")
