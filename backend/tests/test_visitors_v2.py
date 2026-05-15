"""Backend regression + new-feature tests for Maxwell Visitor Entry.

Covers:
- /api/categories cascading map
- POST /api/visitors validation (factory/staff/management)
- Employee JWT login + /me + /visitors
- PATCH status via Bearer (assignee/dept) + 409 lock
- /api/qr-entry returns 200 PNG when PUBLIC_APP_URL set
- Existing admin PIN flows (regression)
"""
import os
import pytest
import requests

BASE_URL = os.environ['EXPO_PUBLIC_BACKEND_URL'].rstrip('/')
PIN = '1234'

S = requests.Session()
S.headers.update({"Content-Type": "application/json"})


def _create_visitor(payload):
    r = S.post(f"{BASE_URL}/api/visitors", json=payload)
    return r


# ---- categories ----
class TestCategories:
    def test_categories_shape(self):
        r = S.get(f"{BASE_URL}/api/categories")
        assert r.status_code == 200
        d = r.json()
        assert "departments_staff" in d and "departments_factory" in d
        assert "department_employees" in d and "management_persons" in d
        assert len(d["departments_staff"]) == 9
        assert "Others" in d["departments_staff"]
        assert d["departments_factory"] == ["Operation", "QA", "QC"]
        assert len(d["management_persons"]) == 6
        # Spot-check map
        assert d["department_employees"]["Operation"] == ["Nishit Patel"]


# ---- visitor create validation ----
class TestVisitorCreate:
    def test_factory_visit_ok(self):
        r = _create_visitor({
            "full_name": "TEST_FactoryGuy", "mobile": "9000000001", "purpose": "TEST_audit",
            "category": "factory_visit", "department": "Operation", "assigned_to": "Nishit Patel",
        })
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["category"] == "factory_visit"
        assert d["department"] == "Operation"
        assert d["assigned_to"] == "Nishit Patel"
        assert d["person_to_meet"] == "Nishit Patel"

    def test_factory_visit_invalid_department(self):
        r = _create_visitor({
            "full_name": "TEST_X", "mobile": "9000000002", "purpose": "TEST_x",
            "category": "factory_visit", "department": "HR", "assigned_to": "Mohit Goswami",
        })
        assert r.status_code == 400

    def test_staff_visit_others_requires_assigned_to(self):
        # Missing assigned_to
        r = _create_visitor({
            "full_name": "TEST_Y", "mobile": "9000000003", "purpose": "TEST_y",
            "category": "staff_visit", "department": "Others", "assigned_to": "",
        })
        assert r.status_code == 400
        # With free-text -> 200
        r2 = _create_visitor({
            "full_name": "TEST_Y2", "mobile": "9000000003", "purpose": "TEST_y2",
            "category": "staff_visit", "department": "Others", "assigned_to": "TEST_Custom Person",
        })
        assert r2.status_code == 200, r2.text
        assert r2.json()["assigned_to"] == "TEST_Custom Person"

    def test_staff_visit_dept_employee_ok(self):
        r = _create_visitor({
            "full_name": "TEST_Z", "mobile": "9000000004", "purpose": "TEST_z",
            "category": "staff_visit", "department": "HR", "assigned_to": "Mohit Goswami",
        })
        assert r.status_code == 200, r.text

    def test_management_ok(self):
        r = _create_visitor({
            "full_name": "TEST_M", "mobile": "9000000005", "purpose": "TEST_m",
            "category": "management", "assigned_to": "VINU CHAVDA",
        })
        assert r.status_code == 200, r.text
        assert r.json()["department"] is None

    def test_management_invalid_person(self):
        r = _create_visitor({
            "full_name": "TEST_M2", "mobile": "9000000006", "purpose": "TEST_m2",
            "category": "management", "assigned_to": "Random Guy",
        })
        assert r.status_code == 400


# ---- employee auth ----
class TestEmployeeAuth:
    @pytest.fixture(scope="class")
    def token(self):
        r = S.post(f"{BASE_URL}/api/employee/login",
                   json={"email": "nishit.patel@maxwell.com", "password": "maxwell@123"})
        assert r.status_code == 200, r.text
        d = r.json()
        assert "access_token" in d
        assert d["employee"]["department"] == "Operation"
        assert d["employee"]["name"] == "Nishit Patel"
        return d["access_token"]

    def test_login_ok(self, token):
        assert isinstance(token, str) and len(token) > 20

    def test_login_wrong_password(self):
        r = S.post(f"{BASE_URL}/api/employee/login",
                   json={"email": "nishit.patel@maxwell.com", "password": "wrong"})
        assert r.status_code == 401

    def test_login_unknown_email(self):
        r = S.post(f"{BASE_URL}/api/employee/login",
                   json={"email": "nobody@maxwell.com", "password": "maxwell@123"})
        assert r.status_code == 401

    def test_me_ok(self, token):
        r = requests.get(f"{BASE_URL}/api/employee/me",
                         headers={"Authorization": f"Bearer {token}"})
        assert r.status_code == 200
        emp = r.json()["employee"]
        assert emp["email"] == "nishit.patel@maxwell.com"
        assert emp["department"] == "Operation"

    def test_me_no_token(self):
        r = requests.get(f"{BASE_URL}/api/employee/me")
        assert r.status_code == 401

    def test_me_bad_token(self):
        r = requests.get(f"{BASE_URL}/api/employee/me",
                         headers={"Authorization": "Bearer not.a.real.jwt"})
        assert r.status_code == 401

    def test_employee_visitors_filtered_by_department(self, token):
        # Create an HR visitor and an Operation visitor; nishit (Operation) should see only Operation
        S.post(f"{BASE_URL}/api/visitors", json={
            "full_name": "TEST_HR_V", "mobile": "9000000010", "purpose": "TEST_p",
            "category": "staff_visit", "department": "HR", "assigned_to": "Mohit Goswami"})
        S.post(f"{BASE_URL}/api/visitors", json={
            "full_name": "TEST_OP_V", "mobile": "9000000011", "purpose": "TEST_p",
            "category": "factory_visit", "department": "Operation", "assigned_to": "Nishit Patel"})
        r = requests.get(f"{BASE_URL}/api/employee/visitors",
                         headers={"Authorization": f"Bearer {token}"})
        assert r.status_code == 200
        items = r.json()
        assert isinstance(items, list)
        for v in items:
            assert v["department"] == "Operation"
            assert "_id" not in v
        assert any(v["full_name"] == "TEST_OP_V" for v in items)


