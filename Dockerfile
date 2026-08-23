FROM python:3.11-slim
WORKDIR /app
ENV LOW_MEMORY_MODE=1
ENV RENDER=true
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
EXPOSE 8000
CMD ["python", "run.py"]
