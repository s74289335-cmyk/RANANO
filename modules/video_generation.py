"""
RANANO Video / Reel Generation

Creates a real social-video pipeline:
    images -> video -> optional AI voice -> background audio -> captions -> animated text -> MP4

Voice is generated through Hugging Face Inference Providers when HF_TOKEN is
configured. Kokoro-82M is used by default through the DeepInfra provider.
Background music is a lightweight generated ambient bed so the final reel has
a real audio track even when no music asset is supplied.

Environment variables:
    HF_TOKEN                 Hugging Face token used for provider routing
    HF_TTS_PROVIDER          default: deepinfra
    HF_TTS_MODEL             default: hexgrad/Kokoro-82M
    HF_TTS_VOICE_FEMALE      default: af_heart
    HF_TTS_VOICE_MALE        default: am_adam
    RANANO_MUSIC_VOLUME      default 0.10
    RANANO_VOICE_VOLUME      default 1.00
"""

from __future__ import annotations

import math
import os
import re
import subprocess
import tempfile
import uuid
import wave
from pathlib import Path
from typing import List, Optional

import numpy as np
from PIL import Image, ImageOps
import torch


FPS = 24
DEFAULT_FPS = FPS
DEFAULT_SECONDS_PER_IMAGE = 2.0
DEFAULT_SIZE = (1080, 1920)


def _run(cmd: list[str]) -> None:
    """Run ffmpeg/ffprobe and raise a useful error on failure."""
    try:
        result = subprocess.run(
            cmd,
            check=True,
            capture_output=True,
            text=True,
        )
    except FileNotFoundError as exc:
        raise RuntimeError(
            "FFmpeg is required for reel rendering. Install FFmpeg and make "
            "sure the ffmpeg command is available on PATH."
        ) from exc
    except subprocess.CalledProcessError as exc:
        detail = (exc.stderr or exc.stdout or "").strip()
        raise RuntimeError(f"FFmpeg failed: {detail[-2500:]}") from exc


def _size_for_format(video_format: str) -> tuple[int, int]:
    return {
        "9:16": (1080, 1920),
        "16:9": (1920, 1080),
        "1:1": (1080, 1080),
    }.get(video_format, DEFAULT_SIZE)


def _safe_text(text: str) -> str:
    return re.sub(r"\s+", " ", (text or "")).strip()


def _split_caption_words(text: str, max_words: int = 7) -> list[str]:
    words = _safe_text(text).split()
    if not words:
        return []
    return [" ".join(words[i : i + max_words]) for i in range(0, len(words), max_words)]


def _write_srt(text: str, duration: float, path: str) -> None:
    """Create simple timed captions from the supplied narration text."""
    chunks = _split_caption_words(text)
    if not chunks:
        return

    total_words = max(1, len(_safe_text(text).split()))
    cursor = 0.0
    lines: list[str] = []

    for index, chunk in enumerate(chunks, 1):
        count = max(1, len(chunk.split()))
        segment = max(0.35, duration * count / total_words)
        start = cursor
        end = min(duration, cursor + segment)
        cursor = end
        lines.append(
            f"{index}\n{_srt_time(start)} --> {_srt_time(end)}\n{chunk}\n"
        )

    Path(path).write_text("\n".join(lines), encoding="utf-8")


def _write_animated_ass(text: str, duration: float, path: str, size: tuple[int, int]) -> None:
    """Create word-by-word animated ASS captions using karaoke timing."""
    words = _safe_text(text).split()
    if not words:
        return

    total_words = len(words)
    # Keep captions readable: up to 7 words per event.
    chunks = [words[i:i + 7] for i in range(0, total_words, 7)]
    header = f"""[Script Info]
ScriptType: v4.00+
PlayResX: {size[0]}
PlayResY: {size[1]}
ScaledBorderAndShadow: yes

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: RANANO,Arial,52,&H00FFFFFF,&H0000FFFF,&H00000000,&H80000000,-1,0,0,0,100,100,0,0,3,3,1,2,70,70,100,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
"""

    lines = [header]
    cursor = 0.0
    for chunk in chunks:
        chunk_duration = duration * len(chunk) / max(1, total_words)
        start = cursor
        end = min(duration, cursor + chunk_duration)
        cursor = end
        # ASS karaoke timing is in centiseconds. Highlight each word as it is spoken.
        per_word_cs = max(1, int(round((end - start) * 100 / len(chunk))))
        styled_words = [f"{{\\kf{per_word_cs}}}{word}" for word in chunk]
        lines.append(
            f"Dialogue: 0,{_ass_time(start)},{_ass_time(end)},RANANO,,0,0,0,,{' '.join(styled_words)}\n"
        )

    Path(path).write_text("".join(lines), encoding="utf-8-sig")


