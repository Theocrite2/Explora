from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity, create_access_token
from functools import wraps
from extensions import db
from models import User, Location, ContextSnippet, LocationMedia, user_favorites
from geoalchemy2.functions import ST_DWithin
from geoalchemy2.shape import from_shape
from shapely.geometry import Point


bp = Blueprint('main', __name__)


@bp.route('/')
def home():
    return '''
    <h1>Explora API is Running!</h1>
    <p>Available endpoints:</p>
    <ul>
        <li><a href="/init_db">/init_db</a> - Create database tables (run once)</li>
        <li><a href="/api/test">/api/test</a> - Test if API works</li>
        <li><a href="/api/admin/add_dummy">/api/admin/add_dummy</a> - Add sample data</li>
        <li><a href="/api/context?lat=48.85&lng=2.35">/api/context</a> - Get context for coordinates</li>
    </ul>
    '''


@bp.route('/init_db')
def init_db():
    db.create_all()
    return 'Database tables created!'


@bp.route('/api/admin/add_dummy')
def add_dummy_data():
    try:
        paris = Location(name='Notre-Dame de Paris', latitude=48.852968, longitude=2.349902)
        history_snippet = ContextSnippet(
            title='Medieval Marvel',
            description='Construction began in 1163. A masterpiece of French Gothic architecture.',
            type='history',
            source_url='https://en.wikipedia.org/wiki/Notre-Dame_de_Paris',
            location=paris
        )
        db.session.add(paris)
        db.session.add(history_snippet)
        db.session.commit()
        return jsonify({'success': True, 'message': f'Added {paris.name} with snippet: {history_snippet.title}'})
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@bp.route('/api/context')
def get_context():
    radius = request.args.get('radius', default=0.01, type=float)
    lat = request.args.get('lat', type=float)
    lng = request.args.get('lng', type=float)

    if lat is None or lng is None:
        return jsonify({'error': 'Provide lat and lng parameters'}), 400

    locations = Location.query.filter(
        Location.latitude.between(lat - radius, lat + radius),
        Location.longitude.between(lng - radius, lng + radius)
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
    user_id = get_jwt_identity()
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
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    location = Location.query.get(location_id)

    if location in user.favorites:
        user.favorites.remove(location)
        db.session.commit()
    return jsonify({'message': 'Removed from favorites'}), 200


@bp.route('/api/favorites', methods=['GET'])
@jwt_required()
def get_favorites():
    user_id = get_jwt_identity()
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
    user = User.query.get(user_id)
    if not user:
        return jsonify({'error': 'User not found'}), 404

    return jsonify({'id': user.id, 'username': user.username, 'email': user.email, 'is_admin': user.is_admin}), 200


@bp.route('/api/user/location', methods=['POST'])
@jwt_required()
def update_location():
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