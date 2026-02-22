import pytest
from app import app as flask_app
from extensions import db
from models import Location, ContextSnippet


@pytest.fixture
def app():
    flask_app.config['TESTING'] = True
    flask_app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///:memory:'
    with flask_app.app_context():
        db.create_all()
        yield flask_app
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
        test_loc = Location(name='Test Monument', latitude=10.0, longitude=20.0)
        test_snip = ContextSnippet(
            title='Test History',
            type='history',
            description='test description',
            location=test_loc
        )
        db.session.add(test_loc)
        db.session.add(test_snip)
        db.session.commit()

    response = client.get('/api/context?lat=10.0&lng=20.0&radius=0.1')
    assert response.status_code == 200
    data = response.get_json()
    assert len(data) == 1
    assert data[0]['name'] == 'Test Monument'

