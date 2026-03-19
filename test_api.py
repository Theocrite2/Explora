import os
import sys
import pytest
from unittest.mock import MagicMock, patch

# Prevent Celery from connecting at import time.
# 1. Stub the tasks module so `import tasks` inside app.py is a no-op.
sys.modules['tasks'] = MagicMock()
# 2. Patch make_celery so it returns a mock instead of a real Celery instance.
with patch('celery_app.make_celery', return_value=MagicMock()):
    from app import app as flask_app

from extensions import db
from models import Location, ContextSnippet
from geoalchemy2.shape import from_shape
from shapely.geometry import Point


@pytest.fixture
def app():
    flask_app.config['TESTING'] = True
    flask_app.config['SQLALCHEMY_DATABASE_URI'] = os.getenv('TEST_DATABASE_URL')
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