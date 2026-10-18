"""Decode every delivery recording and measure final encoded audio with FFmpeg."""
import hashlib
import json
import subprocess
from pathlib import Path

root = Path(__file__).resolve().parents[1]
manifest = json.loads((root / 'assets/audio/narration/manifest.json').read_text(encoding='utf-8'))
results = []
for clip in manifest['languages']['en'].values():
    path = root / clip['file']
    process = subprocess.run(['ffmpeg', '-hide_banner', '-nostats', '-xerror', '-i', str(path),
        '-af', 'loudnorm=I=-19:TP=-2:LRA=7:print_format=json', '-f', 'null', '-'], capture_output=True, text=True, check=True)
    measured = json.loads(process.stderr[process.stderr.rfind('{'):process.stderr.rfind('}') + 1])
    result = {'id': clip['id'], 'bytes': path.stat().st_size, 'durationSeconds': clip['duration'],
        'integratedLUFS': float(measured['input_i']), 'truePeakDBTP': float(measured['input_tp']),
        'sha256': hashlib.sha256(path.read_bytes()).hexdigest(), 'decoded': True}
    assert result['truePeakDBTP'] <= -1, result
    assert -24 < result['integratedLUFS'] < -15, result
    results.append(result)
summary = {'clips': results, 'deliveryBytes': sum(item['bytes'] for item in results),
    'sourceWavBytes': sum(path.stat().st_size for path in (root / 'assets/audio/narration/source/en').glob('*.wav')),
    'totalDurationSeconds': round(sum(item['durationSeconds'] for item in results), 3),
    'humanListeningPerformed': False}
output = root / 'docs/rituals/evidence/ritual-19-audio-verification.json'
output.write_text(json.dumps(summary, indent=2) + '\n', encoding='utf-8')
print(json.dumps({key: value for key, value in summary.items() if key != 'clips'}))
