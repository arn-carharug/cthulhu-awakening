# Ritüel XIV — Hafifleyen Yük

18 Ekim 2026 · Kod ve ölçüm altyapısı uygulandı; son karşılaştırma XV'te.

## Dağıtım varlıkları

Sekiz aktif kaynak doku **36.334.252 bayt / 34,65 MiB** idi. Özgün dosyalar korunarak yüksek kalite **5.619.408 bayt / 5,36 MiB**, düşük kalite **534.570 bayt / 0,51 MiB** WebP varyantları oluşturuldu. Yüksek kalite indirme boyutu yaklaşık **%84,5** azaldı. Bu dosya boyutudur; GPU bellek tasarrufu iddiası değildir. Metal/roughness/AO kanalları kayıpsız kodlandı; renkler yüksek kalitede 88, düşükte 78 kalite ile kodlandı.

Yüksek kalite renk dokuları en fazla 2048, düşük kalite 512 piksel. `scripts/optimize-textures.py` + Pillow ile yeniden üretilebilir; manifest boyut ve çözünürlükleri saklar. Orta kalite yüksek kalite dokularını, daha düşük deniz/partikül/DPR ayarlarıyla kullanır. Düşük kalite ayrı küçük dosyaları yükler; çalışma anındaki kalite değişimi de dokuları yeniler ve eski GPU dokularını siler. Başarısız/eski isteklerde yeni geçici kaynaklar temizlenir.

## Başlangıç ve hata davranışı

Oyun açılışında kalite seçilir, Begin voyage ile varlık yükleme başlar. gl-matrix **3.4.3** ve MIT lisansı yerelde tutuluyor; harici script yok. Eksik varlık/başlangıç hatası veya WebGL context kaybında açıklama ve Reload scene yolu gösterilir. Context kaybında simülasyon/ses durur; otomatik belirsiz kurtarma yerine kullanıcı yeniden yükler.

## Doğrulama

29 otomatik test PASS. Yeni testler varyantların gerçekten farklı dosya ve boyutlara sahip olmasını, yüksek kalitenin 12 MiB altında kalmasını, yerel matematik kütüphanesinin API'sini/lisansını, başarısız doku yüklemesinde GPU temizliğini ve context kaybı işleyicisinin sahneyi durdurup hata göstermesini kapsıyor. Statik doğrulama tüm varyantların WebP imzasını kontrol ediyor.

Gerçek tarayıcı yüksek kalite başlangıcı: viewport 1280×720, DPR≈1, render1280×720, yükleme 1384,8 ms; son 600 kare p95 7,4 ms, son örnek penceresi 134,29 FPS. Kaynak: `evidence/ritual-14-high.json`. VIII örneğinin render boyutu1600×900 ve DPR1,25 idi; FPS farkını yalnız bu değişikliğe bağlamak doğru değildir. Önbellek kontrollü değildi; bu ölçüm soğuk yükleme değildir. Görsel kayıt: `evidence/ritual-14-high.jpg`.

1080p/medium, düşük kalite yükleme ve son görsel kontroller XV raporuna yazılacak. Görsel kalite için insan onayı ve GPU donanımı ölçümü açık; başarı iddiası yapılmadı.
