from urllib.parse import urlparse, urlunparse, urlencode, parse_qsl

from app.token_codec import encrypt_payload_to_token


def build_qr_url(base_page_url: str, payload: dict, passphrase: str) -> str:
    token = encrypt_payload_to_token(payload, passphrase)

    p = urlparse(base_page_url)
    query = dict(parse_qsl(p.query))
    query["t"] = token

    new_p = p._replace(query=urlencode(query))
    return urlunparse(new_p)
