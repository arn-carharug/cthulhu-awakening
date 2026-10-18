"""Deterministically build delivery textures; keep source assets unchanged.

Requires Pillow. Run from any directory with Python 3.
"""
import json
from pathlib import Path
from PIL import Image

root = Path(__file__).resolve().parents[1] / 'assets' / 'textures'
names = ['boat_wood_wet_v2.png', 'compass_brass_v2.png', 'germany010.jpg',
         'Cthulhu_2k_Base_Color.png', 'Cthulhu_2k_AO.png', 'Cthulhu_2k_Metallic.png',
         'Cthulhu_2k_Roughness.png', 'beautiful-photo-sea-waves.jpg']
manifest = {'sourceBytes': sum((root/name).stat().st_size for name in names), 'variants': {}}
for quality, limit in [('high', 2048), ('low', 512)]:
    target = root / 'optimized' / quality
    target.mkdir(parents=True, exist_ok=True)
    entries = []
    for name in names:
        with Image.open(root/name) as source:
            data_map = any(token in name for token in ['_AO', '_Metallic', '_Roughness'])
            image = source.convert('RGB').getchannel('R').convert('RGB') if data_map else source.convert('RGB')
            image.thumbnail((limit, limit), Image.Resampling.LANCZOS)
            destination = target / (Path(name).stem + '.webp')
            image.save(destination, 'WEBP', quality=88 if quality == 'high' else 78,
                       lossless=data_map, method=6)
            entries.append({'source': name, 'file': destination.name, 'width': image.width,
                            'height': image.height, 'bytes': destination.stat().st_size})
    manifest['variants'][quality] = {'bytes': sum(item['bytes'] for item in entries), 'files': entries}
(root / 'optimized' / 'manifest.json').write_text(json.dumps(manifest, indent=2)+'\n', encoding='utf-8')
print(json.dumps({key: value['bytes'] for key, value in manifest['variants'].items()}))
