# Ritüel XVII — Sesin Bedeni

Durum: 10 gerçek İngilizce sinir ağı kaydı üretildi; insan dinleme kabulü açık.

Piper 1.3.0 CPU çıkarımı ve en_US-libritts_r-medium modeliyle altı yerleşik anlatıcı indeksinden kısa karşılaştırma kayıtları üretildi. Otokorelasyonla temel frekans tahmini yapıldı; pes ses hedefi için indeks 5 seçildi (yaklaşık 113,7 Hz, efekt öncesi). Bu ölçüm, sesin insan tarafından beğenildiği veya kusursuz anlaşıldığı anlamına gelmez. Karşılaştırma çıktıları araç önbelleğinde, seçilmiş sesin örnekleri teslim paketinde.

10 temiz WAV `assets/audio/narration/source/en/` altında, 10 düzenlenmiş mono MP3 `assets/audio/narration/en/` altında. FFmpeg zinciri: baştaki sessizliği kısaltma, perde/hız azaltma, 85 Hz–6,2 kHz filtreleme, 125/240 ms düşük seviyeli yankı, -19 LUFS / -2 dBTP hedefli normalizasyon, kısa giriş fade'i. MP3 22.050 Hz / 64 kbit/s. -19 LUFS bir üretim hedefidir; son MP3'lerin bağımsız ölçümleri XIX raporuna eklenir.

Ölçülmüş süreler: günlük 9,776 sn; taş 8,198 sn; dipte hareket 2,118 sn; yalnız değilsin 1,659 sn; siluet 2,527 sn; gözler 1,008 sn; uyanış 1,749 sn; tanıklık 1,723 sn; tanıklık sonu 2,246 sn; inkâr sonu 2,527 sn. Tüm zamanlı kayıtlar mevcut olay aralıklarına sığıyor. 3 MiB teslim bütçesi üretim betiğinde denetlendi.

`manifest.json` ve `js/narration-catalog.js` aynı üretim betiğinden çıkıyor. Metin kimliği, dil, öncelik, süre, dosya ve boyut kaydediliyor. `PROVENANCE.json` kesin model revizyonunu ve SHA-256 değerlerini, `MODEL_CARD.txt` resmi model kartını, `ATTRIBUTION.md` kaynak/işleme bilgilerini içeriyor. Tarayıcıya model veya TTS motoru yüklenmiyor.

Windows'ta çalışma alanının Unicode yolunu eSpeak C köprüsü okuyamadığı için yalnız fonem veri dosyaları ASCII adlı geçici araç klasörüne kopyalandı; kaynak dosyalar değiştirilmedi. Yeniden üretim betiği bu durumu kapsıyor.

Tamamlanmayan kabul: Kulaklık ve hoparlörde gerçek insan dinleme, telaffuz ve korku tonu değerlendirmesi. Bunlar XIX'te açıkça taşınıyor.
