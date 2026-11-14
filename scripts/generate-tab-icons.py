#!/usr/bin/env python3
"""生成 Atlas 底部导航图标（81x81 PNG，灰 / 品牌紫两套）。"""
from pathlib import Path
from PIL import Image, ImageDraw

OUT = Path(__file__).resolve().parent.parent / 'src/assets/images/tab'
SIZE = 81
S = 4
C = SIZE * S
COLORS = {'': '#9aa0b4', '-active': '#4f46e5'}
STROKE = 15


def canvas():
    img = Image.new('RGBA', (C, C), (0, 0, 0, 0))
    return img, ImageDraw.Draw(img)


def draw_home(d, color):
    d.line([(58, 150), (162, 62), (266, 150)], fill=color, width=STROKE, joint='curve')
    d.rounded_rectangle([(88, 138), (236, 262)], radius=22, outline=color, width=STROKE)
    d.rounded_rectangle([(140, 196), (184, 262)], radius=10, outline=color, width=STROKE)


def draw_checkin(d, color):
    d.ellipse([(62, 62), (262, 262)], outline=color, width=STROKE)
    d.line([(162, 162), (162, 104)], fill=color, width=STROKE)
    d.line([(162, 162), (214, 186)], fill=color, width=STROKE)
    d.ellipse([(150, 150), (174, 174)], fill=color)


def draw_mine(d, color):
    d.ellipse([(116, 62), (208, 154)], outline=color, width=STROKE)
    d.arc([(70, 168), (254, 352)], start=200, end=340, fill=color, width=STROKE)


ICONS = {'home': draw_home, 'checkin': draw_checkin, 'mine': draw_mine}

for name, fn in ICONS.items():
    for suffix, color in COLORS.items():
        img, draw = canvas()
        fn(draw, color)
        img = img.resize((SIZE, SIZE), Image.LANCZOS)
        path = OUT / f'{name}{suffix}.png'
        img.save(path)
        print(path.name, path.stat().st_size, 'bytes')
