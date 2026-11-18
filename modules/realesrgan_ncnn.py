"""RANANO local Real-ESRGAN NCNN Vulkan bridge.

Uses the official portable Windows executable. No Python ML runtime,
Hugging Face credits, CUDA, or PyTorch are required for this path.
"""
from __future__ import annotations

import os
import subprocess
import tempfile
from pathlib import Path

from PIL import Image


def _find_executable() -> Path:
    configured = os.getenv("RANANO_REALESRGAN_EXE", "").strip()
    candidates = []
    if configured:
        candidates.append(Path(configured))

    project_root = Path(__file__).resolve().parent.parent
    candidates.extend([
        project_root / "tools" / "realesrgan" / "realesrgan-ncnn-vulkan.exe",
        project_root / "tools" / "Real-ESRGAN" / "realesrgan-ncnn-vulkan.exe",
        project_root / "realesrgan" / "realesrgan-ncnn-vulkan.exe",
    ])

    for path in candidates:
        if path.is_file():
            return path.resolve()

    raise FileNotFoundError(
        "Real-ESRGAN NCNN executable not found. Put "
        "realesrgan-ncnn-vulkan.exe and its models folder in "
        "tools/realesrgan/, or set RANANO_REALESRGAN_EXE to its full path."
    )


def enhance_uploaded_image(image: Image.Image) -> Image.Image:
    if image is None:
        raise ValueError("No image was provided.")

    exe = _find_executable()
    project_root = Path(__file__).resolve().parent.parent
    work_root = project_root / "uploads" / "realesrgan_tmp"
    work_root.mkdir(parents=True, exist_ok=True)

    with tempfile.TemporaryDirectory(dir=work_root) as tmp:
        tmpdir = Path(tmp)
        input_path = tmpdir / "input.png"
        output_path = tmpdir / "output.png"
        image.convert("RGB").save(input_path, format="PNG")

        cmd = [
            str(exe),
            "-i", str(input_path),
            "-o", str(output_path),
            "-n", os.getenv("RANANO_REALESRGAN_MODEL", "realesrgan-x4plus"),
            "-s", os.getenv("RANANO_REALESRGAN_SCALE", "4"),
            "-f", "png",
        ]

        print("[RANANO] Running Real-ESRGAN NCNN Vulkan x4...", flush=True)
        result = subprocess.run(
            cmd,
            cwd=str(exe.parent),
            capture_output=True,
            text=True,
            timeout=int(os.getenv("RANANO_REALESRGAN_TIMEOUT", "180")),
            creationflags=getattr(subprocess, "CREATE_NO_WINDOW", 0),
        )

        if result.returncode != 0:
            details = (result.stderr or result.stdout or "unknown error").strip()
            raise RuntimeError(
                f"Real-ESRGAN NCNN exited with code {result.returncode}: {details}"
            )

        if not output_path.exists():
            details = (result.stderr or result.stdout or "no output produced").strip()
            raise RuntimeError(f"Real-ESRGAN produced no output: {details}")

        with Image.open(output_path) as result_image:
            return result_image.convert("RGB").copy()
