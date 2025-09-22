# Use a Python base image
FROM python:3.10-slim-buster

# Set environment variables
ENV PYTHONUNBUFFERED 1
ENV PYTHONDONTWRITEBYTECODE 1

# Set the working directory in the container
WORKDIR /app

# Install system dependencies (if any, e.g., for psycopg2)
# RUN apt-get update && apt-get install -y --no-install-recommends \
#     postgresql-client \
#     gcc \
#     python3-dev \
#     musl-dev \
#     libpq-dev \
#     tesseract-ocr \
#     libtesseract-dev \
#     poppler-utils \
#     libgl1-mesa-glx \
#     && rm -rf /var/lib/apt/lists/*

# Copy requirements file and install Python dependencies
COPY requirements.txt /app/
RUN pip install --no-cache-dir -r requirements.txt

# Copy the Django project code
COPY . /app/

# Expose the port Django will run on
EXPOSE 8000

# Command to run the Django application using Gunicorn
CMD ["gunicorn", "finance_tracker.wsgi:application", "--bind", "0.0.0.0:8000"]