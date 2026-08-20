'''
backend/tasks.py — Celery task wrapper for heavy ingestion work.

Demo mode  (CELERY_BROKER_URL unset):  synchronous, same call semantics, zero deps.
Prod mode  (CELERY_BROKER_URL set):    async Celery task; caller gets task_id back.
'''
import os

CELERY_BROKER_URL = os.environ.get('CELERY_BROKER_URL')

if CELERY_BROKER_URL:
    from celery import Celery

    celery_app = Celery(
        'deadmind',
        broker=CELERY_BROKER_URL,
        backend=CELERY_BROKER_URL,
    )
    celery_app.conf.update(
        task_serializer='json',
        result_serializer='json',
        accept_content=['json'],
        timezone='UTC',
    )

    @celery_app.task(name='process_ocr_scan', bind=True)
    def process_ocr_scan_task(self, file_bytes_hex: str, filename: str, engineer: str, is_pdf: bool):
        '''Async Celery task: run OCR on a scan and ingest the result.'''
        file_bytes = bytes.fromhex(file_bytes_hex)
        from backend.ocr_ingestion import ocr_scanned_document
        return ocr_scanned_document(file_bytes, filename, engineer, is_pdf=is_pdf)

    @celery_app.task(name='parse_pid_symbols_task', bind=True)
    def parse_pid_symbols_task(self, file_bytes_hex: str):
        '''Async Celery task: run P&ID CV symbol detection.'''
        file_bytes = bytes.fromhex(file_bytes_hex)
        from backend.ocr_ingestion import parse_pid_symbols
        return parse_pid_symbols(file_bytes)

else:
    # Demo-mode passthrough — exact same call signatures

    def process_ocr_scan_task(file_bytes_hex: str, filename: str, engineer: str, is_pdf: bool):
        '''Demo mode: synchronous OCR ingestion — no broker required.'''
        file_bytes = bytes.fromhex(file_bytes_hex)
        from backend.ocr_ingestion import ocr_scanned_document
        return ocr_scanned_document(file_bytes, filename, engineer, is_pdf=is_pdf)

    def parse_pid_symbols_task(file_bytes_hex: str):
        '''Demo mode: synchronous P&ID CV symbol detection.'''
        file_bytes = bytes.fromhex(file_bytes_hex)
        from backend.ocr_ingestion import parse_pid_symbols
        return parse_pid_symbols(file_bytes)
