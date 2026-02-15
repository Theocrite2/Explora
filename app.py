from flask import Flask, jsonify, request
from flask_sqlalchemy import SQLAlchemy
from flask_bcrypt import Bcrypt
from flask_jwt_extended import JWTManager, create_access_token, jwt_required, get_jwt_identity
from functools import wraps
from dotenv import load_dotenv
import os

load_dotenv()
app = Flask(__name__)
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///site.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
db = SQLAlchemy(app)
app.config['JWT_SECRET_KEY'] = os.getenv('JWT_SECRET_KEY')
app.config['SECRET_KEY'] = os.getenv('SECRET_KEY')
jwt = JWTManager(app)
app.config['SQLALCHEMY_ECHO'] = True

bcrypt = Bcrypt(app)
jwt = JWTManager(app)



class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(128), nullable=False)
    is_admin = db.Column(db.Boolean, default=False)

    # Relationship: a user can favorite many locations (many-to-many)
    favorites = db.relationship('Location', secondary='user_favorites', backref='favorited_by')

    def set_password(self, password):
        self.password_hash = bcrypt.generate_password_hash(password).decode('utf-8')

    def check_password(self, password):
        return bcrypt.check_password_hash(self.password_hash, password)


# Association table for many-to-many relationship between User and Location
user_favorites = db.Table('user_favorites',
                          db.Column('user_id', db.Integer, db.ForeignKey('user.id'), primary_key=True),
                          db.Column('location_id', db.Integer, db.ForeignKey('location.id'), primary_key=True)
                          )


# --- DATABASE MODELS ---
class Location(db.Model):
    """
    A physical place on the map.                    
    ONE Location can have MANY ContextSnippets.
    """
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100))
    latitude = db.Column(db.Float, nullable=False)
    longitude = db.Column(db.Float, nullable=False)

    # RELATIONSHIP: This creates the one-to-many link
    # 'ContextSnippet' = The class we're relating to
    # backref='location' = Creates a .location attribute on ContextSnippet
    # lazy=True = Load snippets only when accessed (good for performance)
    snippets = db.relationship('ContextSnippet', backref='location', lazy=True)

    # REPR: String representation for debugging
    def __repr__(self):
        return f"Location('{self.name}', {self.latitude}, {self.longitude})"


class ContextSnippet(db.Model):
    """
    A piece of knowledge about a Location.
    MANY ContextSnippets belong to ONE Location.
    """
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(150), nullable=False)
    description = db.Column(db.Text, nullable=False)
    type = db.Column(db.String(50), nullable=False)  # 'history', 'science', etc.
    source_url = db.Column(db.String(500))
    photo_url = db.Column(db.String(500))

    # FOREIGN KEY: The actual database link (ID pointing to Location)
    location_id = db.Column(db.Integer, db.ForeignKey('location.id'), nullable=False)

    def __repr__(self):
        return f"ContextSnippet('{self.title}', '{self.type}')"


# --- ROUTES ---
@app.route('/')
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


@app.route('/init_db')
def init_db():
    """Create all database tables."""
    db.create_all()
    return 'Database tables created! Check your project folder for site.db'


@app.route('/api/test')
def endpoint_test():
    return jsonify({'message': 'API is working!', 'status': 'success'})


