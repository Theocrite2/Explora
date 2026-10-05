import os
import pytest
from app import app as flask_app
from extensions import db
from models import Location, ContextSnippet
from geoalchemy2.shape import from_shape
from shapely.geometry import Point
from sqlalchemy import text


@pytest.fixture
def app():
    flask_app.config['TESTING'] = True
    flask_app.config['SQLALCHEMY_DATABASE_URI'] = os.getenv('TEST_DATABASE_URL')
    with flask_app.app_context():
        db.create_all()
        yield flask_app
        db.session.remove()
        # Isolate tests from each other. Never drop tables on a non-test database.
        if 'test' in (os.getenv('TEST_DATABASE_URL') or '').lower():
            db.drop_all()


@pytest.fixture
def client(app):
    return app.test_client()


def test_get_context_empty(client):
    response = client.get('/api/context?lat=0.0&lng=0.0')
    assert response.status_code == 200
    data = response.get_json()
    assert isinstance(data, list) and len(data) == 0


def test_get_context_with_data(client):
    with flask_app.app_context():
        test_loc = Location(
            name='Test Monument',
            latitude=10.0,
            longitude=20.0,
            coordinates=from_shape(Point(20.0, 10.0), srid=4326)
        )
        test_snip = ContextSnippet(
            title='Test History',
            type='history',
            description='test description',
            location=test_loc
        )
        db.session.add(test_loc)
        db.session.add(test_snip)
        db.session.commit()

    response = client.get('/api/context?lat=10.0&lng=20.0&radius=1000')
    assert response.status_code == 200
    data = response.get_json()
    assert len(data) == 1
    assert data[0]['name'] == 'Test Monument'


def test_register(client):
    response = client.post('/api/register', json={
        'username': 'username123',
        'email': 'email123',
        'password': 'password123'
    })
    assert response.status_code == 201
    data = response.get_json()
    assert data['message'] == 'User created successfully'

# ---------------------------------------------------------------- commitments

def _auth_header(client, username):
    client.post('/api/register', json={'username': username, 'email': f'{username}@example.com', 'password': 'pw123456'})
    r = client.post('/api/login', json={'email': f'{username}@example.com', 'password': 'pw123456'})
    return {'Authorization': f"Bearer {r.get_json()['access_token']}"}


def _make_location(app, slug):
    from models import Location
    from extensions import db
    from geoalchemy2.shape import from_shape
    from shapely.geometry import Point
    with app.app_context():
        loc = Location.query.filter_by(slug=slug).first()
        if loc is None:
            loc = Location(slug=slug, name=slug, latitude=-45.0, longitude=-170.0,
                           coordinates=from_shape(Point(-170.0, -45.0), srid=4326))
            db.session.add(loc)
            db.session.commit()
        return loc.id


def test_commitments_require_auth(client):
    assert client.get('/api/commitments').status_code == 401
    assert client.post('/api/commitments', json={'slug': 'x'}).status_code == 401


def test_commitment_lifecycle(app, client):
    _make_location(app, 'test-commit-a')
    h = _auth_header(client, 'commit_user_a')

    r = client.post('/api/commitments', json={'slug': 'test-commit-a'}, headers=h)
    assert r.status_code == 201
    cid = r.get_json()['id']
    assert r.get_json()['status'] == 'committed'

    # idempotent
    r2 = client.post('/api/commitments', json={'slug': 'test-commit-a'}, headers=h)
    assert r2.status_code == 200 and r2.get_json()['id'] == cid

    assert [c['id'] for c in client.get('/api/commitments', headers=h).get_json()] == [cid]

    # status cannot be set by hand
    r = client.patch(f'/api/commitments/{cid}', json={'status': 'uncovered', 'note': 'x'}, headers=h)
    assert r.status_code == 200 and r.get_json()['status'] == 'committed' and r.get_json()['note'] == 'x'

    assert client.delete(f'/api/commitments/{cid}', headers=h).status_code == 200
    assert client.get('/api/commitments', headers=h).get_json() == []


def test_commitment_validation_and_ownership(app, client):
    _make_location(app, 'test-commit-b')
    owner = _auth_header(client, 'commit_owner_b')
    other = _auth_header(client, 'commit_other_b')

    assert client.post('/api/commitments', json={}, headers=owner).status_code == 400
    assert client.post('/api/commitments', json={'slug': 'nope-nope'}, headers=owner).status_code == 404

    cid = client.post('/api/commitments', json={'slug': 'test-commit-b'}, headers=owner).get_json()['id']
    assert client.patch(f'/api/commitments/{cid}', json={'note': 'x'}, headers=other).status_code == 404
    assert client.delete(f'/api/commitments/{cid}', headers=other).status_code == 404
    assert client.get('/api/commitments', headers=other).get_json() == []


