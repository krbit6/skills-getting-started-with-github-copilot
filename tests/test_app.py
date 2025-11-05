from fastapi.testclient import TestClient
from src.app import app
from urllib.parse import quote
import uuid

client = TestClient(app)


def unique_email():
    return f"testuser-{uuid.uuid4().hex[:8]}@example.com"


def test_get_activities():
    resp = client.get("/activities")
    assert resp.status_code == 200
    data = resp.json()
    assert isinstance(data, dict)
    # basic known activity from seed data
    assert "Chess Club" in data


def test_signup_and_unregister_flow():
    activity = "Chess Club"
    email = unique_email()

    # signup
    resp = client.post(f"/activities/{quote(activity)}/signup?email={quote(email)}")
    assert resp.status_code == 200
    assert "Signed up" in resp.json().get("message", "")

    # verify present
    resp2 = client.get("/activities")
    assert resp2.status_code == 200
    participants = resp2.json()[activity]["participants"]
    assert email in participants

    # duplicate sign up -> 400
    resp_dup = client.post(f"/activities/{quote(activity)}/signup?email={quote(email)}")
    assert resp_dup.status_code == 400

    # unregister
    resp_un = client.post(f"/activities/{quote(activity)}/unregister?email={quote(email)}")
    assert resp_un.status_code == 200
    assert "Unregistered" in resp_un.json().get("message", "")

    # verify removed
    resp3 = client.get("/activities")
    assert email not in resp3.json()[activity]["participants"]


def test_not_found_and_bad_unreg():
    # non-existing activity
    resp = client.post("/activities/NoSuchActivity/signup?email=foo@example.com")
    assert resp.status_code == 404
    resp2 = client.post("/activities/NoSuchActivity/unregister?email=foo@example.com")
    assert resp2.status_code == 404

    # unregistering someone not signed up
    activity = "Programming Class"
    email = "not-signed-up@example.com"
    resp3 = client.post(f"/activities/{quote(activity)}/unregister?email={quote(email)}")
    assert resp3.status_code == 400
