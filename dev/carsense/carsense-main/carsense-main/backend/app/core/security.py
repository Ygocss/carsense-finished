# app/core/security.py
from datetime import datetime, timedelta
from typing import Optional
from jose import jwt, JWTError
from passlib.context import CryptContext

# ⚠️ Cambia esto en producción por un secreto largo y seguro (env var)
SECRET_KEY = "dev-secret-change-me"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7  # 7 días

# Usa bcrypt_sha256 para permitir passwords > 72 bytes de forma segura
pwd_ctx = CryptContext(
    schemes=["bcrypt_sha256"],
    deprecated="auto",
)

def hash_password(plain: str) -> str:
    """Devuelve el hash seguro de la contraseña."""
    return pwd_ctx.hash(plain)

def verify_password(plain: str, hashed: str) -> bool:
    """Verifica una contraseña en texto plano contra su hash."""
    return pwd_ctx.verify(plain, hashed)

def create_access_token(sub: str, expires_delta: Optional[timedelta] = None) -> str:
    """Crea un JWT con el subject (sub) = user_id o email."""
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode = {"sub": sub, "exp": expire}
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

def decode_token(token: str) -> Optional[str]:
    """Decodifica el JWT y devuelve el 'sub' (o None si es inválido/expirado)."""
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload.get("sub")
    except JWTError:
        return None
