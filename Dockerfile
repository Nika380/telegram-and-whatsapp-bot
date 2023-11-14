# Dockerfile
FROM python:3.8-slim

WORKDIR /app

COPY . .

RUN pip install --no-cache-dir -r requirements.txt

ENV NODE_ENV=${NODE_ENV}

CMD ["uvicorn", "main:api", "--host", "0.0.0.0", "--port", "8001"]