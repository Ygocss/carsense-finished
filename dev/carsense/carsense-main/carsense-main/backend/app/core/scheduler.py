from threading import Thread, Event
import time

_stop = Event()
_worker: Thread | None = None

def _job():
    # Aquí podrías ejecutar tareas periódicas (limpieza, recordatorios, etc.)
    while not _stop.is_set():
        time.sleep(60)

def start_scheduler():
    global _worker
    if _worker and _worker.is_alive():
        return
    _worker = Thread(target=_job, daemon=True)
    _worker.start()
