# db.py
import os
import datetime as dt
from typing import Optional, Any, Dict

import motor.motor_asyncio
from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase, AsyncIOMotorGridFSBucket
from bson import ObjectId

# ------------------------------------------------------------------------------
# Environment
# ------------------------------------------------------------------------------
MONGODB_URI = os.getenv("MONGODB_URI", "mongodb://localhost:27017/safedocs")
DB_NAME = os.getenv("DB_NAME", "safedocs")

# File retention (hours) for TTL of uploaded/sanitized/report files
try:
    FILE_TTL_HOURS = int(os.getenv("FILE_TTL_HOURS", "48"))
except Exception:
    FILE_TTL_HOURS = 48

# ------------------------------------------------------------------------------
# Globals (set during init_mongo)
# ------------------------------------------------------------------------------
_client: Optional[AsyncIOMotorClient] = None
_db: Optional[AsyncIOMotorDatabase] = None
_gfs_uploads: Optional[AsyncIOMotorGridFSBucket] = None
_gfs_clean: Optional[AsyncIOMotorGridFSBucket] = None
_gfs_reports: Optional[AsyncIOMotorGridFSBucket] = None


# ------------------------------------------------------------------------------
# Init / Accessors
# ------------------------------------------------------------------------------
async def init_mongo(app=None) -> None:
    """
    Initialize MongoDB (Motor) and GridFS buckets. Safe to call more than once.
    """
    global _client, _db, _gfs_uploads, _gfs_clean, _gfs_reports
    if _client is not None and _db is not None:
        return

    _client = motor.motor_asyncio.AsyncIOMotorClient(MONGODB_URI)
    _db = _client[DB_NAME]

    # Async GridFS buckets
    _gfs_uploads = AsyncIOMotorGridFSBucket(_db, bucket_name="uploads")
    _gfs_clean = AsyncIOMotorGridFSBucket(_db, bucket_name="sanitized")
    _gfs_reports = AsyncIOMotorGridFSBucket(_db, bucket_name="reports")

    # Indexes
    # users: unique email
    await _db.users.create_index("email", unique=True)
    # audits: created_at for basic querying
    await _db.audit.create_index("created_at")

    # scans collection: keep a created_at index for stats and TTL (if desired)
    await _db.scans.create_index("created_at")
    # Optionally: TTL on scans metadata (commented by default)
    # await _db.scans.create_index("created_at", expireAfterSeconds=FILE_TTL_HOURS * 3600)

    # TTL on GridFS file metadata (we store an 'expires_at' on files)
    # Note: TTL index must be on a date field. We’ll create on 'expires_at' for each bucket.
    for bucket in ("uploads.files", "sanitized.files", "reports.files"):
        try:
            await _db[bucket].create_index("expires_at", expireAfterSeconds=0)
        except Exception as e:
            # In case index already exists or no permission, do not crash
            print(f"TTL index create for {bucket} failed or already exists:", e)

    if app:
        @app.on_event("shutdown")
        async def _close():
            # Motor client close is sync (no await)
            _client.close()

    print("✅ Database initialized")


def db() -> AsyncIOMotorDatabase:
    assert _db is not None, "Mongo not initialized – call init_mongo() first"
    return _db


def gfs_uploads() -> AsyncIOMotorGridFSBucket:
    assert _gfs_uploads is not None, "Mongo not initialized – call init_mongo() first"
    return _gfs_uploads


def gfs_clean() -> AsyncIOMotorGridFSBucket:
    assert _gfs_clean is not None, "Mongo not initialized – call init_mongo() first"
    return _gfs_clean


def gfs_reports() -> AsyncIOMotorGridFSBucket:
    assert _gfs_reports is not None, "Mongo not initialized – call init_mongo() first"
    return _gfs_reports


# ------------------------------------------------------------------------------
# Utilities
# ------------------------------------------------------------------------------
def _ensure_oid(x: Any) -> ObjectId:
    if isinstance(x, ObjectId):
        return x
    return ObjectId(str(x))


# ------------------------------------------------------------------------------
# Audit helper
# ------------------------------------------------------------------------------
async def audit(*args, **kwargs) -> None:
    """
    Flexible audit logger.

    Usage patterns supported:
      - await audit({"action": "login", "user_id": "...", "details": {...}})
      - await audit("login", "user_id_string", {"ip": "...", ...})
      - await audit(action="login", user_id="...", details={...})

    Adds 'created_at' automatically. Never raises.
    """
    try:
        if len(args) == 1 and isinstance(args[0], dict):
            ev: Dict[str, Any] = dict(args[0])
        else:
            action = args[0] if len(args) > 0 else kwargs.get("action")
            user_id = args[1] if len(args) > 1 else kwargs.get("user_id")
            details = args[2] if len(args) > 2 else kwargs.get("details")
            ev = {"action": action, "user_id": user_id, "details": details}

        ev.setdefault("created_at", dt.datetime.utcnow())
        await db().audit.insert_one(ev)
    except Exception as e:
        # Don't break the app if audit logging fails
        print("audit log error:", e)


# ------------------------------------------------------------------------------
# Helpers to compute expires_at for GridFS files
# ------------------------------------------------------------------------------
def gridfs_expiry_date(hours: Optional[int] = None) -> dt.datetime:
    """Return a UTC datetime for when a file should expire (TTL index will purge)."""
    h = FILE_TTL_HOURS if hours is None else hours
    return dt.datetime.utcnow() + dt.timedelta(hours=h)
