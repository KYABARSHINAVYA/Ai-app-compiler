AI App Compiler 🚀

An industrial-grade AI-powered application builder inspired by modern platforms like Base44.
This project allows users to generate AI application architectures, manage projects, explore templates, analyze app metrics, and navigate real-time workspaces with a modern interactive dashboard UI.

✨ Features
🔐 Authentication System
User Login & Registration
Secure password hashing
Session-based frontend authentication
🧠 AI App Generation

Generate:

API structures
Database schemas
Authentication systems
Workflow architectures
AI-powered project plans
📂 Real-Time Dashboard

Modern dashboard similar to Base44:

AI Usage Analytics
Active Workspaces
Deployment Status
Project Statistics
Live Navigation Panels
📁 Projects Workspace

Interactive project pages:

Chatbot Apps
SaaS Platforms
AI Healthcare Systems
CRM Dashboards
AI Interview Systems

Each project:

Opens into a dedicated workspace
Supports navigation
Includes project actions
Real-time panel switching
🧩 Templates Section

Prebuilt templates:

AI Chatbot
CRM Dashboard
AI SaaS App
Portfolio Builder
Healthcare Assistant

Each template:

Opens as a separate page
Includes deployment & editor options
📊 Analytics
AI Usage Tracking
Request Metrics
Deployment Monitoring
Workspace Statistics
⚙️ Settings
Profile Settings
Workspace Settings
Deployment Configurations
Account Preferences
🛠️ Tech Stack
Frontend
React.js
Vite
Axios
Modern Inline Styling UI
Backend
FastAPI
Uvicorn
Passlib
SQLite
AI Integration
Gemini API
OpenRouter API
📁 Project Structure
ai-app-compiler/
│
├── backend/
│   ├── app/
│   │   ├── main.py
│   │   ├── auth.py
│   │   ├── database.py
│   │   └── models.py
│   │
│   ├── requirements.txt
│   └── venv/
│
├── frontend/
│   ├── src/
│   │   ├── App.jsx
│   │   └── main.jsx
│   │
│   ├── package.json
│   └── vite.config.js
│
└── README.md
⚡ Installation
1️⃣ Clone Repository
git clone https://github.com/KYABARSHINAVYA/Ai-app-compiler.git
cd Ai-app-compiler
🔥 Backend Setup
Create Virtual Environment
python -m venv venv
Activate Environment
Windows
venv\Scripts\activate
Mac/Linux
source venv/bin/activate
Install Dependencies
pip install -r requirements.txt
Run Backend
uvicorn app.main:app --reload

Backend Runs At:

http://127.0.0.1:8000
💻 Frontend Setup
cd frontend
npm install
npm run dev

Frontend Runs At:

http://localhost:5173
🔑 Environment Variables

Create .env file:

GEMINI_API_KEY=YOUR_API_KEY
OPENROUTER_API_KEY=YOUR_API_KEY
📸 UI Highlights
Dashboard
Workspace cards
Analytics overview
AI usage statistics
Projects
Interactive project explorer
Chatbot systems
SaaS workspace pages
Templates
Ready-made templates
Open workspace buttons
Deploy actions
Analytics
Deployment reports
AI request metrics
Usage graphs
Settings
Profile editing
Workspace controls
Deployment preferences
🚀 Future Improvements
Real database integration
JWT Authentication
Docker Deployment
AI Code Generation
Real-time Collaboration
Firebase/Auth0 Support
Deployment Pipelines
Team Workspaces7dbbf5b9aba663b1e02e545a232c0303678
