from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity, create_access_token
from functools import wraps
from extensions import db
from models import User, Location, ContextSnippet, LocationMedia, user_favorites
from geoalchemy2.functions import ST_DWithin
from geoalchemy2.shape import from_shape
from shapely.geometry import Point
import os


bp = Blueprint('main', __name__)


@bp.route('/')
def home():
    """
    Get API info
    ---
    tags:
      - General
    responses:
      200:
        description: API name, version, status, and available endpoints
    """
    return jsonify({
        "name": "Explora API",
        "version": "1.0",
        "status": "running",
        "docs": "https://github.com/Theocrite2/Explora",
        "endpoints": {
            "public": ["GET /api/context?lat=&lng=&radius="],
            "auth": ["POST /api/register", "POST /api/login"],
            "user": ["GET /api/favorites", "POST /api/locations/<id>/favorite",
                     "DELETE /api/locations/<id>/favorite", "POST /api/user/location",
                     "GET /api/locations/<id>"],
            "admin": ["POST /api/admin/locations", "GET /admin/users",
                      "GET /admin/users/<id>", "PATCH /admin/users/<id>",
                      "DELETE /admin/users/<id>"]
        }
    })


@bp.route('/api/context')
def get_context():
    """
    Get nearby locations with context snippets and media
    ---
    tags:
      - Public
    parameters:
      - name: lat
        in: query
        type: number
        required: true
        description: Latitude of the user's position
      - name: lng
        in: query
        type: number
        required: true
        description: Longitude of the user's position
      - name: radius
        in: query
        type: number
        required: false
        default: 1000
        description: Search radius in metres (default 1000)
    responses:
      200:
        description: List of nearby locations with snippets and media
      400:
        description: Missing lat or lng query parameter
    """
    lat = request.args.get('lat', type=float)
    lng = request.args.get('lng', type=float)
    radius = request.args.get('radius', default=1000, type=float)  # metres

    if lat is None or lng is None:
        return jsonify({'error': 'Provide lat and lng parameters'}), 400

    user_point = from_shape(Point(lng, lat), srid=4326)

    locations = Location.query.filter(
        ST_DWithin(
            Location.coordinates,
            user_point,
            radius
        )
    ).all()

    if not locations:
        return jsonify([])

    result = []
    for loc in locations:
        loc_data = {
            'name': loc.name,
            'coordinates': {'lat': loc.latitude, 'lng': loc.longitude},
            'snippets': [],
            'media': []
        }
        for snippet in loc.snippets:
            loc_data['snippets'].append({
                'title': snippet.title,
                'description': snippet.description,
                'type': snippet.type,
                'source': snippet.source_url
            })
        for m in loc.media:
            loc_data['media'].append({
                'type': m.media_type,
                'url': m.url
            })
        result.append(loc_data)

    return jsonify(result)


@bp.route('/api/register', methods=['POST'])
def register():
    """
    Register a new user
    ---
    tags:
      - Auth
    parameters:
      - in: body
        name: body
        required: true
        schema:
          type: object
          required:
            - username
            - email
            - password
          properties:
            username:
              type: string
              example: john_doe
            email:
              type: string
              example: john@example.com
            password:
              type: string
              example: secret123
    responses:
      201:
        description: User created successfully
      400:
        description: Missing fields, duplicate username, or duplicate email
    """
    data = request.get_json()
    if not data or not data.get('username') or not data.get('email') or not data.get('password'):
        return jsonify({'error': 'Missing username, email or password'}), 400

    if User.query.filter_by(username=data['username']).first():
        return jsonify({'error': 'Username already taken'}), 400

    if User.query.filter_by(email=data['email']).first():
        return jsonify({'error': 'Email already registered'}), 400

    user = User(username=data['username'], email=data['email'])
    user.set_password(data['password'])
    db.session.add(user)
    db.session.commit()
    return jsonify({'message': 'User created successfully'}), 201


@bp.route('/api/login', methods=['POST'])
def login():
    """
    Login and obtain a JWT access token
    ---
    tags:
      - Auth
    parameters:
      - in: body
        name: body
        required: true
        schema:
          type: object
          required:
            - email
            - password
          properties:
            email:
              type: string
              example: john@example.com
            password:
              type: string
              example: secret123
    responses:
      200:
        description: JWT access token, user ID, and admin flag
      400:
        description: Missing email or password
      401:
        description: Invalid email or password
    """
    data = request.get_json()
    if not data or not data.get('email') or not data.get('password'):
        return jsonify({'error': 'Missing email or password'}), 400

    user = User.query.filter_by(email=data['email']).first()
    if not user or not user.check_password(data['password']):
        return jsonify({'error': 'Invalid email or password'}), 401

    access_token = create_access_token(identity=str(user.id))
    return jsonify({'access_token': access_token, 'user_id': user.id, 'is_admin': user.is_admin}), 200


