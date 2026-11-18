"""
RANANO Animated Text Engine
---------------------------
Generates animated text as GIFs or transparent PNG frame sequences.

Effects:
fade, slide, typewriter, pop, bounce, zoom, glitch, wave,
word_pop, letter_pop, kinetic, neon, rise, drop, blur, cinematic.
"""

from __future__ import annotations

from pathlib import Path
from typing import Literal
import math
import random

from PIL import Image, ImageDraw, ImageFont, ImageFilter


EffectName = Literal[
    "fade", "slide", "typewriter", "pop", "bounce", "zoom", "glitch",
    "wave", "word_pop", "letter_pop", "kinetic", "neon", "rise", "drop",
    "blur", "cinematic",
]

EFFECTS = {
    "fade", "slide", "typewriter", "pop", "bounce", "zoom", "glitch",
    "wave", "word_pop", "letter_pop", "kinetic", "neon", "rise", "drop",
    "blur", "cinematic",
}


def _load_font(size: int) -> ImageFont.FreeTypeFont:
    candidates = [
        "DejaVuSans-Bold.ttf",
        "Arial Bold.ttf",
        "C:/Windows/Fonts/arialbd.ttf",
        "C:/Windows/Fonts/segoeuib.ttf",
    ]
    for candidate in candidates:
        try:
            return ImageFont.truetype(candidate, size)
        except OSError:
            continue
    return ImageFont.load_default()


def _ease_out(t: float) -> float:
    t = max(0.0, min(1.0, t))
    return 1.0 - (1.0 - t) ** 3


def _ease_in_out(t: float) -> float:
    t = max(0.0, min(1.0, t))
    return t * t * (3.0 - 2.0 * t)


def _fit_font(text: str, max_width: int, initial: int) -> ImageFont.FreeTypeFont:
    size = max(18, int(initial))
    while size > 18:
        font = _load_font(size)
        bbox = font.getbbox(text or " ")
        if bbox[2] - bbox[0] <= max_width:
            return font
        size -= 2
    return _load_font(size)


def _draw_center(
    layer: Image.Image,
    text: str,
    font: ImageFont.FreeTypeFont,
    center: tuple[float, float],
    fill: tuple,
    *,
    scale: float = 1.0,
    angle: float = 0.0,
    stroke: int = 0,
    stroke_fill=(0, 0, 0, 0),
    blur: float = 0.0,
) -> None:
    if not text:
        return

    bbox = font.getbbox(text)
    w = max(1, bbox[2] - bbox[0])
    h = max(1, bbox[3] - bbox[1])
    pad = 40 + stroke * 2
    tile = Image.new("RGBA", (w + pad * 2, h + pad * 2), (0, 0, 0, 0))
    d = ImageDraw.Draw(tile)
    d.text(
        (pad - bbox[0], pad - bbox[1]),
        text,
        font=font,
        fill=fill,
        stroke_width=stroke,
        stroke_fill=stroke_fill,
    )
    if scale != 1.0:
        tile = tile.resize(
            (max(1, int(tile.width * scale)), max(1, int(tile.height * scale))),
            Image.Resampling.LANCZOS,
        )
    if angle:
        tile = tile.rotate(angle, resample=Image.Resampling.BICUBIC, expand=True)
    if blur:
        tile = tile.filter(ImageFilter.GaussianBlur(blur))

    x = int(center[0] - tile.width / 2)
    y = int(center[1] - tile.height / 2)
    layer.alpha_composite(tile, (x, y))


def _word_chunks(text: str) -> list[str]:
    return text.split()


