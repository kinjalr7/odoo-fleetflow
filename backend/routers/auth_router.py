import datetime
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session
from database import get_db
import models
import schemas
from auth import hash_password, verify_password, create_access_token, create_refresh_token, decode_token, get_current_user

router = APIRouter(prefix="/auth", tags=["Authentication"])

# Extra routers mounted on /users for profile
users_router = APIRouter(prefix="/users", tags=["Users"])


class UpdateProfileRequest(BaseModel):
    name: Optional[str] = None


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str


@router.post("/register", response_model=schemas.UserResponse, status_code=201)
def register(req: schemas.RegisterRequest, db: Session = Depends(get_db)):
    """Register a new user. Only Flask Manager can add Safety Officer / Financial Analyst roles."""
    allowed_roles = ["Fleet Manager", "Dispatcher", "Safety Officer", "Financial Analyst"]
    if req.role not in allowed_roles:
        raise HTTPException(status_code=400, detail=f"Invalid role. Choose from: {allowed_roles}")

    existing = db.query(models.User).filter(models.User.email == req.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="User with this email already exists")

    user = models.User(
        name=req.name,
        email=req.email,
        hashed_password=hash_password(req.password),
        role=req.role,
        is_active=True,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@router.post("/login", response_model=schemas.TokenResponse)
def login(req: schemas.LoginRequest, db: Session = Depends(get_db)):
    """Login with email + password. Returns JWT access + refresh tokens."""
    user = db.query(models.User).filter(models.User.email == req.email).first()

    if not user or not verify_password(req.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Your account has been suspended. Contact an administrator.",
        )

    token_data = {"sub": user.id, "role": user.role, "email": user.email}
    access_token = create_access_token(token_data)
    refresh_token = create_refresh_token(token_data)

    return schemas.TokenResponse(
        token=access_token,
        refresh_token=refresh_token,
        name=user.name,
        email=user.email,
        role=user.role,
        user_id=user.id,
    )


@router.post("/refresh", response_model=schemas.TokenResponse)
def refresh_token(req: schemas.RefreshRequest, db: Session = Depends(get_db)):
    """Exchange a refresh token for a new access token."""
    payload = decode_token(req.refresh_token)
    if payload.get("type") != "refresh":
        raise HTTPException(status_code=401, detail="Invalid refresh token")

    user_id = payload.get("sub")
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user or not user.is_active:
        raise HTTPException(status_code=401, detail="User not found or suspended")

    token_data = {"sub": user.id, "role": user.role, "email": user.email}
    return schemas.TokenResponse(
        token=create_access_token(token_data),
        refresh_token=create_refresh_token(token_data),
        name=user.name,
        email=user.email,
        role=user.role,
        user_id=user.id,
    )


@router.get("/me", response_model=schemas.UserResponse)
def get_me(current_user: models.User = Depends(get_current_user)):
    """Get the currently authenticated user's profile."""
    return current_user


@router.patch("/me", response_model=schemas.UserResponse)
def update_me(
    req: UpdateProfileRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Update the currently authenticated user's display name."""
    if req.name is not None:
        name = req.name.strip()
        if not name:
            raise HTTPException(status_code=400, detail="Name cannot be empty")
        current_user.name = name
    db.commit()
    db.refresh(current_user)
    return current_user


@router.patch("/me/password")
def change_password(
    req: ChangePasswordRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Change the currently authenticated user's password."""
    if not verify_password(req.current_password, current_user.hashed_password):
        raise HTTPException(status_code=400, detail="Current password is incorrect")
    if len(req.new_password) < 6:
        raise HTTPException(status_code=400, detail="New password must be at least 6 characters")
    current_user.hashed_password = hash_password(req.new_password)
    db.commit()
    return {"msg": "Password updated successfully"}


# ── /users/me alias (same endpoints, different prefix) ──────────────────────
@users_router.get("/me", response_model=schemas.UserResponse)
def users_get_me(current_user: models.User = Depends(get_current_user)):
    """Alias: GET /users/me — returns the logged-in user's profile."""
    return current_user


@users_router.patch("/me", response_model=schemas.UserResponse)
def users_update_me(
    req: UpdateProfileRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Alias: PATCH /users/me — update display name."""
    return update_me(req, db, current_user)