def _ass_time(seconds: float) -> str:
    seconds = max(0.0, float(seconds))
    centis = int(round(seconds * 100))
    h = centis // 360000
    m = (centis % 360000) // 6000
    s = (centis % 6000) // 100
    cs = centis % 100
    return f"{h}:{m:02d}:{s:02d}.{cs:02d}"

def _srt_time(seconds: float) -> str:
    seconds = max(0.0, float(seconds))
    whole = int(seconds)
    millis = int(round((seconds - whole) * 1000))
    if millis >= 1000:
        whole += 1
        millis = 0
    h = whole // 3600
    m = (whole % 3600) // 60
    s = whole % 60
    return f"{h:02d}:{m:02d}:{s:02d},{millis:03d}"


def _escape_filter_path(path: str) -> str:
    """Escape a Windows/Linux filename for an ffmpeg filter argument."""
    value = str(Path(path).resolve()).replace("\\", "/")
    value = value.replace("\\", "\\\\")
    value = value.replace(":", r"\:")
    value = value.replace("'", r"\'")
    return value


def _generate_background_music(output_path: str, duration: float, sample_rate: int = 44100) -> str:
    """Generate a subtle royalty-free ambient bed locally."""
    duration = max(0.1, float(duration))
    count = int(duration * sample_rate)
    t = np.arange(count, dtype=np.float32) / sample_rate

    # Soft triad with a slow amplitude envelope; deliberately quiet under speech.
    notes = (220.0, 277.18, 329.63)
    music = np.zeros_like(t)
    for freq in notes:
        music += np.sin(2 * np.pi * freq * t)
    music /= len(notes)
    envelope = 0.5 + 0.5 * np.sin(2 * np.pi * t / 8.0)
    fade = np.minimum(1.0, t / 1.5) * np.minimum(1.0, (duration - t) / 1.5)
    fade = np.clip(fade, 0.0, 1.0)
    music = music * envelope * fade * float(os.getenv("RANANO_MUSIC_VOLUME", "0.10"))

    pcm = np.clip(music * 32767.0, -32768, 32767).astype(np.int16)
    with wave.open(output_path, "wb") as wf:
        wf.setnchannels(1)
        wf.setsampwidth(2)
        wf.setframerate(sample_rate)
        wf.writeframes(pcm.tobytes())
    return output_path


def _hf_tts(text: str, output_path: str, voice: str = "female") -> str:
    """Generate hosted AI speech through Hugging Face provider routing.

    Kokoro-82M is used by default. The provider is configurable, but defaults
    to DeepInfra because the current Hugging Face provider catalog lists
    hexgrad/Kokoro-82M as available there.
    """
    token = os.getenv("HF_TOKEN", "").strip()
    if not token:
        raise RuntimeError("HF_TOKEN is required for AI voice generation.")

    from huggingface_hub import InferenceClient

    provider = os.getenv("HF_TTS_PROVIDER", "deepinfra").strip() or "deepinfra"
    model = os.getenv("HF_TTS_MODEL", "hexgrad/Kokoro-82M").strip()

    if voice.lower() == "male":
        selected_voice = os.getenv("HF_TTS_VOICE_MALE", "am_adam").strip() or "am_adam"
    else:
        selected_voice = os.getenv("HF_TTS_VOICE_FEMALE", "af_heart").strip() or "af_heart"

    print(
        f"[RANANO] TTS model={model} provider={provider} voice={selected_voice}",
        flush=True,
    )

    try:
        client = InferenceClient(
            provider=provider,
            api_key=token,
        )
        audio_bytes = client.text_to_speech(
            text=text,
            model=model,
            extra_body={"voice": selected_voice},
        )
    except Exception as exc:
        raise RuntimeError(
            "Hugging Face TTS failed. "
            f"model={model}, provider={provider}, voice={selected_voice}. "
            f"Provider error: {exc}"
        ) from exc

    if not audio_bytes:
        raise RuntimeError("The TTS provider returned empty audio.")

    Path(output_path).write_bytes(audio_bytes)
    return output_path