@app.route('/api/admin/add_dummy')
def add_dummy_data():
    """Add sample location and snippet."""
    try:
        paris = Location(name='Notre-Dame de Paris', latitude=48.852968, longitude=2.349902)
        history_snippet = ContextSnippet(
            title='Medieval Marvel',
            description='Construction began in 1163. A masterpiece of French Gothic architecture.',
            type='history',
            source_url='https://en.wikipedia.org/wiki/Notre-Dame_de_Paris',
            location=paris  # Using relationship (alternative to location_id=paris.id)
        )

        db.session.add(paris)
        db.session.add(history_snippet)
        db.session.commit()

        return jsonify({
            'success': True,
            'message': f'Added {paris.name} with snippet: {history_snippet.title}'
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/context')
def get_context():
    """Get snippets for a location."""
    radius = request.args.get('radius', default=0.01, type=float)
    lat = request.args.get('lat', type=float)
    lng = request.args.get('lng', type=float)

    if lat is None or lng is None:
        return jsonify({'error': 'Provide lat and lng parameters'}), 400

    # Find locations near the coordinates
    locations = Location.query.filter(
        Location.latitude.between(lat - radius, lat + radius),
        Location.longitude.between(lng - radius, lng + radius)
    ).all()

    if not locations:
        return jsonify([])

    # Format the response
    result = []
    for loc in locations:
        loc_data = {
            'name': loc.name,
            'coordinates': {'lat': loc.latitude, 'lng': loc.longitude},
            'snippets': []
        }

        for snippet in loc.snippets:  # Using the relationship!
            loc_data['snippets'].append({
                'title': snippet.title,
                'description': snippet.description,
                'type': snippet.type,
                'source': snippet.source_url
            })

        result.append(loc_data)

    return jsonify(result)


@app.route('/api/register', methods=['POST'])
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


@app.route('/api/login', methods=['POST'])
def login():
    data = request.get_json()
    if not data or not data.get('username') or not data.get('password'):
        return jsonify({'error': 'Missing username or password'}), 400

    user = User.query.filter_by(username=data['username']).first()
    if not user or not user.check_password(data['password']):
        return jsonify({'error': 'Invalid username or password'}), 401

    access_token = create_access_token(identity=str(user.id))
    return jsonify({'access_token': access_token, 'user_id': user.id, 'is_admin': user.is_admin}), 200


@app.route('/api/locations/<int:location_id>/favorite', methods=['POST'])
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


@app.route('/api/locations/<int:location_id>/favorite', methods=['DELETE'])
@jwt_required()
def remove_favorite(location_id):
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    location = Location.query.get(location_id)

    if location in user.favorites:
        user.favorites.remove(location)
        db.session.commit()

    return jsonify({'message': 'Removed from favorites'}), 200


@app.route('/api/favorites', methods=['GET'])
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


@app.route('/api/admin/locations', methods=['POST'])
@jwt_required()
@admin_required
def create_location():
    data = request.get_json()
    if not data or not data.get('name') or not data.get('latitude') or not data.get('longitude'):
        return jsonify({'error': 'Missing name, latitude or longitude'}), 400

    location = Location(
        name=data['name'],
        latitude=data['latitude'],
        longitude=data['longitude']
    )
    db.session.add(location)
    db.session.commit()

    return jsonify({'id': location.id, 'message': 'Location created'}), 201


# Similarly you can add endpoints to create snippets, update, delete, etc.


@app.route('/admin/users', methods=['GET'])
@jwt_required()
@admin_required
def list_users():
    """Get paginated list of all users. Admin only."""
    # Pagination parameters
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 10, type=int)

    # Query users ordered by id (newest first)
    pagination = User.query.order_by(User.id.desc()).paginate(
        page=page, per_page=per_page, error_out=False
    )

    # Build response
    users = []
    for user in pagination.items:
        users.append({
            'id': user.id,
            'username': user.username,
            'email': user.email,
            'is_admin': user.is_admin,
            'created_at': getattr(user, 'created_at', None)  # if you add timestamp later
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


@app.route('/admin/users/<int:user_id>', methods=['DELETE'])
@jwt_required()
@admin_required
def delete_user(user_id):
    """Delete a user by ID. Admin only."""
    user = User.query.get(user_id)
    if not user:
        return jsonify({'error': 'User not found'}), 404

    # Prevent admin from deleting themselves
    current_user_id = int(get_jwt_identity())
    if user.id == current_user_id:
        return jsonify({'error': 'Cannot delete yourself'}), 400

    db.session.delete(user)
    db.session.commit()

    return jsonify({'message': f'User {user.username} deleted'}), 200


@app.route('/admin/users/<int:user_id>', methods=['PATCH'])
@jwt_required()
@admin_required
def update_user(user_id):
    """Update user fields (e.g., is_admin). Admin only."""
    user = User.query.get(user_id)
    if not user:
        return jsonify({'error': 'User not found'}), 404

    data = request.get_json() or {}

    # Update admin status if provided
    if 'is_admin' in data:
        # Prevent admin from demoting themselves
        current_user_id = int(get_jwt_identity())
        if user.id == current_user_id:
            return jsonify({'error': 'Cannot change your own admin status'}), 400
        user.is_admin = bool(data['is_admin'])

    # You can add other updatable fields here (e.g., email) with proper validation

    db.session.commit()

    return jsonify({
        'id': user.id,
        'username': user.username,
        'email': user.email,
        'is_admin': user.is_admin
    }), 200


@app.route('/admin/users/<int:user_id>', methods=['GET'])
@jwt_required()
@admin_required
def get_user(user_id):
    """Get details of a specific user. Admin only."""
    user = User.query.get(user_id)
    if not user:
        return jsonify({'error': 'User not found'}), 404

    return jsonify({
        'id': user.id,
        'username': user.username,
        'email': user.email,
        'is_admin': user.is_admin
        # add any other fields you have
    }), 200






if __name__ == '__main__':
    app.run(debug=True, port=5000)