import os
import pytest
import requests

BASE_URL = os.environ.get('EXPO_PUBLIC_BACKEND_URL', 'https://guest-pass-simple.preview.emergentagent.com').rstrip('/')
PIN = '1234'

@pytest.fixture(scope="module")
def session():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


@pytest.fixture(scope="module")
def created_visitor(session):
    payload = {"full_name": "TEST_Alice", "mobile": "9876501234", "purpose": "TEST_meeting", "person_to_meet": "TEST_Bob"}
    r = session.post(f"{BASE_URL}/api/visitors", json=payload)
    assert r.status_code == 200, r.text
    data = r.json()
    return data


# ---- Create / validation ----
class TestCreateVisitor:
    def test_create_ok(self, created_visitor):
        v = created_visitor
        assert v["id"]
        assert v["status"] == "pending"
        assert v["full_name"] == "TEST_Alice"
        assert "_id" not in v

    def test_missing_full_name(self, session):
        r = session.post(f"{BASE_URL}/api/visitors", json={"full_name": "", "mobile": "9876543210", "purpose": "x", "person_to_meet": ""})
        assert r.status_code == 400

    def test_missing_purpose(self, session):
        r = session.post(f"{BASE_URL}/api/visitors", json={"full_name": "X", "mobile": "9876543210", "purpose": "", "person_to_meet": ""})
        assert r.status_code == 400

    def test_missing_required_field(self, session):
        r = session.post(f"{BASE_URL}/api/visitors", json={"full_name": "x"})
        assert r.status_code == 422


# ---- Auth on list ----
class TestListAuth:
    def test_no_pin_unauthorized(self, session):
        r = requests.get(f"{BASE_URL}/api/visitors")
        assert r.status_code == 401

    def test_wrong_pin(self, session):
        r = requests.get(f"{BASE_URL}/api/visitors", headers={"X-Admin-Pin": "0000"})
        assert r.status_code == 401

    def test_right_pin(self, session, created_visitor):
        r = requests.get(f"{BASE_URL}/api/visitors", headers={"X-Admin-Pin": PIN})
        assert r.status_code == 200
        items = r.json()
        assert isinstance(items, list)
        assert any(v["id"] == created_visitor["id"] for v in items)
        for v in items:
            assert "_id" not in v


# ---- by-mobile / by-id ----
class TestQueries:
    def test_by_mobile(self, created_visitor):
        r = requests.get(f"{BASE_URL}/api/visitors/by-mobile/{created_visitor['mobile']}")
        assert r.status_code == 200
        items = r.json()
        assert any(v["id"] == created_visitor["id"] for v in items)
        for v in items:
            assert "_id" not in v

    def test_get_by_id(self, created_visitor):
        r = requests.get(f"{BASE_URL}/api/visitors/{created_visitor['id']}")
        assert r.status_code == 200
        v = r.json()
        assert v["id"] == created_visitor["id"]
        assert "_id" not in v

    def test_get_unknown_id_404(self):
        r = requests.get(f"{BASE_URL}/api/visitors/does-not-exist-xyz")
        assert r.status_code == 404


# ---- Status update ----
class TestStatusUpdate:
    def test_unauthorized(self, created_visitor):
        r = requests.patch(f"{BASE_URL}/api/visitors/{created_visitor['id']}/status", json={"status": "approved"})
        assert r.status_code == 401

    def test_approve(self, created_visitor):
        r = requests.patch(
            f"{BASE_URL}/api/visitors/{created_visitor['id']}/status",
            json={"status": "approved"},
            headers={"X-Admin-Pin": PIN},
        )
        assert r.status_code == 200
        assert r.json()["status"] == "approved"
        # verify persisted
        g = requests.get(f"{BASE_URL}/api/visitors/{created_visitor['id']}")
        assert g.json()["status"] == "approved"

    def test_reject_unknown(self):
        r = requests.patch(
            f"{BASE_URL}/api/visitors/missing-id-xxx/status",
            json={"status": "rejected"},
            headers={"X-Admin-Pin": PIN},
        )
        assert r.status_code == 404

    def test_invalid_status(self, created_visitor):
        r = requests.patch(
            f"{BASE_URL}/api/visitors/{created_visitor['id']}/status",
            json={"status": "weird"},
            headers={"X-Admin-Pin": PIN},
        )
        assert r.status_code == 422


# ---- Verify PIN ----
class TestVerifyPin:
    def test_correct(self):
        r = requests.post(f"{BASE_URL}/api/admin/verify-pin", json={"pin": PIN})
        assert r.status_code == 200
        assert r.json() == {"ok": True}

    def test_wrong(self):
        r = requests.post(f"{BASE_URL}/api/admin/verify-pin", json={"pin": "0000"})
        assert r.status_code == 200
        assert r.json() == {"ok": False}
