from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from typing import List
from app import models, schemas
from app.database import engine, get_db

models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="XIMED - API de Saúde Ocupacional")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- PACIENTES / COLABORADORES ---
@app.post("/patients", response_model=schemas.Patient)
def create_patient(patient: schemas.PatientCreate, db: Session = Depends(get_db)):
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
def read_patients(db: Session = Depends(get_db)):
    return db.query(models.Patient).all()

# --- EXAMES / PCMSO (CRUD COMPLETO COM ROLLBACK PROTEGIDO) ---
@app.post("/exams", response_model=schemas.Exam)
def create_exam(exam: schemas.ExamCreate, db: Session = Depends(get_db)):
    try:
        new_exam = models.Exam(**exam.model_dump())
        db.add(new_exam)
        db.commit()
        db.refresh(new_exam)
        return new_exam
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail="Erro ao salvar exame na base de dados.")

@app.get("/exams", response_model=List[schemas.Exam])
def read_exams(db: Session = Depends(get_db)):
    return db.query(models.Exam).all()

@app.put("/exams/{exam_id}", response_model=schemas.Exam)
def update_exam(exam_id: int, exam_data: schemas.ExamCreate, db: Session = Depends(get_db)):
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
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail="Erro ao atualizar exame.")

@app.delete("/exams/{exam_id}")
def delete_exam(exam_id: int, db: Session = Depends(get_db)):
    try:
        exam = db.query(models.Exam).filter(models.Exam.id == exam_id).first()
        if not exam:
            raise HTTPException(status_code=404, detail="Exame não encontrado")
        
        # Apaga agendamentos associados a este exame antes para evitar erro de Chave Estrangeira
        db.query(models.Appointment).filter(models.Appointment.exam_id == exam_id).delete()
        
        db.delete(exam)
        db.commit()
        return {"detail": "Exame e registros associados removidos com sucesso"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail="Erro ao excluir exame da base de dados.")

# --- AGENDAMENTOS OCUPACIONAIS ---
@app.post("/appointments", response_model=schemas.Appointment)
def create_appointment(appointment: schemas.AppointmentCreate, db: Session = Depends(get_db)):
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
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail="Erro ao agendar consulta.")

@app.get("/appointments", response_model=List[schemas.Appointment])
def read_appointments(db: Session = Depends(get_db)):
    return db.query(models.Appointment).all()

@app.patch("/appointments/{appointment_id}", response_model=schemas.Appointment)
def update_appointment_date(appointment_id: int, update_data: schemas.AppointmentUpdate, db: Session = Depends(get_db)):
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
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail="Erro ao atualizar data.")

@app.delete("/appointments/{appointment_id}")
def delete_appointment(appointment_id: int, db: Session = Depends(get_db)):
    try:
        app_obj = db.query(models.Appointment).filter(models.Appointment.id == appointment_id).first()
        if not app_obj:
            raise HTTPException(status_code=404, detail="Agendamento não encontrado.")
        db.delete(app_obj)
        db.commit()
        return {"detail": "Agendamento cancelado com sucesso"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail="Erro ao excluir agendamento.")