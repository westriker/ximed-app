from datetime import datetime, timedelta, timezone
from typing import List, Optional
from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from jose import JWTError, jwt
from passlib.context import CryptContext
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app import models, schemas
from app.database import engine, get_db

# Criar tabelas na base de dados
models.Base.metadata.create_all(bind=engine)

# ==========================================
# CONFIGURAÇÕES DE SEGURANÇA E JWT
# ==========================================
SECRET_KEY = "ximed_secret_key_super_segura_para_producao"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 120

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="login")

# Usuário admin padrão
ADMIN_USER = "admin"
ADMIN_PASSWORD_HASH = pwd_context.hash("123456")

class Token(BaseModel):
    access_token: str
    token_type: str

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

# Middleware de Validação do Token
async def get_current_user(token: str = Depends(oauth2_scheme)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Token de autenticação inválido ou expirado",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    return username


# ==========================================
# INICIALIZAÇÃO DA APLICAÇÃO & CORS
# ==========================================
app = FastAPI(title="XIMED - API de Saúde Ocupacional")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ==========================================
# ROTA PÚBLICA: LOGIN (JWT)
# ==========================================
@app.post("/login", response_model=Token)
def login(form_data: OAuth2PasswordRequestForm = Depends()):
    if form_data.username != ADMIN_USER or not pwd_context.verify(form_data.password, ADMIN_PASSWORD_HASH):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Utilizador ou palavra-passe incorretos",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    access_token = create_access_token(data={"sub": ADMIN_USER})
    return {"access_token": access_token, "token_type": "bearer"}


# ==========================================
# ROTAS PROTEGIDAS: PACIENTES / COLABORADORES
# ==========================================
@app.post("/patients", response_model=schemas.Patient)
def create_patient(
    patient: schemas.PatientCreate,
    db: Session = Depends(get_db),
    current_user: str = Depends(get_current_user)
):
    try:
        db_patient = db.query(models.Patient).filter(models.Patient.cpf == patient.cpf).first()
        if db_patient:
            raise HTTPException(status_code=400, detail="CPF já cadastrado na base de SST.")
        new_patient = models.Patient(**patient.model_dump())
        db.add(new_patient)
        db.commit()
        db.refresh(new_patient)
        return new_patient
    except HTTPException as e:
        db.rollback()
        raise e
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/patients", response_model=List[schemas.Patient])
def read_patients(
    db: Session = Depends(get_db),
    current_user: str = Depends(get_current_user)
):
    return db.query(models.Patient).all()


# ==========================================
# ROTAS PROTEGIDAS: EXAMES / PCMSO
# ==========================================
@app.post("/exams", response_model=schemas.Exam)
def create_exam(
    exam: schemas.ExamCreate,
    db: Session = Depends(get_db),
    current_user: str = Depends(get_current_user)
):
    try:
        new_exam = models.Exam(**exam.model_dump())
        db.add(new_exam)
        db.commit()
        db.refresh(new_exam)
        return new_exam
    except Exception:
        db.rollback()
        raise HTTPException(status_code=500, detail="Erro ao salvar exame na base de dados.")

@app.get("/exams", response_model=List[schemas.Exam])
def read_exams(
    db: Session = Depends(get_db),
    current_user: str = Depends(get_current_user)
):
    return db.query(models.Exam).all()

@app.put("/exams/{exam_id}", response_model=schemas.Exam)
def update_exam(
    exam_id: int,
    exam_data: schemas.ExamCreate,
    db: Session = Depends(get_db),
    current_user: str = Depends(get_current_user)
):
    try:
        exam = db.query(models.Exam).filter(models.Exam.id == exam_id).first()
        if not exam:
            raise HTTPException(status_code=404, detail="Exame não encontrado no PCMSO")
        
        exam.name = exam_data.name
        exam.description = exam_data.description
        exam.price = exam_data.price
        
        db.commit()
        db.refresh(exam)
        return exam
    except HTTPException as e:
        db.rollback()
        raise e
    except Exception:
        db.rollback()
        raise HTTPException(status_code=500, detail="Erro ao atualizar exame.")

@app.delete("/exams/{exam_id}")
def delete_exam(
    exam_id: int,
    db: Session = Depends(get_db),
    current_user: str = Depends(get_current_user)
):
    try:
        exam = db.query(models.Exam).filter(models.Exam.id == exam_id).first()
        if not exam:
            raise HTTPException(status_code=404, detail="Exame não encontrado")
        
        db.query(models.Appointment).filter(models.Appointment.exam_id == exam_id).delete()
        db.delete(exam)
        db.commit()
        return {"detail": "Exame e registros associados removidos com sucesso"}
    except Exception:
        db.rollback()
        raise HTTPException(status_code=400, detail="Erro ao excluir exame da base de dados.")


# ==========================================
# ROTAS PROTEGIDAS: AGENDAMENTOS OCUPACIONAIS
# ==========================================
@app.post("/appointments", response_model=schemas.Appointment)
def create_appointment(
    appointment: schemas.AppointmentCreate,
    db: Session = Depends(get_db),
    current_user: str = Depends(get_current_user)
):
    try:
        patient = db.query(models.Patient).filter(models.Patient.id == appointment.patient_id).first()
        if not patient:
            raise HTTPException(status_code=404, detail="Colaborador não cadastrado.")
        
        exam = db.query(models.Exam).filter(models.Exam.id == appointment.exam_id).first()
        if not exam:
            raise HTTPException(status_code=404, detail="Exame do PCMSO não encontrado.")

        new_app = models.Appointment(**appointment.model_dump())
        db.add(new_app)
        db.commit()
        db.refresh(new_app)
        return new_app
    except HTTPException as e:
        db.rollback()
        raise e
    except Exception:
        db.rollback()
        raise HTTPException(status_code=500, detail="Erro ao agendar consulta.")

@app.get("/appointments", response_model=List[schemas.Appointment])
def read_appointments(
    db: Session = Depends(get_db),
    current_user: str = Depends(get_current_user)
):
    return db.query(models.Appointment).all()

@app.patch("/appointments/{appointment_id}", response_model=schemas.Appointment)
def update_appointment_date(
    appointment_id: int,
    update_data: schemas.AppointmentUpdate,
    db: Session = Depends(get_db),
    current_user: str = Depends(get_current_user)
):
    try:
        app_obj = db.query(models.Appointment).filter(models.Appointment.id == appointment_id).first()
        if not app_obj:
            raise HTTPException(status_code=404, detail="Agendamento não encontrado.")
        
        if update_data.appointment_date:
            app_obj.appointment_date = update_data.appointment_date
            db.commit()
            db.refresh(app_obj)
        return app_obj
    except HTTPException as e:
        db.rollback()
        raise e
    except Exception:
        db.rollback()
        raise HTTPException(status_code=500, detail="Erro ao atualizar data.")

@app.delete("/appointments/{appointment_id}")
def delete_appointment(
    appointment_id: int,
    db: Session = Depends(get_db),
    current_user: str = Depends(get_current_user)
):
    try:
        app_obj = db.query(models.Appointment).filter(models.Appointment.id == appointment_id).first()
        if not app_obj:
            raise HTTPException(status_code=404, detail="Agendamento não encontrado.")
        db.delete(app_obj)
        db.commit()
        return {"detail": "Agendamento cancelado com sucesso"}
    except Exception:
        db.rollback()
from datetime import datetime, timedelta, timezone
from typing import List, Optional
from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from jose import JWTError, jwt
from passlib.context import CryptContext
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app import models, schemas
from app.database import engine, get_db

# Criar tabelas na base de dados
models.Base.metadata.create_all(bind=engine)

# ==========================================
# CONFIGURAÇÕES DE SEGURANÇA E JWT
# ==========================================
SECRET_KEY = "ximed_secret_key_super_segura_para_producao"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 120

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="login")

