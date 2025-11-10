# backend/app/schemas/chatbot.py
from pydantic import BaseModel

class ChatIn(BaseModel):
    message: str

class ChatOut(BaseModel):
    reply: str
