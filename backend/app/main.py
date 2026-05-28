from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, EmailStr

from sqlalchemy.orm import Session

from app.database import SessionLocal, engine
from app.models import User
from app.database import Base

from app.auth import hash_password, verify_password

from app.llm.gemini_client import ask_gemini

Base.metadata.create_all(bind=engine)

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class PromptRequest(BaseModel):

    prompt: str

class RegisterRequest(BaseModel):

    email: EmailStr
    password: str

class LoginRequest(BaseModel):

    email: EmailStr
    password: str

def get_db():

    db = SessionLocal()

    try:
        yield db

    finally:
        db.close()

@app.post("/register")
def register(
    user: RegisterRequest,
    db: Session = Depends(get_db)
):

    existing_user = db.query(User).filter(
        User.email == user.email
    ).first()

    if existing_user:

        raise HTTPException(
            status_code=400,
            detail="Email already exists"
        )

    new_user = User(
        email=user.email,
        password=hash_password(user.password)
    )

    db.add(new_user)

    db.commit()

    return {
        "message": "User registered successfully"
    }

@app.post("/login")
def login(
    user: LoginRequest,
    db: Session = Depends(get_db)
):

    existing_user = db.query(User).filter(
        User.email == user.email
    ).first()

    if not existing_user:

        raise HTTPException(
            status_code=400,
            detail="Invalid email"
        )

    valid = verify_password(
        user.password,
        existing_user.password
    )

    if not valid:

        raise HTTPException(
            status_code=400,
            detail="Invalid password"
        )

    return {
        "message": "Login successful"
    }

@app.post("/generate")
def generate(data: PromptRequest):

    result = ask_gemini(data.prompt)

    return {
        "success": True,
        "result": result
    }