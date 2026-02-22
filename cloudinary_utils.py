import cloudinary
import cloudinary.uploader
from flask import current_app

def configure_cloudinary():
    cloudinary.config(
        cloud_name=current_app.config['CLOUDINARY_CLOUD_NAME'],
        api_key=current_app.config['CLOUDINARY_API_KEY'],
        api_secret=current_app.config['CLOUDINARY_API_SECRET']
    )

def upload_image(file_path, public_id=None):
    configure_cloudinary()
    response = cloudinary.uploader.upload(file_path, public_id=public_id)
    return response['secure_url']