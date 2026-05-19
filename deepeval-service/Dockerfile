FROM python:3.11-slim

WORKDIR /app

RUN pip cache purge

COPY deepeval-service/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY deepeval-service/ .

EXPOSE 8000

CMD ["python", "main.py"]
