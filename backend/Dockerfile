FROM python:3.12-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

ENV PODMAN_CONTAINERS_KEYRING=false

EXPOSE 3000

CMD ["sh", "-c", "uvicorn main:socket_app --host 0.0.0.0 --port ${PORT:-3000}"]