def _create_image_video(
    images: List[Image.Image],
    output_path: str,
    seconds_per_image: float,
    fps: int,
    size: tuple[int, int],
    target_duration: Optional[float] = None,
) -> str:
    """Create a visual timeline and repeat images until target_duration."""
    if not images:
        raise ValueError("At least one image is required to create a video.")

    output = Path(output_path)
    output.parent.mkdir(parents=True, exist_ok=True)

    with tempfile.TemporaryDirectory(prefix="ranano_frames_") as temp:
        frame_dir = Path(temp)
        base_frames_per_image = max(1, int(round(seconds_per_image * fps)))
        target_frames = None if target_duration is None else max(1, int(math.ceil(target_duration * fps)))

        frame_number = 0
        image_index = 0
        while target_frames is None or frame_number < target_frames:
            image = images[image_index % len(images)]
            fitted = ImageOps.fit(
                image.convert("RGB"),
                size,
                method=Image.Resampling.LANCZOS,
                centering=(0.5, 0.5),
            )
            frames_this_image = base_frames_per_image
            if target_frames is not None:
                frames_this_image = min(frames_this_image, target_frames - frame_number)
            for _ in range(frames_this_image):
                fitted.save(
                    frame_dir / f"frame_{frame_number:08d}.jpg",
                    quality=94,
                )
                frame_number += 1
            image_index += 1

        _run(
            [
                "ffmpeg", "-y",
                "-framerate", str(fps),
                "-i", str(frame_dir / "frame_%08d.jpg"),
                "-c:v", "libx264",
                "-pix_fmt", "yuv420p",
                "-movflags", "+faststart",
                str(output),
            ]
        )

    return str(output)

def _probe_duration(path: str) -> float:
    try:
        result = subprocess.run(
            [
                "ffprobe",
                "-v",
                "error",
                "-show_entries",
                "format=duration",
                "-of",
                "default=noprint_wrappers=1:nokey=1",
                path,
            ],
            capture_output=True,
            text=True,
            check=True,
        )
    except FileNotFoundError as exc:
        raise RuntimeError(
            "FFprobe is required for reel rendering. "
            "Make sure FFmpeg/FFprobe are available on PATH."
        ) from exc
    except subprocess.CalledProcessError as exc:
        detail = (
            exc.stderr or exc.stdout or ""
        ).strip()
        raise RuntimeError(
            f"FFprobe failed: {detail[-2000:]}"
        ) from exc

    value = result.stdout.strip()

    if not value:
        raise RuntimeError(
            f"Could not determine video duration for {path}"
        )

    return float(value)


