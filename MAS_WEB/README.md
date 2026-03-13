# MAS - Medical Analysis System

## Setup

### Prerequisites
- Python 3.8+
- PHP 7.4+
- PostgreSQL

### 1. Backend (Django)
Navigate to the `backend` directory.

1. Install dependencies:
   ```bash
   pip install django djangorestframework django-cors-headers psycopg2
   ```
   (Note: You might need `psycopg2-binary` if you don't have build tools)

2. Configure Database:
   - Create a PostgreSQL database named `mas_db`.
   - Update `backend/mas_backend/settings.py` with your DB credentials.

3. Run Migrations:
   ```bash
   python manage.py migrate
   ```

4. Run Server:
   ```bash
   python manage.py runserver
   ```
   Server will run at `http://127.0.0.1:8000`.

### 2. Frontend (PHP)
Navigate to the `frontend` directory.

1. Run PHP built-in server:
   ```bash
   php -S localhost:8080
   ```
2. Open Browser:
   Go to `http://localhost:8080`

## Features
- **Chest X-Ray Analysis**: Upload scans to detect Pneumonia probability.
- **ECG Reporting**: Live visualization dashboard.
- **Breast Cancer Risk**: Multi-model risk assessment view.
