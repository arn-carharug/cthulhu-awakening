# Ritüel XXIII — Zamanında Gelen Fısıltı

28 Ekim 2026 · **Durum: Doğrulama bekliyor** (Geliştirme, birim ve zaman aşımı regresyon testleri tamamlandı; bağımsız QA kabulü açıktır.)

## Sorun, son davranış ve önemli uygulama kararları

Yavaş ağ veya arka plan sekme gecikmelerinde anlatıcı ses dosyasının getirilmesi (fetch) ve çözümlenmesi (decodeAudioData) geciktiğinde, olay anı çoktan geçmiş bir uyanış cümlesinin daha sonra çalarak yeni sahnenin altyazısını ezmesi veya yersiz konuşması riski giderildi. Ayrıca dünya duraklatıldığında (pause) geçen sürenin sesin geçerlilik süresini haksız yere tüketmemesi sağlandı.

1. **Olay Türüne Göre Geçerlilik Süresi (TTL / Validity Window):**
   - Uyanış cümleleri için olay aralıklarına ve metin uzunluklarına uygun TTL süreleri tanımlandı:
     - `awakening.rumble`: 10.0 saniye
     - `awakening.presence`: 4.8 saniye
     - `awakening.silhouette`: 9.8 saniye
     - `awakening.eyes`: 6.8 saniye
     - `awakening.reveal`: 5.8 saniye
     - `witness.begin`: 8.0 saniye
   - Not ve final sesleri (`discovery.*`, `ending.*`) modal pencereler olduğundan oyuncunun okuma hızına müdahale etmemek için varsayılan olarak sonsuz geçerliliğe (`Infinity`) sahiptir.
2. **Aktif Zaman ve Duraklatma Güvencesi:**
   - Süre, fetch/decode bitiminden değil istek (`play()`) anından itibaren aktif oyun zamanı üzerinden ölçülür.
   - `updatePauseTracking()` ve `getActiveTime()` ile dünya duraklatıldığında geçen süreler (`totalPausedDuration`) aktif zamandan düşülür. Örneğin fetch sırasında 20 saniye duraklatılan bir oyun açıldığında, aradan 20 saniye geçmiş olsa bile aktif süre tükenmediği için ses iptal edilmez ve başarıyla konuşur.
3. **Eski Cümlenin Yeni Altyazıyı Ezmesinin Engellenmesi:**
   - Yavaş fetch veya decode sonrasında `isStale(clip)` denetimi yapılır. Geçerlilik süresi dolmuşsa ses çalınmaz, altyazı (`onCaption`) tetiklenmez, durum metni temizlenir ve `play()` sessizce `false` döner.
   - Yeni bir cümle istendiğinde eski cümlenin `AbortController` sinyali iptal edilir; eski cümlenin gecikmiş cevabı yeni cümlenin altyazısını veya sesini asla değiştiremez.
4. **Sonsuz "Loading narrator…" Durumunun Önlenmesi:**
   - TTL ve güvenlik tavanına dayalı zaman aşımı ile ağ takılmalarında anlatıcının yükleme durumunda takılı kalması engellendi. Ağ hatası durumunda yazılı metnin her zaman erişilebilir olduğu durumu korunur.
5. **İki Sonun ve Akışın Bağımsızlığı:**
   - Ses dosyasının yokluğu, gecikmesi veya hatası sahne zaman çizelgesini (`SceneTimeline`), keşif kartlarını veya son seçimlerini (`ending:shown`, `#ending-continue`) asla durdurmaz veya engellemez.

## Değişen modüller ve dosya eşlemesi

- `js/narration-system.js`: Olay bazlı TTL tablosu, aktif zaman ve duraklatma takibi (`getActiveTime`), aşamalı bayatlık kontrolü (`isStale`), zaman aşımı koruması ve güvenli iptal mantığı.
- `scripts/ritual-23.test.js` (Yeni test paketi): Gecikmiş fetch bayatlığı, gecikmiş decode bayatlığı, duraklatma süresinin aktif zamandan düşülmesi, eski cümlenin yeni altyazıyı ezmemesi ve modal hatasızlığı doğrulayan 5 kapsamlı test.

## Çalıştırılan komutlar ve sonuçlar

- `node --check js/narration-system.js` → PASS
- `node scripts/validate.js` → PASS
- `node --test scripts/ritual-*.test.js` → PASS (**54/54 test geçti**, 0 hata, ~1020 ms)
- `git diff --check` → PASS

## Bilinen kusurlar ve bağımsız QA'ya kalan işler

- İngilizce 10 ses kaydının kulaklık/hoparlör dengesi, telaffuz ve atmosfer hissi bağımsız QA'da insan dinlemesiyle değerlendirilmelidir.
- Gelecekteki Türkçe seslendirme paketi (Ritüel XXVI) kullanıcı ses kayıtları hazır olana kadar ayrık ve ertelenmiş durumdadır.