def _render_final(
    video_path: str,
    output_path: str,
    duration: float,
    voice_path: Optional[str],
    music_path: Optional[str],
    captions_path: Optional[str],
    animated_text_dir: Optional[str] = None,
    animated_text_fps: int = FPS,
) -> str:
    """Mux audio and composite optional captions + animated text."""
    cmd = ["ffmpeg", "-y", "-i", video_path]

    # Input indexes are assigned dynamically because animated text is optional.
    overlay_index: Optional[int] = None
    voice_index: Optional[int] = None
    music_index: Optional[int] = None
    next_index = 1

    if animated_text_dir:
        cmd += [
            "-framerate", str(animated_text_fps),
            "-i", str(Path(animated_text_dir) / "frame_%08d.png"),
        ]
        overlay_index = next_index
        next_index += 1

    if voice_path:
        cmd += ["-i", voice_path]
        voice_index = next_index
        next_index += 1

    if music_path:
        cmd += ["-i", music_path]
        music_index = next_index
        next_index += 1

    video_chain = "[0:v]"
    complex_parts: list[str] = []

    if overlay_index is not None:
        complex_parts.append(
            f"[{overlay_index}:v]format=rgba[textoverlay];"
            f"{video_chain}[textoverlay]"
            "overlay=shortest=1:format=auto[vtext]"
        )
        video_chain = "[vtext]"

    if captions_path:
        caption_file = _escape_filter_path(captions_path)
        complex_parts.append(
            f"{video_chain}subtitles='{caption_file}'[vout]"
        )
        video_chain = "[vout]"

    audio_map = None

    if voice_index is not None and music_index is not None:
        complex_parts.extend([
            f"[{voice_index}:a]"
            f"volume={os.getenv('RANANO_VOICE_VOLUME', '1.0')}[voice]",
            f"[{music_index}:a]"
            f"volume={os.getenv('RANANO_MUSIC_VOLUME', '0.10')}[music]",
            "[voice][music]"
            "amix=inputs=2:duration=first:dropout_transition=2[aout]",
        ])
        audio_map = "[aout]"
    elif voice_index is not None:
        audio_map = f"{voice_index}:a:0"
    elif music_index is not None:
        audio_map = f"{music_index}:a:0"

    needs_complex_video = bool(animated_text_dir or captions_path)

    if needs_complex_video:
        # If there is no caption/overlay, the chain would remain [0:v].
        # Here at least one is present, so materialize it as [vout].
        if video_chain == "[0:v]":
            complex_parts.append("[0:v]null[vout]")
        elif not video_chain.startswith("[vout]"):
            complex_parts.append(f"{video_chain}null[vout]")
        cmd += ["-filter_complex", ";".join(complex_parts)]
        cmd += ["-map", "[vout]"]
    elif complex_parts:
        cmd += ["-filter_complex", ";".join(complex_parts)]
        cmd += ["-map", "0:v:0"]
    else:
        cmd += ["-map", "0:v:0"]

    if audio_map:
        cmd += ["-map", audio_map]

    cmd += [
        "-c:v", "libx264",
        "-pix_fmt", "yuv420p",
        "-c:a", "aac",
        "-b:a", "192k",
        "-t", f"{duration:.3f}",
        "-shortest",
        "-movflags", "+faststart",
        output_path,
    ]

    _run(cmd)
    return output_path

