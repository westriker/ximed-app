#  XIMED — Gestão de Saúde Ocupacional & SST (PCMSO / NR-07)

Sistema Full Stack desenvolvido para automação e controle de Medicina do Trabalho e Segurança do Trabalho (SST), atendendo às diretrizes da **NR-07** e aos requisitos de emissão de Atestados de Saúde Ocupacional (ASO) integrados ao eSocial (Evento S-2220).

---

## Sobre o Projeto

O **XIMED** permite gerenciar a jornada ocupacional de colaboradores em empresas parceiras, cobrindo:
- **Cadastro e Prontuário de Vidas (Colaboradores):** Controle individual por CPF e empresa vinculada.
- **Catálogo do PCMSO (Exames Complementares):** Gestão de exames (Audiometria, Espirometria, ECG, Admissionais/Demissionais) e precificação.
- **Painel de Agendamentos & ASO:** Agendamento de consultas por unidade com acompanhamento em tempo real e alteração direta do status do ASO (Apto / Pendente).

---

##  Tecnologias Utilizadas

### **Backend**
- **Python 3.14**
- **FastAPI**: Criação da API RESTful de alta performance.
- **SQLAlchemy**: ORM para mapeamento e gestão da base de dados.
- **SQLite**: Banco de dados relacional para persistência local rápida.
- **Pydantic**: Validação estrita de tipos e schemas de entrada/saída.

### **Frontend**
- **React** (via Vite)
- **Tailwind CSS**: Estilização moderna e responsiva.
- **Lucide React**: Conjunto de ícones para UI/UX.
- **Axios**: Consumo assíncrono das rotas da API.

---

##  Como Executar o Projeto

Para executar a aplicação na sua máquina local, certifique-se de ter o **Python** e o **Node.js** instalados.

### 1️⃣ Inicializar o Backend (FastAPI)

Em um terminal, navegue até a pasta do backend:

```bash
cd backend
```

Instale as dependências:
```bash
pip install -r requirements.txt
```

Execute o servidor Uvicorn:
```bash
uvicorn app.main:app --reload
```
> O servidor estará rodando em `http://127.0.0.1:8000`.

---

### 2️⃣ Inicializar o Frontend (React)

Em **outro terminal separado**, navegue até a pasta do frontend:

```bash
cd frontend
```

Instale as dependências:
```bash
npm install
```

Inicie o servidor de desenvolvimento:
```bash
npm run dev
```
> Acesse a aplicação no navegador pelo endereço indicado (ex: `http://localhost:5173`).

---

##  Documentação Interativa da API (Swagger)

Com o backend rodando, a documentação automática das rotas REST pode ser acessada e testada em:
- **Swagger UI:** `http://127.0.0.1:8000/docs`
- **ReDoc:** `http://127.0.0.1:8000/redoc`

---

##  Estrutura do Repositório

```text
ximed-app/
├── backend/
│   ├── app/
│   │   ├── database.py   # Configuração da conexão com SQLite
│   │   ├── models.py     # Modelos do banco de dados (ORM)
│   │   ├── schemas.py    # Schemas de validação Pydantic
│   │   └── main.py       # Endpoints REST e middleware CORS
│   └── requirements.txt  # Dependências do Python
├── frontend/
│   ├── src/
│   │   ├── App.jsx       # Componente principal e fluxos do CRUD
│   │   └── index.css     # Estilos globais e Tailwind
│   └── package.json      # Dependências do Node.js
└── README.md             # Documentação do projeto
```

---

##  Roadmap / Para aprimorar futuramente o codigo imaginei esses próximos Passos...

- [ ] Implementação de Autenticação e Autorização via JWT (JSON Web Tokens) com controle de acesso por perfil (RBAC: Médico, RH, Admin).
- [ ] Exportação automática de relatórios em PDF para laudos do PCMSO.
- [ ] Integração direta via API REST com a plataforma do eSocial para transmissão do Evento S-2220.