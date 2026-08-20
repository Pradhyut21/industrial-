import hashlib
import json
import os

REDIS_URL = os.environ.get("REDIS_URL")
_query_cache = {}  # in-memory fallback — demo mode only
_redis_client = None

if REDIS_URL:
    try:
        import redis as _redis_lib
        _redis_client = _redis_lib.from_url(REDIS_URL, decode_responses=True)
        _redis_client.ping()  # fail fast at startup if URL is wrong
    except Exception as _e:
        print(f"[cache] Redis connection failed ({_e}); falling back to in-memory cache.")
        _redis_client = None


def get_cache_key(query: str, k: int) -> str:
    return hashlib.md5(f"{query}:{k}".encode("utf-8")).hexdigest()


def get_cached_results(query: str, k: int):
    key = get_cache_key(query, k)
    if _redis_client:
        try:
            raw = _redis_client.get(key)
            return json.loads(raw) if raw else None
        except Exception:
            pass
    return _query_cache.get(key)


def set_cached_results(query: str, k: int, results: list, ttl_seconds: int = 300):
    key = get_cache_key(query, k)
    if _redis_client:
        try:
            _redis_client.setex(key, ttl_seconds, json.dumps(results))
            return
        except Exception:
            pass
    _query_cache[key] = results