def slideshow_video(
    images: List[Image.Image],
    output_path: str = "outputs/slideshow.mp4",
    seconds_per_image: float = DEFAULT_SECONDS_PER_IMAGE,
    fps: int = FPS,
    size: tuple = DEFAULT_SIZE,
    *,
    voice_enabled: bool = False,
    voice_text: str = "",
    voice: str = "female",
    animated_text_enabled: bool = False,
    text_effect: str = "kinetic",
    captions_enabled: bool = False,
    background_music: bool = True,
    **_ignored,
) -> str:
    """Create a reel with optional AI voice, music, captions and animated text."""
    output = Path(output_path)
    output.parent.mkdir(parents=True, exist_ok=True)

    with tempfile.TemporaryDirectory(prefix="ranano_reel_") as temp:
        temp_dir = Path(temp)
        silent_video = temp_dir / "visual.mp4"
        voice_path: Optional[str] = None
        music_path: Optional[str] = None
        captions_path: Optional[str] = None
        animated_text_dir: Optional[str] = None

        narration_duration = 0.0

        if voice_enabled:
            text = _safe_text(voice_text)
            if not text:
                raise ValueError("voice_enabled is true but voice_text is empty.")

            voice_path = str(temp_dir / "voice.flac")
            print("[RANANO] Generating AI voice...", flush=True)
            _hf_tts(text, voice_path, voice=voice)
            narration_duration = _probe_duration(voice_path)
            print(f"[RANANO] AI voice duration: {narration_duration:.2f}s", flush=True)

        target_duration = narration_duration if narration_duration > 0 else None
        _create_image_video(
            images,
            str(silent_video),
            seconds_per_image,
            fps,
            size,
            target_duration=target_duration,
        )
        duration = _probe_duration(str(silent_video))

        if background_music:
            music_path = str(temp_dir / "background.wav")
            print("[RANANO] Generating background audio...", flush=True)
            _generate_background_music(music_path, duration)

        if captions_enabled:
            text = _safe_text(voice_text)
            if not text:
                raise ValueError(
                    "captions_enabled requires voice_text so RANANO can create timed captions."
                )
            captions_path = str(temp_dir / "captions.srt")
            print("[RANANO] Generating captions...", flush=True)
            _write_srt(text, duration, captions_path)

        if animated_text_enabled:
            text = _safe_text(voice_text)
            if not text:
                raise ValueError(
                    "animated_text_enabled requires voice_text so RANANO can animate it."
                )

            animated_text_dir = str(temp_dir / "animated_text")
            print(
                f"[RANANO] Rendering animated text effect={text_effect}...",
                flush=True,
            )

            from .animated_text import render_animated_text_frames
            render_animated_text_frames(
                text=text,
                output_dir=animated_text_dir,
                duration=duration,
                effect=text_effect,
                width=size[0],
                height=size[1],
                fps=fps,
            )

        print(
            "[RANANO] Rendering final MP4 "
            f"(voice={bool(voice_path)}, "
            f"music={bool(music_path)}, "
            f"captions={bool(captions_path)}, "
            f"animated_text={bool(animated_text_dir)}, "
            f"effect={text_effect})",
            flush=True,
        )

        _render_final(
            str(silent_video),
            str(output),
            duration,
            voice_path,
            music_path,
            captions_path,
            animated_text_dir=animated_text_dir,
            animated_text_fps=fps,
        )

    return str(output)


_svd_pipeline = None


def load_svd_pipeline(model_id: str = "stabilityai/stable-video-diffusion-img2vid-xt"):
    global _svd_pipeline
    if _svd_pipeline is None:
        from diffusers import StableVideoDiffusionPipeline
        device = "cuda" if torch.cuda.is_available() else "cpu"
        _svd_pipeline = StableVideoDiffusionPipeline.from_pretrained(
            model_id, torch_dtype=torch.float16, variant="fp16"
        ).to(device)
    return _svd_pipeline


def svd_image_to_video(
    image: Image.Image,
    output_path: str = "outputs/svd_output.mp4",
    fps: int = 7,
) -> str:
    """Generates an AI-animated video clip from a single still image."""
    from diffusers.utils import export_to_video

    if not torch.cuda.is_available():
        raise RuntimeError("Stable Video Diffusion requires a CUDA GPU.")

    pipe = load_svd_pipeline()
    image = image.convert("RGB").resize((1024, 576))
    frames = pipe(image, decode_chunk_size=8).frames[0]
    export_to_video(frames, output_path, fps=fps)
    return output_path


def generate_video(
    images: List[Image.Image],
    mode: str = "slideshow",
    output_path: str = None,
    *,
    format: str = "9:16",
    voice_enabled: bool = False,
    voice_text: str = "",
    voice: str = "female",
    animated_text_enabled: bool = False,
    text_effect: str = "kinetic",
    captions_enabled: bool = False,
    background_music: bool = True,
    **kwargs,
) -> str:
    """Unified entry point used by the API."""
    if mode == "svd" and torch.cuda.is_available() and not (
        voice_enabled or captions_enabled or background_music or animated_text_enabled
    ):
        return svd_image_to_video(
            images[0],
            output_path=output_path or "outputs/svd_output.mp4",
        )

    return slideshow_video(
        images,
        output_path=output_path or "outputs/slideshow.mp4",
        size=_size_for_format(format),
        voice_enabled=voice_enabled,
        voice_text=voice_text,
        voice=voice,
        animated_text_enabled=animated_text_enabled,
        text_effect=text_effect,
        captions_enabled=captions_enabled,
        background_music=background_music,
    )

