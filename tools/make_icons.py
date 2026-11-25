#!/usr/bin/env python3
"""生成占位 PWA 图标（纯标准库，无依赖）。用法：python3 make_icons.py <输出目录>"""
import os
import struct
import sys
import zlib

BG = (14, 15, 19)
DOC = (244, 246, 251)
ACCENT = (79, 124, 255)
MUTED = (158, 166, 190)


def in_rounded(px, py, x0, y0, x1, y1, r):
    """点是否在圆角矩形内（坐标均为 0~1 归一化）"""
    if px < x0 or px > x1 or py < y0 or py > y1:
        return False
    if x0 + r <= px <= x1 - r or y0 + r <= py <= y1 - r:
        return True
    cx = min(max(px, x0 + r), x1 - r)
    cy = min(max(py, y0 + r), y1 - r)
    return (px - cx) ** 2 + (py - cy) ** 2 <= r * r


def draw(nx, ny):
    if not in_rounded(nx, ny, 0.30, 0.20, 0.70, 0.80, 0.06):
        return BG
    # 三条蓝色“文字行”
    if 0.37 <= nx <= 0.63 and any(a <= ny <= a + 0.045 for a in (0.33, 0.45, 0.57)):
        return ACCENT
    # 一条灰色短行
    if 0.37 <= nx <= 0.52 and 0.69 <= ny <= 0.735:
        return MUTED
    return DOC


def write_png(path, size):
    rows = []
    for y in range(size):
        row = bytearray([0])  # filter: None
        for x in range(size):
            row += bytes(draw(x / (size - 1), y / (size - 1)))
        rows.append(bytes(row))

    def chunk(tag, data):
        return (struct.pack('>I', len(data)) + tag + data
                + struct.pack('>I', zlib.crc32(tag + data) & 0xFFFFFFFF))

    ihdr = struct.pack('>IIBBBBB', size, size, 8, 2, 0, 0, 0)
    with open(path, 'wb') as f:
        f.write(b'\x89PNG\r\n\x1a\n'
                + chunk(b'IHDR', ihdr)
                + chunk(b'IDAT', zlib.compress(b''.join(rows), 9))
                + chunk(b'IEND', b''))


if __name__ == '__main__':
    out = sys.argv[1] if len(sys.argv) > 1 else 'icons'
    os.makedirs(out, exist_ok=True)
    for s in (180, 192, 512):
        p = os.path.join(out, 'icon-%d.png' % s)
        write_png(p, s)
        print('wrote', p)