@bp.route('/api/locations/<int:location_id>/favorite', methods=['POST'])
@jwt_required()
def add_favorite(location_id):
    """
    Add a location to the current user's favorites
    ---
    tags:
      - User
    security:
      - BearerAuth: []
    parameters:
      - name: location_id
        in: path
        type: integer
        required: true
        description: ID of the location to favorite
    responses:
      200:
        description: Location added to favorites (or already favorited)
      404:
        description: Location not found
    """
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)
    location = Location.query.get(location_id)

    if not location:
        return jsonify({'error': 'Location not found'}), 404

    if location in user.favorites:
        return jsonify({'message': 'Already favorited'}), 200

    user.favorites.append(location)
    db.session.commit()
    return jsonify({'message': 'Location added to favorites'}), 200


@bp.route('/api/locations/<int:location_id>/favorite', methods=['DELETE'])
@jwt_required()
def remove_favorite(location_id):
    """
    Remove a location from the current user's favorites
    ---
    tags:
      - User
    security:
      - BearerAuth: []
    parameters:
      - name: location_id
        in: path
        type: integer
        required: true
        description: ID of the location to unfavorite
    responses:
      200:
        description: Removed from favorites
    """
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)
    location = Location.query.get(location_id)

    if location in user.favorites:
        user.favorites.remove(location)
        db.session.commit()
    return jsonify({'message': 'Removed from favorites'}), 200


@bp.route('/api/favorites', methods=['GET'])
@jwt_required()
def get_favorites():
    """
    Get the current user's favorited locations
    ---
    tags:
      - User
    security:
      - BearerAuth: []
    responses:
      200:
        description: List of favorited locations with id, name, latitude, and longitude
    """
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)

    favorites = []
    for loc in user.favorites:
        favorites.append({
            'id': loc.id,
            'name': loc.name,
            'latitude': loc.latitude,
            'longitude': loc.longitude
        })
    return jsonify(favorites), 200


def admin_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        user_id = get_jwt_identity()
        user = User.query.get(user_id)
        if not user or not user.is_admin:
            return jsonify({'error': 'Admin access required'}), 403
        return f(*args, **kwargs)
    return decorated_function


@bp.route('/api/admin/locations', methods=['POST'])
@jwt_required()
@admin_required
def create_location():
    """
    Create a new location (admin only)
    ---
    tags:
      - Admin
    security:
      - BearerAuth: []
    parameters:
      - in: body
        name: body
        required: true
        schema:
          type: object
          required:
            - name
            - latitude
            - longitude
          properties:
            name:
              type: string
              example: Eiffel Tower
            latitude:
              type: number
              example: 48.8584
            longitude:
              type: number
              example: 2.2945
    responses:
      201:
        description: Location created and image generation queued
      400:
        description: Missing name, latitude, or longitude
      403:
        description: Admin access required
    """
    if not os.getenv('TESTING'):
        from tasks import generate_location_image
    data = request.get_json()
    if not data or not data.get('name') or not data.get('latitude') or not data.get('longitude'):
        return jsonify({'error': 'Missing name, latitude or longitude'}), 400

    lat = data['latitude']
    lng = data['longitude']

    location = Location(
        name=data['name'],
        latitude=lat,
        longitude=lng,
        coordinates=from_shape(Point(lng, lat), srid=4326)
    )
    db.session.add(location)
    db.session.commit()

    generate_location_image.delay(location.id)

    return jsonify({'id': location.id, 'message': 'Location created'}), 201


@bp.route('/admin/users', methods=['GET'])
@jwt_required()
@admin_required
def list_users():
    """
    List all users with pagination (admin only)
    ---
    tags:
      - Admin
    security:
      - BearerAuth: []
    parameters:
      - name: page
        in: query
        type: integer
        default: 1
        description: Page number
      - name: per_page
        in: query
        type: integer
        default: 10
        description: Results per page
    responses:
      200:
        description: Paginated list of users with total, pages, and navigation flags
      403:
        description: Admin access required
    """
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 10, type=int)
    pagination = User.query.order_by(User.id.desc()).paginate(page=page, per_page=per_page, error_out=False)

    users = []
    for user in pagination.items:
        users.append({
            'id': user.id,
            'username': user.username,
            'email': user.email,
            'is_admin': user.is_admin,
            'created_at': getattr(user, 'created_at', None)
        })

    return jsonify({
        'users': users,
        'total': pagination.total,
        'page': page,
        'per_page': per_page,
        'pages': pagination.pages,
        'has_next': pagination.has_next,
        'has_prev': pagination.has_prev
    }), 200


