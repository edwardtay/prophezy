# AI Oracle Service

Fast AI-powered resolution service for prediction markets.

## Setup

```bash
pip install -r requirements.txt
```

## Environment Variables

```bash
OPENAI_API_KEY=your_key_here
ANTHROPIC_API_KEY=your_key_here
```

## Run

```bash
python main.py
# or
uvicorn main:app --reload
```

## API Endpoints

- `POST /analyze` - Analyze a market question
- `POST /resolve` - Finalize market resolution
- `GET /health` - Health check



