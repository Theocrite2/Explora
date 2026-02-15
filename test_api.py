import pytest
import os
from app import app, db, Location, ContextSnippet

# Configure a test database (in memory, separate from your main one)
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///:memory:'
app.config['TESTING'] = True

@pytest.fixture
def client():
    """Provides a test client for the app."""
    with app.test_client() as client:
        with app.app_context():
            db.create_all()  # Create fresh tables for each test
        yield client
        with app.app_context():
            db.drop_all()    # Clean up after each test

def test_api_test_endpoint(client):
    """Test the basic /api/test health endpoint."""
    response = client.get('/api/test')
    assert response.status_code == 200
    data = response.get_json()
    assert data['status'] == 'success'
    assert 'message' in data

def test_get_context_empty(client):
    """Test /api/context when no locations exist."""
    response = client.get('/api/context?lat=0.0&lng=0.0')
    assert response.status_code == 200
    data = response.get_json()
    # Expect an empty list or a 'not found' message, depending on your logic
    assert isinstance(data, list) and len(data) == 0

def test_get_context_with_data(client):
    """Test /api/context returns a location we create."""
    # 1. ARRANGE: Setup test data directly in the database
    with app.app_context():
        test_loc = Location(name='Test Monument', latitude=10.0, longitude=20.0)
        test_snip = ContextSnippet(title='Test History', type='history', description='test description', location=test_loc)
        db.session.add(test_loc)
        db.session.add(test_snip)
        db.session.commit()

    # 2. ACT: Call the API endpoint
    response = client.get('/api/context?lat=10.0&lng=20.0&radius=0.1')

    # 3. ASSERT: Check the response
    assert response.status_code == 200
    data = response.get_json()
    assert len(data) == 1
    assert data[0]['name'] == 'Test Monument'
    assert len(data[0]['snippets']) == 1
    assert data[0]['snippets'][0]['title'] == 'Test History'