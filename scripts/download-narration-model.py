"""Download official Piper voice assets into an ignored, project-local tool cache."""
import hashlib
import json
import time
from pathlib import Path
from urllib.request import urlretrieve

root = Path(__file__).resolve().parents[1]
target = root / '.tools/narration/model'
target.mkdir(parents=True, exist_ok=True)
repository = 'rhasspy/piper-voices'
revision = 'c10ece1aade47bb51c153c893d14e5bf8e5b7117'
folder = 'en/en_US/libritts_r/medium'
files = ['en_US-libritts_r-medium.onnx', 'en_US-libritts_r-medium.onnx.json', 'MODEL_CARD']
records = []
for name in files:
    destination = target / name
    url = f'https://huggingface.co/{repository}/resolve/{revision}/{folder}/{name}'
    for attempt in range(3):
        try:
            if not destination.exists():
                urlretrieve(url, destination)
            break
        except OSError:
            if destination.exists():
                destination.unlink()
            if attempt == 2:
                raise
            time.sleep(1)
    records.append({'name': name, 'url': url, 'sha256': hashlib.sha256(destination.read_bytes()).hexdigest()})
    print(f'{name}: {destination.stat().st_size} bytes', flush=True)
(target / 'provenance.json').write_text(json.dumps({'repository': repository, 'revision': revision, 'files': records}, indent=2), encoding='utf-8')
