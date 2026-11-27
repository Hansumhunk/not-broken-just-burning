"""Full content validation for the NBJB shared social-preview JPEG."""
from io import BytesIO
from hashlib import sha256
from PIL import Image, ImageFile

SOCIAL_PATH = "assets/social-share-v2.jpg"
SOCIAL_ORIGIN = "https://notbrokenjustburning.com"
SOCIAL_URL = SOCIAL_ORIGIN + "/" + SOCIAL_PATH
SOCIAL_SIZE = (1200, 630)
SOCIAL_SHA256 = "3517af915905a5119ed9ade8e4d79104e281338ab5d2e2ab1dd36cd4e0d12ea4"

def validate_social_image(data):
    """Return decoded image dimensions; reject invalid, truncated, or wrong-format bytes."""
    if not data.startswith(b"\xff\xd8") or not data.endswith(b"\xff\xd9"):
        raise ValueError("Expected complete JPEG SOI/EOI markers")
    ImageFile.LOAD_TRUNCATED_IMAGES = False
    with Image.open(BytesIO(data)) as image:
        if image.format != "JPEG" or image.mode != "RGB" or image.size != SOCIAL_SIZE:
            raise ValueError(f"Expected RGB JPEG {SOCIAL_SIZE}, got {image.format} {image.mode} {image.size}")
        image.verify()
    with Image.open(BytesIO(data)) as image:
        image.load()
        if image.size != SOCIAL_SIZE or image.mode != "RGB":
            raise ValueError("Decoded image dimensions or mode do not match")
        if sha256(data).hexdigest() != SOCIAL_SHA256:
            raise ValueError("JPEG bytes differ from the approved SHA-256 integrity contract")
        return image.size