def _render_frame(
    text: str,
    effect: str,
    phase: float,
    width: int,
    height: int,
    font_size: int,
    text_color: tuple[int, int, int],
) -> Image.Image:
    phase = phase % 1.0
    frame = Image.new("RGBA", (width, height), (0, 0, 0, 0))
    max_width = int(width * 0.82)
    font = _fit_font(text, max_width, font_size)
    center = (width / 2, height * 0.50)
    color = (*text_color, 255)

    if effect == "fade":
        alpha = int(255 * (1 - abs(2 * phase - 1)) ** 0.7)
        _draw_center(frame, text, font, center, (*text_color, alpha),
                     stroke=2, stroke_fill=(0, 0, 0, max(0, alpha // 2)))

    elif effect == "slide":
        p = _ease_out(min(1.0, phase / 0.35))
        x = -width * 0.45 + (width * 0.95) * p
        if phase > 0.45:
            x = width / 2
        _draw_center(frame, text, font, (x, center[1]), color, stroke=2,
                     stroke_fill=(0, 0, 0, 180))

    elif effect == "typewriter":
        n = max(0, min(len(text), int(math.ceil(len(text) * min(1.0, phase / 0.55)))))
        shown = text[:n]
        _draw_center(frame, shown, font, center, color, stroke=2,
                     stroke_fill=(0, 0, 0, 180))

    elif effect == "pop":
        p = min(1.0, phase / 0.30)
        scale = 0.55 + 0.55 * _ease_out(p)
        if phase < 0.38:
            scale += 0.08 * math.sin(p * math.pi)
        _draw_center(frame, text, font, center, color, scale=scale, stroke=2,
                     stroke_fill=(0, 0, 0, 190))

    elif effect == "bounce":
        p = min(1.0, phase / 0.55)
        y = center[1] - (1.0 - _ease_out(p)) * height * 0.30
        y += math.sin(p * math.pi * 3.0) * (1.0 - p) * height * 0.08
        _draw_center(frame, text, font, (center[0], y), color, stroke=2,
                     stroke_fill=(0, 0, 0, 190))

    elif effect == "zoom":
        scale = 0.35 + 0.75 * _ease_out(min(1.0, phase / 0.55))
        scale *= 1.0 + 0.03 * math.sin(phase * math.pi * 4)
        _draw_center(frame, text, font, center, color, scale=scale, stroke=2,
                     stroke_fill=(0, 0, 0, 190))

    elif effect == "glitch":
        jitter = int(10 * (1 - phase) + 4)
        for dx, dy, c in [
            (-jitter, 0, (255, 40, 90, 180)),
            (jitter, 1, (40, 220, 255, 180)),
            (0, 0, color),
        ]:
            _draw_center(frame, text, font, (center[0] + dx, center[1] + dy),
                         c, stroke=1, stroke_fill=(0, 0, 0, 180))
        if int(phase * 60) % 7 == 0:
            draw = ImageDraw.Draw(frame)
            y = int(center[1] - font.size / 2 + (phase * 91) % max(1, font.size))
            draw.rectangle((0, y, width, y + 3), fill=(255, 255, 255, 80))

    elif effect == "wave":
        chars = list(text)
        widths = [font.getlength(c) for c in chars]
        total = sum(widths)
        x = (width - total) / 2
        for i, (char, cw) in enumerate(zip(chars, widths)):
            y = center[1] + math.sin(phase * math.pi * 4 + i * 0.55) * height * 0.045
            _draw_center(frame, char, font, (x + cw / 2, y), color, stroke=1,
                         stroke_fill=(0, 0, 0, 170))
            x += cw

    elif effect in {"word_pop", "kinetic"}:
        words = _word_chunks(text)
        if not words:
            return frame
        gap = font.getlength(" ")
        widths = [font.getlength(w) for w in words]
        total = sum(widths) + gap * (len(words) - 1)
        x = (width - total) / 2
        for i, (word, ww) in enumerate(zip(words, widths)):
            local = (phase * max(1, len(words)) - i)
            if local <= 0:
                alpha = 0
                scale = 0.55
            else:
                p = min(1.0, local / 1.15)
                alpha = int(255 * min(1.0, p))
                scale = 0.72 + 0.28 * _ease_out(p)
            y = center[1]
            if effect == "kinetic":
                y += (1.0 - min(1.0, max(0.0, local))) * height * 0.08
                y += math.sin(phase * math.pi * 2 + i) * 4
            _draw_center(frame, word, font, (x + ww / 2, y),
                         (*text_color, alpha), scale=scale, stroke=2,
                         stroke_fill=(0, 0, 0, max(0, alpha // 2)))
            x += ww + gap

    elif effect == "letter_pop":
        chars = list(text)
        gap = max(2.0, font.size * 0.03)
        widths = [font.getlength(c) for c in chars]
        total = sum(widths) + gap * max(0, len(chars) - 1)
        x = (width - total) / 2
        for i, (char, cw) in enumerate(zip(chars, widths)):
            local = phase * len(chars) - i
            p = max(0.0, min(1.0, local / 1.4))
            alpha = int(255 * p)
            y = center[1] - math.sin(p * math.pi) * height * 0.08
            _draw_center(frame, char, font, (x + cw / 2, y),
                         (*text_color, alpha), scale=0.65 + 0.35 * _ease_out(p),
                         stroke=1, stroke_fill=(0, 0, 0, max(0, alpha // 2)))
            x += cw + gap

    elif effect == "neon":
        glow = Image.new("RGBA", frame.size, (0, 0, 0, 0))
        _draw_center(glow, text, font, center, (255, 70, 210, 220),
                     stroke=5, stroke_fill=(255, 70, 210, 180), blur=14)
        _draw_center(frame, text, font, center, (255, 255, 255, 255),
                     stroke=2, stroke_fill=(255, 70, 210, 255))
        frame.alpha_composite(glow)

    elif effect in {"rise", "drop"}:
        direction = 1 if effect == "rise" else -1
        p = _ease_out(min(1.0, phase / 0.45))
        y = center[1] + direction * (1 - p) * height * 0.30
        _draw_center(frame, text, font, (center[0], y), color, stroke=2,
                     stroke_fill=(0, 0, 0, 190))

    elif effect == "blur":
        p = _ease_in_out(min(1.0, phase / 0.55))
        _draw_center(frame, text, font, center, color, blur=(1 - p) * 12,
                     stroke=2, stroke_fill=(0, 0, 0, 170))

    elif effect == "cinematic":
        p = _ease_in_out(min(1.0, phase / 0.55))
        scale = 0.90 + 0.10 * p
        y = center[1] + math.sin(phase * math.pi * 2) * 2
        _draw_center(frame, text, font, (center[0], y), color, scale=scale,
                     stroke=3, stroke_fill=(0, 0, 0, 220))
        d = ImageDraw.Draw(frame)
        bar_h = int(height * 0.10)
        alpha = int(130 * (1 - p) + 50)
        d.rectangle((0, 0, width, bar_h), fill=(0, 0, 0, alpha))
        d.rectangle((0, height - bar_h, width, height), fill=(0, 0, 0, alpha))

    return frame


def render_animated_text_frames(
    text: str,
    output_dir: str,
    duration: float,
    *,
    effect: str = "kinetic",
    width: int = 1080,
    height: int = 1920,
    font_size: int | None = None,
    fps: int = 24,
    text_color: tuple[int, int, int] = (255, 212, 0),
) -> str:
    """Render a transparent overlay sequence for video compositing."""
    text = " ".join((text or "").split())
    if not text:
        raise ValueError("Animated text cannot be empty.")
    effect = effect if effect in EFFECTS else "kinetic"
    out = Path(output_dir)
    out.mkdir(parents=True, exist_ok=True)
    font_size = font_size or max(42, min(112, int(width * 0.075)))
    count = max(1, int(math.ceil(max(0.1, duration) * fps)))

    for i in range(count):
        phase = (i / max(1, fps * 2.8)) % 1.0
        frame = _render_frame(text, effect, phase, width, height, font_size, text_color)
        frame.save(out / f"frame_{i:08d}.png")

    return str(out)


def generate_animated_text(
    text: str,
    output_path: str = "outputs/animated_text.gif",
    effect: str = "fade",
    width: int = 800,
    height: int = 300,
    font_size: int = 64,
    bg_color: tuple = (15, 15, 25),
    text_color: tuple = (255, 200, 60),
    n_frames: int = 30,
    fps: int = 20,
) -> str:
    """Create the standalone animated-text GIF used by the Animated Text tool."""
    frames = []
    for i in range(n_frames):
        phase = i / max(n_frames - 1, 1)
        rgba = _render_frame(text, effect, phase, width, height, font_size, text_color)
        bg = Image.new("RGBA", (width, height), (*bg_color, 255))
        bg.alpha_composite(rgba)
        frames.append(bg.convert("RGB"))

    if not frames:
        raise ValueError("Could not render animated text.")

    Path(output_path).parent.mkdir(parents=True, exist_ok=True)
    frames[0].save(
        output_path,
        save_all=True,
        append_images=frames[1:],
        duration=max(1, int(1000 / fps)),
        loop=0,
    )
    return output_path
