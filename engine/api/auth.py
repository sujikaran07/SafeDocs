# auth.py
import os
from datetime import datetime, timedelta, timezone
from typing import Optional

import bcrypt
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from jose import jwt, JWTError
from pydantic import BaseModel
from bson import ObjectId

from db import db, audit

# ---- Settings ----
JWT_SECRET = os.getenv("JWT_SECRET", "CHANGE_ME_SUPER_SECRET")
JWT_ALG = os.getenv("JWT_ALG", "HS256")
JWT_EXPIRES_MIN = int(os.getenv("JWT_EXPIRES_MIN", "10080"))  # 7 days

router = APIRouter(prefix="/api/auth", tags=["auth"])
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")


# ---- Schemas ----
class UserCreate(BaseModel):
    email: str
    password: str
    name: Optional[str] = None


class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"


# ---- Helpers ----
def _now_utc():
    return datetime.now(timezone.utc)


def hash_password(pw: str) -> str:
    return bcrypt.hashpw(pw.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(pw: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(pw.encode("utf-8"), hashed.encode("utf-8"))
    except Exception:
        return False


def create_access_token(user_id: str, email: str) -> str:
    exp = _now_utc() + timedelta(minutes=JWT_EXPIRES_MIN)
    payload = {"sub": user_id, "email": email, "exp": exp}
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALG)


async def _get_user_by_email(email: str) -> Optional[dict]:
    return await db().users.find_one({"email": email})


async def _get_user_by_id(uid: str) -> Optional[dict]:
    try:
        return await db().users.find_one({"_id": ObjectId(uid)})
    except Exception:
        return None


def _pick_hash_field(user: dict) -> Optional[str]:
    # Back-compat: old docs may have 'password'; new ones have 'password_hash'
    if not user:
        return None
    if isinstance(user.get("password_hash"), str):
        return user["password_hash"]
    if isinstance(user.get("password"), str):
        return user["password"]
    return None


# ---- Dependencies ----
async def get_current_user(token: str = Depends(oauth2_scheme)) -> dict:
    credentials_error = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
    )
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALG])
        uid = payload.get("sub")
        if not uid:
            raise credentials_error
    except JWTError:
        raise credentials_error

    user = await _get_user_by_id(uid)
    if not user:
        raise credentials_error
    return user


# ---- Routes ----
@router.post("/signup", response_model=TokenOut)
async def signup(body: UserCreate):
    email = (body.email or "").strip().lower()
    if not email or not body.password:
        raise HTTPException(status_code=400, detail="Email and password required")

    existing = await _get_user_by_email(email)
    if existing:
        raise HTTPException(status_code=409, detail="User already exists")

    doc = {
        "email": email,
        "name": (body.name or "").strip(),
        "password_hash": hash_password(body.password),
        "created_at": _now_utc(),
        "updated_at": _now_utc(),
        "last_login_at": None,
    }
    res = await db().users.insert_one(doc)
    uid = str(res.inserted_id)
    token = create_access_token(uid, email)
    await audit("signup", uid, {"email": email})
    return {"access_token": token, "token_type": "bearer"}


@router.post("/login", response_model=TokenOut)
async def login(form: OAuth2PasswordRequestForm = Depends()):
    # OAuth2PasswordRequestForm sends 'username' & 'password' (x-www-form-urlencoded)
    email = (form.username or "").strip().lower()
    pw = form.password or ""

    user = await _get_user_by_email(email)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid email or password")

    hashed = _pick_hash_field(user)
    if not hashed or not verify_password(pw, hashed):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    # If legacy field 'password' exists, migrate
    if "password" in user and "password_hash" not in user:
        await db().users.update_one(
            {"_id": user["_id"]},
            {"$set": {"password_hash": user["password"], "updated_at": _now_utc()}, "$unset": {"password": ""}},
        )

    await db().users.update_one({"_id": user["_id"]}, {"$set": {"last_login_at": _now_utc()}})
    token = create_access_token(str(user["_id"]), email)
    await audit("login", str(user["_id"]), {"email": email})
    return {"access_token": token, "token_type": "bearer"}


class OAuthLoginBody(BaseModel):
    email: str
    name: Optional[str] = None
    provider: Optional[str] = "google"


@router.post("/oauth-login", response_model=TokenOut)
async def oauth_login(body: OAuthLoginBody):
    """
    OAuth login endpoint for Google/social logins
    Creates user if doesn't exist, returns JWT token
    """
    email = (body.email or "").strip().lower()
    if not email:
        raise HTTPException(status_code=400, detail="Email required")

    # Find or create user
    user = await _get_user_by_email(email)
    
    if not user:
        # Create new OAuth user (no password)
        doc = {
            "email": email,
            "name": (body.name or "").strip() or email.split("@")[0],
            "password_hash": None,  # OAuth users don't have passwords
            "oauth_provider": body.provider,
            "created_at": _now_utc(),
            "updated_at": _now_utc(),
            "last_login_at": _now_utc(),
        }
        res = await db().users.insert_one(doc)
        uid = str(res.inserted_id)
        await audit("oauth_signup", uid, {"email": email, "provider": body.provider})
    else:
        # Existing user - just update last login
        uid = str(user["_id"])
        await db().users.update_one(
            {"_id": user["_id"]},
            {"$set": {"last_login_at": _now_utc()}}
        )
        await audit("oauth_login", uid, {"email": email, "provider": body.provider})

    # Generate JWT token
    token = create_access_token(uid, email)
    return {"access_token": token, "token_type": "bearer"}


@router.get("/me")
async def me(user: dict = Depends(get_current_user)):
    return {
        "id": str(user["_id"]),
        "email": user["email"],
        "name": user.get("name") or "",
        "created_at": user.get("created_at"),
        "updated_at": user.get("updated_at"),
        "last_login_at": user.get("last_login_at"),
    }


class ChangePasswordBody(BaseModel):
    old_password: str
    new_password: str


@router.post("/change-password")
async def change_password(body: ChangePasswordBody, user: dict = Depends(get_current_user)):
    hashed = _pick_hash_field(user)
    if not hashed or not verify_password(body.old_password, hashed):
        raise HTTPException(status_code=400, detail="Old password is incorrect")

    new_hash = hash_password(body.new_password)
    await db().users.update_one(
        {"_id": user["_id"]},
        {"$set": {"password_hash": new_hash, "updated_at": _now_utc()}},
    )
    await audit("change_password", str(user["_id"]), {})
    return {"ok": True}


@router.post("/delete-account")
async def delete_account(user: dict = Depends(get_current_user)):
    uid = str(user["_id"])
    await db().files.delete_many({"user_id": uid})
    await db().reports.delete_many({"user_id": uid})
    await db().users.delete_one({"_id": user["_id"]})
    await audit("delete_account", uid, {})
    return {"ok": True}
