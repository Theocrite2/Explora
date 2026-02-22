import os
import replicate
import requests
import tempfile
from app import celery
from extensions import db
from models import Location, LocationMedia
from cloudinary_utils import upload_image


@celery.task(bind=True, max_retries=3, default_retry_delay=10)
def generate_location_image(self, location_id):
    # 1. Fetch location
    location = Location.query.get(location_id)
    if not location:
        return f"Location {location_id} not found"

    # 2. Skip if image already exists
    existing = LocationMedia.query.filter_by(
        location_id=location_id,
        media_type='image'
    ).first()
    if existing:
        return f"Image already exists for location {location_id}"

    # 3. Build prompt
    prompt = (
        f"Generate an image representing {location.name} "
        "with a twist of grandeur, fantasy, historical, "
        "kind of first person view."
    )

    # 4. Call Replicate
    try:
        output = replicate.run(
            "black-forest-labs/flux-1.1-pro",
            input={"prompt": prompt}
        )
        image_url = output[0] if isinstance(output, list) else str(output)
    except Exception as e:
        raise self.retry(exc=e)

    # 5. Download to temp file
    with tempfile.NamedTemporaryFile(suffix=".png", delete=False) as tmp:
        tmp.write(requests.get(image_url).content)
        tmp_path = tmp.name

    # 6. Upload to Cloudinary
    public_id = f"explora/location_{location_id}"
    try:
        cloudinary_url = upload_image(tmp_path, public_id=public_id)
    finally:
        os.unlink(tmp_path)

    # 7. Save to DB
    media = LocationMedia(
        location_id=location_id,
        media_type='image',
        url=cloudinary_url
    )
    db.session.add(media)
    db.session.commit()

    return f"Image generated for location {location_id}: {cloudinary_url}"