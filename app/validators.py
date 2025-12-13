from urllib.parse import urlparse
from typing import Iterable


def is_https_url(url: str) -> bool:
    try:
        p = urlparse(url)
    except Exception:
        return False
    return p.scheme == "https" and bool(p.netloc)


def is_allowed_domain(url: str, allowed_domains: Iterable[str]) -> bool:
    p = urlparse(url)
    host = (p.netloc or "").lower()

    for d in allowed_domains:
        d = d.lower()
        if host == d or host.endswith("." + d):
            return True
    return False
