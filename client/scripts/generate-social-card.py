"""Render the Nexus sharing image. Requires Pillow only when regenerating the PNG."""

from pathlib import Path
from PIL import Image, ImageDraw, ImageFont, ImageFilter

ROOT = Path(__file__).resolve().parents[1]
SCALE = 2
WIDTH, HEIGHT = 1200, 630


def font(size, bold=False):
    candidates = [
        Path('C:/Windows/Fonts') / ('segoeuib.ttf' if bold else 'segoeui.ttf'),
        Path('/usr/share/fonts/truetype/dejavu') / ('DejaVuSans-Bold.ttf' if bold else 'DejaVuSans.ttf'),
        Path('/System/Library/Fonts/Supplemental') / ('Arial Bold.ttf' if bold else 'Arial.ttf'),
    ]
    for candidate in candidates:
        if candidate.exists():
            return ImageFont.truetype(str(candidate), size * SCALE)
    raise RuntimeError('Install Segoe UI, DejaVu Sans, or Arial to regenerate this image.')


image = Image.new('RGB', (WIDTH * SCALE, HEIGHT * SCALE))
pixels = image.load()
for y in range(HEIGHT * SCALE):
    for x in range(WIDTH * SCALE):
        u, v = x / (WIDTH * SCALE), y / (HEIGHT * SCALE)
        glow = max(0, 1 - ((u - .9) ** 2 + (v - .05) ** 2) ** .5)
        pixels[x, y] = (int(52 + 30 * u + 18 * glow), int(42 + 22 * u + 16 * glow), int(122 + 35 * u + 27 * glow))

draw = ImageDraw.Draw(image)


def box(bounds, fill, radius=0, outline=None, width=1):
    draw.rounded_rectangle(tuple(round(n * SCALE) for n in bounds), radius=radius * SCALE, fill=fill, outline=outline, width=width * SCALE)


def text(position, value, size, fill='white', bold=False):
    draw.text(tuple(n * SCALE for n in position), value, font=font(size, bold), fill=fill)


def circle(bounds, fill, outline=None, width=1):
    draw.ellipse(tuple(round(n * SCALE) for n in bounds), fill=fill, outline=outline, width=width * SCALE)


def line(points, fill, width):
    draw.line([(int(x * SCALE), int(y * SCALE)) for x, y in points], fill=fill, width=width * SCALE, joint='curve')


# Quiet orbital lines and a mint accent echo the app's violet/mint identity.
for offset in [0, 52, 104]:
    circle((865 - offset, -220 - offset, 1375 + offset, 290 + offset), None, '#6355a8')
for x in range(75, 610, 22):
    circle((x, 564, x + 2, 566), '#8b80b5')

# Signature Nexus N mark, matching the app's existing vector letterform.
box((72, 60, 140, 128), '#7866fa', 20, '#9a8bff')
line([(93, 108), (93, 80), (120, 108), (120, 80)], 'white', 6)
for x, y in [(93, 108), (93, 80), (120, 108), (120, 80)]:
    circle((x - 3, y - 3, x + 3, y + 3), 'white')
circle((116, 105, 128, 117), '#94e2cf')
text((158, 61), 'nexus.', 46, bold=True)
text((160, 114), 'A little more connected.', 17, '#d4cdef')

text((69, 196), 'Small hellos.', 65, bold=True)
text((69, 274), 'Big connections.', 65, bold=True)
line([(76, 371), (282, 371)], '#94e2cf', 5)
text((74, 403), 'Chat with friends. Find your community.', 23, '#eee9ff')
text((74, 440), 'Make yourself at home.', 23, '#c9c3e5')
text((74, 519), 'CHAT  /  CONNECT  /  BELONG', 16, '#94e2cf', True)

# An illustrative conversation, rather than a screenshot of personal messages.
shadow = Image.new('RGBA', image.size)
sd = ImageDraw.Draw(shadow)
sd.rounded_rectangle((742 * SCALE, 183 * SCALE, 1144 * SCALE, 536 * SCALE), radius=30 * SCALE, fill=(16, 9, 50, 100))
image = Image.alpha_composite(image.convert('RGBA'), shadow.filter(ImageFilter.GaussianBlur(18 * SCALE))).convert('RGB')
draw = ImageDraw.Draw(image)
box((730, 164, 1132, 514), '#f8f8ff', 28, '#cbc4eb')
circle((755, 192, 797, 234), '#e7e2ff')
text((767, 197), '#', 24, '#6554d9', True)
text((811, 189), 'Public Square', 23, '#30284d', True)
circle((813, 225, 820, 232), '#168878')
text((829, 217), 'A place for everyone', 14, '#777089')
line([(752, 253), (1110, 253)], '#e7e4f0', 1)

circle((755, 277, 788, 310), '#d6f4e9')
text((765, 279), 'N', 17, '#197968', True)
box((799, 276, 1089, 344), '#eae7f6', 17)
text((815, 289), 'Hey, you made it.', 20, '#483e65')
text((816, 317), 'There is a spot for you here.', 13, '#7b728e')
box((819, 361, 1106, 428), '#6554d9', 17)
text((836, 374), 'My kind of place.', 21, 'white', True)
text((836, 403), 'Let the conversation begin.', 13, '#ddd5ff')

box((754, 452, 1108, 490), '#ffffff', 13, '#e5e0f0')
text((769, 460), 'Say something nice...', 14, '#92899f')
circle((1074, 460, 1096, 482), '#e8e3ff')
line([(1085, 476), (1085, 466), (1081, 470), (1085, 466), (1089, 470)], '#6554d9', 2)

output = ROOT / 'public' / 'social-preview-v1.png'
image = image.resize((WIDTH, HEIGHT), Image.Resampling.LANCZOS)
image.save(output, optimize=True)
print(f'Created {output.name}: {WIDTH} x {HEIGHT}, {output.stat().st_size:,} bytes')
