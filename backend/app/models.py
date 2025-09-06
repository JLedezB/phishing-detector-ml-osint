from pydantic import BaseModel, EmailStr, Field
from typing import List, Optional

class EmailIn(BaseModel):
    subject: str = Field(..., min_length=1, description="Asunto del correo")
    sender: EmailStr | str = Field(..., description="Dirección del remitente")
    body: str = Field(..., min_length=1, description="Cuerpo del correo en texto")
    headers: Optional[dict] = Field(default=None, description="Cabeceras crudas opcionales")
    attachments: Optional[List[str]] = Field(default=None, description="Archivos adjuntos")

class AnalyzeResult(BaseModel):
    risk_score: int
    label: str
    reasons: List[str]
    indicators: dict
