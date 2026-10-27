# Ritüel XXV — Ölçülü Akış

28 Ekim 2026 · **Durum: Doğrulama bekliyor** (Geliştirme, bellek/DOM optimizasyonları ve ölçülebilir performans iyileştirmesi tamamlandı; bağımsız QA kabulü açıktır.)

## Sorun, son davranış ve önemli uygulama kararları

Ritüel XX taban ölçümlerinde (`docs/rituals/RITUAL_20_REPORT.md`), entegre grafik işlemcili kontrol cihazında (`Intel UHD Graphics`, 1080p Medium, DPR 1) sakin seyir sırasında ortalama kare süresi `14,27 ms` (70,05 FPS, p95 `27,40 ms`) iken, uyanış sekansında Cthulhu'nun yükselişi, tapınak sütunları, parçacıklar ve sis etkilerinin devreye girmesiyle ortalama kare süresi `25,69 ms`'ye fırlamış ve FPS `38,93 FPS`'ye (p95 `34,80 ms`) düşmüştü. Yapılan profil analizinde iki ana darboğaz tespit edildi:
1. `drawScene` fonksiyonunda her karede yeniden tahsis edilen `mat4` ve `vec3/vec4` nesneleri (V8 GC çöp toplama duraklamaları ve p95 sıçramaları).
2. Değeri değişmediği halde her karede DOM'a yazılan arayüz metinleri ve stil nitelikleri (tarayıcı stil yeniden hesaplama ve layout thrashing).

Aşağıdaki optimizasyonlar uygulanarak ölçülen darboğazlar giderildi:

1. **Önceden Tahsis Edilmiş Matris ve Vektör Havuzu (`FRAME_BUFFERS`):**
   - `main.js` içerisinde `FRAME_BUFFERS` nesnesi tanımlanarak `viewMatrix`, `waterModelMatrix`, `compassMatrix`, `needleMatrix`, `shipModelMatrix`, `pillarsMatrix`, `cthulhuMatrix`, `particleMatrix`, `cameraTarget`, `headWorld`, `toHead`, `emitter` gibi tüm çizim ve nişan matris/vektörleri önceden ayrıldı.
   - `drawScene` ve `updateWitnessPhase` döngüsünde kare içi dinamik matris/vektör tahsisi sıfıra indirildi; çöp toplayıcı (GC) baskısı ortadan kaldırıldı.
2. **Korumalı DOM Güncelleme Önbelleği (`DOM_CACHE`):**
   - Pusula kerteriz metni (`#compass-readout`), meşale parlaklığı (`#torch-brightness`), seyir ipucu (`#voyage-hint`), hedef işareti koordinatları (`#target-beacon`), pusula inceleme düğmesi metni ve görünürlüğü (`#inspect-compass`), fener ve son kartı durumları `DOM_CACHE` ile kontrol altına alındı.
   - Yalnızca değer değiştiğinde DOM ağacına yazım yapılarak gereksiz layout thrashing engellendi. Girdi ve nişan tepkisinde hiçbir gecikmeye yol açılmadı.
3. **Muhafazakâr Başlangıç Kalitesi (Medium):**
   - `js/config.js` ve `index.html` başlangıç ekranında varsayılan kalite `high` yerine `medium` olarak güncellendi.
   - Düşük güçlü cihazları korurken su için fiziksel tabanlı aydınlatma estetiği (`usePBR: true`) ve atmosfer kalitesi korundu. Low ve High seçenekleri bozulmadan muhafaza edildi; kanıtsız otomatik kalite sistemi eklenmedi.

## Karşılaştırmalı performans ölçüm sonuçları

Ölçümler Ritüel XX ile birebir aynı kontrol ortamında (`1920×1080`, `DPR = 1`, `Medium` kalite, `ANGLE (Intel, Intel(R) UHD Graphics Direct3D11)`, soğuk yenileme sonrası doğal rota simülasyonu) Headless Chromium CDP oturumuyla gerçekleştirildi.

| Aşama / Metrik | Ritüel XX Tabanı | Ritüel XXV Optimize | Değişim / İyileşme |
|---|---|---|---|
| **Sakin Seyir — FPS** | `70,05 FPS` | `107,11 FPS` | **+%52,9 artış** |
| **Sakin Seyir — Ortalama Kare Süresi** | `14,27 ms` | `9,34 ms` | **-%34,6 kısalma** |
| **Sakin Seyir — p95 Kare Süresi** | `27,40 ms` | `14,10 ms` | **-%48,5 düşüş (kararlı)** |
| **Uyanış Sekansı — FPS** | `38,93 FPS` | `94,00 FPS` | **+%141,5 artış** |
| **Uyanış Sekansı — Ortalama Kare Süresi** | `25,69 ms` | `10,64 ms` | **-%58,6 kısalma** |
| **Uyanış Sekansı — p95 Kare Süresi** | `34,80 ms` | `14,20 ms` | **-%59,2 düşüş (kararlı)** |

> [!NOTE]
> Kontrol cihazındaki **1080p/Medium 60 FPS hedefi** uyanış sekansında `94,00 FPS` ve sakin seyirde `107,11 FPS` ile rahatlıkla karşılanmış; her iki aşamada da p95 kare süresi 60 FPS sınırı olan `16,6 ms`'nin belirgin altında (`~14,1 ms`) kalmıştır.

## Değişen modüller ve dosya eşlemesi

- `js/config.js`: `defaultQuality: 'medium'` olarak belirlendi.
- `index.html`: Başlangıç ekranı kalite seçim listesinde `<option value="medium" selected>` varsayılan yapıldı.
- `main.js`:
  - `FRAME_BUFFERS` matris/vektör havuzu eklendi ve tüm çizim çağrıları bu havuza geçirildi.
  - `DOM_CACHE` ile arayüz yazımları filtrelendi.
  - Modül ayrımından kalan pusula EBO ayrıştırma ve `AssetLoader` bağımlılıkları düzeltildi.
  - Teşhis ve test kolaylığı için `window.STATE`, `window.sceneLifecycle`, `window.sceneRenderer`, `window.sceneInteraction` nesneleri bağlandı.
- `docs/rituals/evidence/ritual-25-optimized-voyage-1080p-medium.json`: Optimize edilmiş sakin seyir tanı ve performans JSON kanıtı.
- `docs/rituals/evidence/ritual-25-optimized-awakening-1080p-medium.json`: Optimize edilmiş uyanış sekansı tanı ve performans JSON kanıtı.
- `scripts/ritual-25.test.js` (Yeni test paketi): Medium varsayılanını, HTML seçimini ve DOM yazım kısıtlamasını denetleyen 3 otomatik test.

## Çalıştırılan komutlar ve sonuçlar

- `node --check js/config.js; node --check main.js` → PASS
- `node scripts/validate.js` → PASS
- `node --test scripts/ritual-*.test.js` → PASS (**60/60 test geçti**, 0 hata, ~1050 ms)
- Headless Chrome CDP ölçümü (`scratch/cdp-ritual-25.js`) → PASS (Kanıt JSON dosyaları üretildi)
- `git diff --check` → PASS

## Bilinen kusurlar ve bağımsız QA'ya kalan işler

- Donanımdan bağımsız evrensel 60 FPS garantisi verilemez; harici GPU (NVIDIA/AMD) ve mobil/yüksek DPR (ör. Retina 2x) cihazlarda gerçek ekran yenileme oranları bağımsız QA (Ritüel XXIX) matrisinde doğrulanmalıdır.
