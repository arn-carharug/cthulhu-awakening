# English narration production

Synthetic speech generated locally using **Piper 1.3.0**, an offline neural TTS engine by the OHF-Voice contributors: https://github.com/OHF-Voice/piper1-gpl (GPL-3.0). The engine and model weights are development tools, not included in the browser distribution. The browser plays ordinary audio files.

Voice model: **en_US-libritts_r-medium**, published by rhasspy/piper-voices. See MODEL_CARD.txt and PROVENANCE.json for the exact model revision, source URLs and SHA-256 checksums. Model card: https://huggingface.co/rhasspy/piper-voices/blob/main/en/en_US/libritts_r/medium/MODEL_CARD

Training corpus: **LibriTTS-R**, OpenSLR resource 141, licensed CC BY 4.0: https://www.openslr.org/141/ . Citation: Yuma Koizumi, Heiga Zen, Shigeki Karita, Yifan Ding, Kohei Yatabe, Nobuyuki Morioka, Michiel Bacchiani, Yu Zhang, Wei Han, and Ankur Bapna, “LibriTTS-R: A Restored Multi-Speaker Text-to-Speech Corpus,” 2023. License: https://creativecommons.org/licenses/by/4.0/ . No endorsement is implied.

Changes: new game-script synthesis with a built-in narrator index; slowed delivery, lowered pitch, filtering, short echo, loudness normalization, and MP3 encoding. No user voice recording or custom voice clone was used. The source game narration text is in scripts/narration-lines.json; clean synthesized WAV files are in source/en/ and edited delivery files in en/.

Reproduce: install `piper-tts==1.3.0` into `.tools/narration/python`, run `python scripts/download-narration-model.py`, then `python scripts/generate-narration.py` with FFmpeg/FFprobe on PATH. The downloader records the upstream revision used. Reusing the revision in PROVENANCE.json is required to reproduce the same model. Neural synthesis may differ at sample level between runtime versions.