# Usuário admin padrão
ADMIN_USER = "admin"
ADMIN_PASSWORD_HASH = pwd_context.hash("123456")

class Token(BaseModel):
    access_token: str
    token_type: str

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

# Middleware de Validação do Token
async def get_current_user(token: str = Depends(oauth2_scheme)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Token de autenticação inválido ou expirado",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    return username


# ==========================================
# INICIALIZAÇÃO DA APLICAÇÃO & CORS
# ==========================================
app = FastAPI(title="XIMED - API de Saúde Ocupacional")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ==========================================
# ROTA PÚBLICA: LOGIN (JWT) - HÍBRIDA
# ==========================================
class LoginRequest(BaseModel):
    username: str
    password: str

@app.post("/login", response_model=Token)
def login(form_data: OAuth2PasswordRequestForm = Depends(), body: Optional[LoginRequest] = None):
    # Aceita tanto JSON quanto form-urlencoded
    username = body.username if body else form_data.username
    password = body.password if body else form_data.password

    if username != ADMIN_USER or not pwd_context.verify(password, ADMIN_PASSWORD_HASH):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Utilizador ou palavra-passe incorretos",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    access_token = create_access_token(data={"sub": ADMIN_USER})
    return {"access_token": access_token, "token_type": "bearer"}


# ==========================================
# ROTAS PROTEGIDAS: PACIENTES / COLABORADORES
# ==========================================
@app.post("/patients", response_model=schemas.Patient)
def create_patient(
    patient: schemas.PatientCreate,
    db: Session = Depends(get_db),
    current_user: str = Depends(get_current_user)
):
    try:
        db_patient = db.query(models.Patient).filter(models.Patient.cpf == patient.cpf).first()
        if db_patient:
            raise HTTPException(status_code=400, detail="CPF já cadastrado na base de SST.")
        new_patient = models.Patient(**patient.model_dump())
        db.add(new_patient)
        db.commit()
        db.refresh(new_patient)
        return new_patient
    except HTTPException as e:
        db.rollback()
        raise e
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/patients", response_model=List[schemas.Patient])
def read_patients(
    db: Session = Depends(get_db),
    current_user: str = Depends(get_current_user)
):
    return db.query(models.Patient).all()


# ==========================================
# ROTAS PROTEGIDAS: EXAMES / PCMSO
# ==========================================
@app.post("/exams", response_model=schemas.Exam)
def create_exam(
    exam: schemas.ExamCreate,
    db: Session = Depends(get_db),
    current_user: str = Depends(get_current_user)
):
    try:
        new_exam = models.Exam(**exam.model_dump())
        db.add(new_exam)
        db.commit()
        db.refresh(new_exam)
        return new_exam
    except Exception:
        db.rollback()
        raise HTTPException(status_code=500, detail="Erro ao salvar exame na base de dados.")

@app.get("/exams", response_model=List[schemas.Exam])
def read_exams(
    db: Session = Depends(get_db),
    current_user: str = Depends(get_current_user)
):
    return db.query(models.Exam).all()

@app.put("/exams/{exam_id}", response_model=schemas.Exam)
def update_exam(
    exam_id: int,
    exam_data: schemas.ExamCreate,
    db: Session = Depends(get_db),
    current_user: str = Depends(get_current_user)
):
    try:
        exam = db.query(models.Exam).filter(models.Exam.id == exam_id).first()
        if not exam:
            raise HTTPException(status_code=404, detail="Exame não encontrado no PCMSO")
        
        exam.name = exam_data.name
        exam.description = exam_data.description
        exam.price = exam_data.price
        
        db.commit()
        db.refresh(exam)
        return exam
    except HTTPException as e:
        db.rollback()
        raise e
    except Exception:
        db.rollback()
        raise HTTPException(status_code=500, detail="Erro ao atualizar exame.")

@app.delete("/exams/{exam_id}")
def delete_exam(
    exam_id: int,
    db: Session = Depends(get_db),
    current_user: str = Depends(get_current_user)
):
    try:
        exam = db.query(models.Exam).filter(models.Exam.id == exam_id).first()
        if not exam:
            raise HTTPException(status_code=404, detail="Exame não encontrado")
        
        db.query(models.Appointment).filter(models.Appointment.exam_id == exam_id).delete()
        db.delete(exam)
        db.commit()
        return {"detail": "Exame e registros associados removidos com sucesso"}
    except Exception:
        db.rollback()
        raise HTTPException(status_code=400, detail="Erro ao excluir exame da base de dados.")


# ==========================================
# ROTAS PROTEGIDAS: AGENDAMENTOS OCUPACIONAIS
# ==========================================
@app.post("/appointments", response_model=schemas.Appointment)
def create_appointment(
    appointment: schemas.AppointmentCreate,
    db: Session = Depends(get_db),
    current_user: str = Depends(get_current_user)
):
    try:
        patient = db.query(models.Patient).filter(models.Patient.id == appointment.patient_id).first()
        if not patient:
            raise HTTPException(status_code=404, detail="Colaborador não cadastrado.")
        
        exam = db.query(models.Exam).filter(models.Exam.id == appointment.exam_id).first()
        if not exam:
            raise HTTPException(status_code=404, detail="Exame do PCMSO não encontrado.")

        new_app = models.Appointment(**appointment.model_dump())
        db.add(new_app)
        db.commit()
        db.refresh(new_app)
        return new_app
    except HTTPException as e:
        db.rollback()
        raise e
    except Exception:
        db.rollback()
        raise HTTPException(status_code=500, detail="Erro ao agendar consulta.")

@app.get("/appointments", response_model=List[schemas.Appointment])
def read_appointments(
    db: Session = Depends(get_db),
    current_user: str = Depends(get_current_user)
):
    return db.query(models.Appointment).all()

@app.patch("/appointments/{appointment_id}", response_model=schemas.Appointment)
def update_appointment_date(
    appointment_id: int,
    update_data: schemas.AppointmentUpdate,
    db: Session = Depends(get_db),
    current_user: str = Depends(get_current_user)
):
    try:
        app_obj = db.query(models.Appointment).filter(models.Appointment.id == appointment_id).first()
        if not app_obj:
            raise HTTPException(status_code=404, detail="Agendamento não encontrado.")
        
        if update_data.appointment_date:
            app_obj.appointment_date = update_data.appointment_date
            db.commit()
            db.refresh(app_obj)
        return app_obj
    except HTTPException as e:
        db.rollback()
        raise e
    except Exception:
        db.rollback()
        raise HTTPException(status_code=500, detail="Erro ao atualizar data.")

@app.delete("/appointments/{appointment_id}")
def delete_appointment(
    appointment_id: int,
    db: Session = Depends(get_db),
    current_user: str = Depends(get_current_user)
):
    try:
        app_obj = db.query(models.Appointment).filter(models.Appointment.id == appointment_id).first()
        if not app_obj:
            raise HTTPException(status_code=404, detail="Agendamento não encontrado.")
        db.delete(app_obj)
        db.commit()
        return {"detail": "Agendamento cancelado com sucesso"}
    except Exception:
        db.rollback()
        raise HTTPException(status_code=500, detail="Erro ao excluir agendamento.")