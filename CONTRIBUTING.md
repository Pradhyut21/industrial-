# Contributing to DeadMind

Thank you for your interest in contributing to **DeadMind**! We are building the next generation of Industrial Knowledge Intelligence to bridge the heavy industry retirement cliff.

---

## Development Setup

### 1. Prerequisites
- Python 3.10 or 3.11+
- Node.js 20+ and npm
- `tesseract-ocr` and `poppler-utils` (for document intelligence)

### 2. Backend Setup
```bash
# Clone the repository
git clone https://github.com/your-org/DeadMind.git
cd DeadMind

# Install Python dependencies
pip install -r requirements.txt

# Download spaCy NLP model
python -m spacy download en_core_web_sm

# Seed high-fidelity demo database
python generate_demo_data.py

# Launch FastAPI backend
python run.py
```

### 3. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```

---

## Architecture Guidelines

When adding new features or endpoints, adhere to our core architectural patterns:

1. **Dual-Mode Graceful Fallback**: Every third-party integration (LLMs, Telephony, Indic Translation) must implement both a `LiveProvider` and a `StubProvider`. The system should boot cleanly and pass all integration tests without requiring API keys.
2. **Deterministic Schemas**: All API payloads must use Pydantic models with explicit field validations.
3. **Database Additivity**: Never introduce breaking schema alterations to existing SQLite / Postgres tables without migration scripts.
4. **Role-Aware Filtering**: Every query endpoint should honor user persona styling and sensitivity bounds.

---

## Pull Request Checklist

Before submitting a Pull Request:
- [ ] Run test suite: `python -m pytest backend/tests/ -v`
- [ ] Ensure frontend builds cleanly: `cd frontend && npm run build`
- [ ] Check code formatting and linting
- [ ] Update documentation (`README.md`, `API.md`, or `ARCHITECTURE.md`)
- [ ] Provide clear reproduction / test steps in your PR description