@bp.route('/admin/users/<int:user_id>', methods=['DELETE'])
@jwt_required()
@admin_required
def delete_user(user_id):
    """
    Delete a user by ID (admin only)
    ---
    tags:
      - Admin
    security:
      - BearerAuth: []
    parameters:
      - name: user_id
        in: path
        type: integer
        required: true
        description: ID of the user to delete
    responses:
      200:
        description: User deleted successfully
      400:
        description: Cannot delete yourself
      403:
        description: Admin access required
      404:
        description: User not found
    """
    user = User.query.get(user_id)
    if not user:
        return jsonify({'error': 'User not found'}), 404

    current_user_id = int(get_jwt_identity())
    if user.id == current_user_id:
        return jsonify({'error': 'Cannot delete yourself'}), 400

    db.session.delete(user)
    db.session.commit()
    return jsonify({'message': f'User {user.username} deleted'}), 200


@bp.route('/admin/users/<int:user_id>', methods=['PATCH'])
@jwt_required()
@admin_required
def update_user(user_id):
    """
    Update a user's properties (admin only)
    ---
    tags:
      - Admin
    security:
      - BearerAuth: []
    parameters:
      - name: user_id
        in: path
        type: integer
        required: true
        description: ID of the user to update
      - in: body
        name: body
        schema:
          type: object
          properties:
            is_admin:
              type: boolean
              example: true
    responses:
      200:
        description: Updated user object with id, username, email, and is_admin
      400:
        description: Cannot change your own admin status
      403:
        description: Admin access required
      404:
        description: User not found
    """
    user = User.query.get(user_id)
    if not user:
        return jsonify({'error': 'User not found'}), 404

    data = request.get_json() or {}
    if 'is_admin' in data:
        current_user_id = int(get_jwt_identity())
        if user.id == current_user_id:
            return jsonify({'error': 'Cannot change your own admin status'}), 400
        user.is_admin = bool(data['is_admin'])

    db.session.commit()
    return jsonify({'id': user.id, 'username': user.username, 'email': user.email, 'is_admin': user.is_admin}), 200


@bp.route('/admin/users/<int:user_id>', methods=['GET'])
@jwt_required()
@admin_required
def get_user(user_id):
    """
    Get a single user by ID (admin only)
    ---
    tags:
      - Admin
    security:
      - BearerAuth: []
    parameters:
      - name: user_id
        in: path
        type: integer
        required: true
        description: ID of the user to retrieve
    responses:
      200:
        description: User object with id, username, email, and is_admin
      403:
        description: Admin access required
      404:
        description: User not found
    """
    user = User.query.get(user_id)
    if not user:
        return jsonify({'error': 'User not found'}), 404

    return jsonify({'id': user.id, 'username': user.username, 'email': user.email, 'is_admin': user.is_admin}), 200


@bp.route('/api/user/location', methods=['POST'])
@jwt_required()
def update_location():
    """
    Submit user's current location to trigger nearby image generation
    ---
    tags:
      - User
    security:
      - BearerAuth: []
    parameters:
      - in: body
        name: body
        required: true
        schema:
          type: object
          required:
            - lat
            - lng
          properties:
            lat:
              type: number
              example: 48.8584
            lng:
              type: number
              example: 2.2945
    responses:
      200:
        description: Location processed; returns nearby location count and any image generation tasks triggered
      400:
        description: Missing lat or lng
    """
    from tasks import generate_location_image
    data = request.get_json()
    lat = data.get('lat')
    lng = data.get('lng')
    if lat is None or lng is None:
        return jsonify({'msg': 'Missing lat/lng'}), 400

    radius = 500
    user_point = from_shape(Point(lng, lat), srid=4326)
    nearby_locations = Location.query.filter(
        ST_DWithin(Location.coordinates, user_point, radius)
    ).all()

    triggered = []
    for loc in nearby_locations:
        if not any(m.media_type == 'image' for m in loc.media):
            generate_location_image.delay(loc.id)
            triggered.append({'id': loc.id, 'name': loc.name})

    return jsonify({
        'msg': 'Location processed',
        'nearby_locations': len(nearby_locations),
        'generation_triggered_for': triggered
    })