"""
RANANO Cloud Image Engine

Text-to-image generation: Cloudflare Workers AI FLUX.1 Schnell
Image enhancement: existing Hugging Face provider
"""

import io
import os
import base64
import requests
from typing import Optional
from PIL import Image
from huggingface_hub import InferenceClient


CLOUDFLARE_MODEL = "@cf/black-forest-labs/flux-1-schnell"

DEFAULT_ENHANCEMENT_MODEL = os.getenv(
    "HF_ENHANCEMENT_MODEL",
    "black-forest-labs/FLUX.2-klein-9B",
)

DEFAULT_PROVIDER = os.getenv("HF_PROVIDER", "auto")


def _cloudflare_credentials():
    account_id = os.getenv("CLOUDFLARE_ACCOUNT_ID", "").strip()
    token = os.getenv("CLOUDFLARE_API_TOKEN", "").strip()

    if not account_id:
        raise RuntimeError("CLOUDFLARE_ACCOUNT_ID is missing in backend/.env")

    if not token:
        raise RuntimeError("CLOUDFLARE_API_TOKEN is missing in backend/.env")

    return account_id, token


def generate_text_to_image(
    prompt: str,
    *,
    negative_prompt: Optional[str] = None,
    model: Optional[str] = None,
) -> Image.Image:
    """Generate a realistic image using Cloudflare Workers AI."""

    account_id, token = _cloudflare_credentials()

    endpoint = (
        f"https://api.cloudflare.com/client/v4/accounts/"
        f"{account_id}/ai/run/{CLOUDFLARE_MODEL}"
    )

    payload = {
        "prompt": prompt[:2048],
        "steps": 4,
    }

    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json",
    }

    print("[RANANO] Generating image with Cloudflare FLUX.1 Schnell", flush=True)

    response = requests.post(
        endpoint,
        headers=headers,
        json=payload,
        timeout=180,
    )

    if not response.ok:
        raise RuntimeError(
            f"Cloudflare image generation failed "
            f"(HTTP {response.status_code}): {response.text[:1000]}"
        )

    # Cloudflare normally returns JSON with a Base64 image field.
    try:
        data = response.json()
        image_base64 = data.get("result", {}).get("image")

        if not image_base64:
            image_base64 = data.get("image")

        if image_base64:
            image_bytes = base64.b64decode(image_base64)
            image = Image.open(io.BytesIO(image_bytes))
            return image.convert("RGB")

    except (ValueError, KeyError, TypeError):
        pass

    # Support a raw image response if returned directly.
    try:
        image = Image.open(io.BytesIO(response.content))
        return image.convert("RGB")
    except Exception as exc:
        raise RuntimeError(
            "Cloudflare returned a successful response, "
            "but Ranano could not decode the image."
        ) from exc


def enhance_image(
    image: Image.Image,
    *,
    prompt: str = (
        "Enhance this image while preserving the original "
        "subject, composition, identity, colors and important "
        "details. Improve clarity, sharpness, fine details, "
        "lighting and overall visual quality. Do not replace "
        "or invent the main subject."
    ),
    negative_prompt: Optional[str] = (
        "blurry, distorted, changed subject, extra objects, "
        "duplicate objects, altered identity, artifacts, oversharpened"
    ),
    model: Optional[str] = None,
) -> Image.Image:
    """
    Existing Hugging Face image enhancement.
    Kept separate from Cloudflare text-to-image generation.
    """

    token = os.getenv("HF_TOKEN", "").strip()

    if not token:
        raise RuntimeError(
            "HF_TOKEN is required for image enhancement."
        )

    client = InferenceClient(
        provider=DEFAULT_PROVIDER,
        api_key=token,
    )

    buffer = io.BytesIO()
    image.convert("RGB").save(buffer, format="PNG")
    buffer.seek(0)

    enhanced = client.image_to_image(
        image=buffer,
        prompt=prompt,
        negative_prompt=negative_prompt,
        model=model or DEFAULT_ENHANCEMENT_MODEL,
    )

    return enhanced.convert("RGB")
