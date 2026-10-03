from pydantic import BaseModel
from datetime import datetime
from typing import Optional

# --- SCHEMAS DE PACIENTES / COLABORADORES ---
class PatientBase(BaseModel):
    name: str
    cpf: str
    phone: str
    company: Optional[str] = None

class PatientCreate(PatientBase):
    pass

class Patient(PatientBase):
    id: int

    class Config:
        from_attributes = True

# --- SCHEMAS DE EXAMES (PCMSO) ---
class ExamBase(BaseModel):
    name: str
    description: Optional[str] = None
    price: float

class ExamCreate(ExamBase):
    pass

class Exam(ExamBase):
    id: int

    class Config:
        from_attributes = True

# --- SCHEMAS DE AGENDAMENTOS ---
class AppointmentBase(BaseModel):
    patient_id: int
    exam_id: int
    appointment_date: datetime

class AppointmentCreate(AppointmentBase):
    pass

class AppointmentUpdate(BaseModel):
    appointment_date: Optional[datetime] = None

class Appointment(AppointmentBase):
    id: int
    created_at: datetime
    patient: Patient
    exam: Exam

    class Config:
        from_attributes = True