def test_commitment_uncovered_by_location(app, client):
    _make_location(app, 'test-commit-c')  # at lat -45, lng -170
    h = _auth_header(client, 'commit_user_c')
    cid = client.post('/api/commitments', json={'slug': 'test-commit-c'}, headers=h).get_json()['id']

    assert client.post('/api/commitments/verify', json={'lat': 'x', 'lng': 1}, headers=h).status_code == 400
    assert client.post('/api/commitments/verify', json={'lat': 95, 'lng': 1}, headers=h).status_code == 400

    far = client.post('/api/commitments/verify', json={'lat': 48.85, 'lng': 2.35}, headers=h).get_json()
    assert far['newly_uncovered'] == [] and far['commitments'][0]['status'] == 'committed'

    near = client.post('/api/commitments/verify', json={'lat': -45.01, 'lng': -170.01}, headers=h).get_json()
    assert near['newly_uncovered'] == ['test-commit-c']
    c = near['commitments'][0]
    assert c['id'] == cid and c['status'] == 'uncovered' and c['uncovered_at'] is not None

    # other users' commitments are unaffected
    h2 = _auth_header(client, 'commit_user_c2')
    client.post('/api/commitments', json={'slug': 'test-commit-c'}, headers=h2)
    assert client.get('/api/commitments', headers=h2).get_json()[0]['status'] == 'committed'


def test_verify_requires_auth(client):
    assert client.post('/api/commitments/verify', json={'lat': 0, 'lng': 0}).status_code == 401


def test_one_active_commitment_at_a_time(app, client):
    _make_location(app, 'test-commit-d1')
    _make_location(app, 'test-commit-d2')
    h = _auth_header(client, 'commit_user_d')

    first = client.post('/api/commitments', json={'slug': 'test-commit-d1'}, headers=h)
    assert first.status_code == 201
    blocked = client.post('/api/commitments', json={'slug': 'test-commit-d2'}, headers=h)
    assert blocked.status_code == 409 and blocked.get_json()['active']['slug'] == 'test-commit-d1'
    # same place again stays idempotent
    assert client.post('/api/commitments', json={'slug': 'test-commit-d1'}, headers=h).status_code == 200

    # removing the active one frees the slot
    client.delete(f"/api/commitments/{first.get_json()['id']}", headers=h)
    assert client.post('/api/commitments', json={'slug': 'test-commit-d2'}, headers=h).status_code == 201

    # an uncovered commitment no longer blocks a new one
    client.post('/api/commitments/verify', json={'lat': -45.0, 'lng': -170.0}, headers=h)
    assert client.post('/api/commitments', json={'slug': 'test-commit-d1'}, headers=h).status_code == 201


def test_verify_returns_position_and_distance(app, client):
    _make_location(app, 'test-commit-e')  # lat -45, lng -170
    h = _auth_header(client, 'commit_user_e')
    client.post('/api/commitments', json={'slug': 'test-commit-e'}, headers=h)

    res = client.post('/api/commitments/verify', json={'lat': -44.0, 'lng': -170.0}, headers=h).get_json()
    assert res['position'] == {'lat': -44.0, 'lng': -170.0}
    assert 105 < res['distances_km']['test-commit-e'] < 117  # one degree of latitude is about 111 km
    c = res['commitments'][0]
    assert c['latitude'] == -45.0 and c['longitude'] == -170.0


def test_arrival_returns_stored_image_and_never_generates(app, client, monkeypatch):
    from models import LocationMedia
    from extensions import db
    loc_id = _make_location(app, 'test-commit-f')  # lat -45, lng -170
    db.session.add(LocationMedia(location_id=loc_id, media_type='image', url='https://example.com/stored.jpg'))
    db.session.commit()
    h = _auth_header(client, 'commit_user_f')
    created = client.post('/api/commitments', json={'slug': 'test-commit-f'}, headers=h).get_json()
    assert created['image_url'] == 'https://example.com/stored.jpg'

    import routes
    monkeypatch.delenv('IMAGE_GENERATION_ENABLED', raising=False)
    assert routes.image_generation_enabled() is False
    res = client.post('/api/commitments/verify', json={'lat': -45.0, 'lng': -170.0}, headers=h).get_json()
    assert res['newly_uncovered'] == ['test-commit-f']
    assert res['commitments'][0]['image_url'] == 'https://example.com/stored.jpg'

    # the old trigger endpoint creates nothing while generation is off
    near = client.post('/api/user/location', json={'lat': -45.0, 'lng': -170.0}, headers=h).get_json()
    assert near['generation_triggered_for'] == []


def test_commitment_without_stored_image_has_none(app, client):
    _make_location(app, 'test-commit-g')
    h = _auth_header(client, 'commit_user_g')
    assert client.post('/api/commitments', json={'slug': 'test-commit-g'}, headers=h).get_json()['image_url'] is None