# ---- status update (bearer + lock) ----
class TestStatusBearerAndLock:
    @pytest.fixture(scope="class")
    def op_token(self):
        r = S.post(f"{BASE_URL}/api/employee/login",
                   json={"email": "nishit.patel@maxwell.com", "password": "maxwell@123"})
        return r.json()["access_token"]

    @pytest.fixture(scope="class")
    def hr_token(self):
        r = S.post(f"{BASE_URL}/api/employee/login",
                   json={"email": "mohit.goswami@maxwell.com", "password": "maxwell@123"})
        return r.json()["access_token"]

    def _new_op_visitor(self):
        r = _create_visitor({
            "full_name": "TEST_OP_PEND", "mobile": "9000000020", "purpose": "TEST_p",
            "category": "factory_visit", "department": "Operation", "assigned_to": "Nishit Patel"})
        assert r.status_code == 200, r.text
        return r.json()["id"]

    def test_bearer_approve_by_assignee(self, op_token):
        vid = self._new_op_visitor()
        r = requests.patch(f"{BASE_URL}/api/visitors/{vid}/status",
                           json={"status": "approved"},
                           headers={"Authorization": f"Bearer {op_token}"})
        assert r.status_code == 200, r.text
        assert r.json()["status"] == "approved"
        assert r.json()["decided_by"] == "nishit.patel@maxwell.com"

    def test_bearer_forbidden_wrong_department(self, hr_token):
        vid = self._new_op_visitor()
        r = requests.patch(f"{BASE_URL}/api/visitors/{vid}/status",
                           json={"status": "approved"},
                           headers={"Authorization": f"Bearer {hr_token}"})
        assert r.status_code == 403

    def test_lock_409_after_admin_decides(self, op_token):
        vid = self._new_op_visitor()
        # Admin approves first
        r1 = requests.patch(f"{BASE_URL}/api/visitors/{vid}/status",
                            json={"status": "approved"},
                            headers={"X-Admin-Pin": PIN})
        assert r1.status_code == 200
        # Employee tries to approve again -> 409
        r2 = requests.patch(f"{BASE_URL}/api/visitors/{vid}/status",
                            json={"status": "approved"},
                            headers={"Authorization": f"Bearer {op_token}"})
        assert r2.status_code == 409

    def test_admin_pin_still_works(self):
        vid = self._new_op_visitor()
        r = requests.patch(f"{BASE_URL}/api/visitors/{vid}/status",
                           json={"status": "rejected"},
                           headers={"X-Admin-Pin": PIN})
        assert r.status_code == 200
        assert r.json()["status"] == "rejected"
        assert r.json()["decided_by"] == "admin"


# ---- QR entry ----
class TestQrEntry:
    def test_qr_entry_ok(self):
        r = requests.get(f"{BASE_URL}/api/qr-entry")
        assert r.status_code == 200
        assert r.headers.get("content-type", "").startswith("image/png")
        assert r.content[:8] == b"\x89PNG\r\n\x1a\n"
        assert r.headers.get("X-Entry-Url")


# ---- regression: status by mobile + admin PIN list ----
class TestRegression:
    def test_status_by_mobile(self):
        # Create then look up
        r = _create_visitor({
            "full_name": "TEST_LOOKUP", "mobile": "9000000099", "purpose": "TEST_p",
            "category": "staff_visit", "department": "HR", "assigned_to": "Mohit Goswami"})
        assert r.status_code == 200
        r2 = requests.get(f"{BASE_URL}/api/visitors/by-mobile/9000000099")
        assert r2.status_code == 200
        assert any(v["full_name"] == "TEST_LOOKUP" for v in r2.json())

    def test_admin_list(self):
        r = requests.get(f"{BASE_URL}/api/visitors", headers={"X-Admin-Pin": PIN})
        assert r.status_code == 200
        assert isinstance(r.json(), list)
