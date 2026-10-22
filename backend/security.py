from passlib.context import CryptContext

# bcrypt for all new hashes. hex_sha256 is only here so accounts created before the
# bcrypt switch can still log in; their hash is upgraded to bcrypt on the next login.
pwd_context = CryptContext(schemes=["bcrypt", "hex_sha256"], deprecated=["hex_sha256"])


def hash_password(password: str) -> str:
    return pwd_context.hash(password)
