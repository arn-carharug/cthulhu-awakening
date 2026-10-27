# Ritüel XXII — Gerçek Temas

28 Ekim 2026 · **Durum: Doğrulama bekliyor** (Geliştirme, birim ve süpürme/tünelleme regresyon testleri tamamlandı; bağımsız QA kabulü açıktır.)

## Sorun, son davranış ve önemli uygulama kararları

Eski uygulamada çarpışma mantığı yalnızca tek bir taş koordinatına özel statik mesafe kontrolü olarak `discovery-system.js` içinde gömülüydü. Tekne gövdesi (uzunluk ve genişlik) dikkate alınmadığından yüksek hız veya düşük kare hızlarında engellerin içinden geçebilme (tünelleme) riski vardı. Ayrıca tapınak sütunları için çarpışma geometrisi tanımlanmamıştı ve su altındaki durumla su üstüne çıkış anı arasında ayrım yoktu. Keşifler ise oyuncunun arkasında veya bir engelin arkasında kalsa dahi yalnızca düz mesafeyle tetiklenebiliyordu.

1. **Bağımsız Çarpışma Modülü (`js/collision-system.js`):**
   - Çarpışma ve görüş hattı denetimi genel bir engel kayıt sistemine bağlandı. Harici ağır fizik motoru eklenmeden, hafif ve deterministik süpürülmüş (swept) AABB/kapsül ve teğetsel kayma (tangential slide) algoritması geliştirildi.
   - Tekne gövde yarıçapı x ekseninde `2.0m`, z ekseninde `4.7m` (toplam 4m x 9.4m) olarak modellendi.
   - Taş (`[-9, -1.4, 17]`, yarıçap `1.25m`) her zaman katı engeldir.
   - Üç tapınak sütunu (`[-50, 0, -30]`, `[0, 0, -30]`, `[50, 0, -30]`, yarıçap `3.2m`) dinamik olarak yönetilir: Sütunlar su altındayken (`pillarsRiseY <= 0`) oyuncunun hareketini engellemez; sütunlar yükseldiğinde (`pillarsRiseY > 0`) katılaşır ve tekneye çarparak kaydırır.
   - Seyir günlüğü (`[12, -1.4, 5]`) su yüzeyinde sürüklenen bir nesne olarak katı engel yapılmadı; teknenin içinden geçebilmesi korundu.
2. **Tünelleme Önleme ve Çoklu Engel Çözümü:**
   - 30, 60 ve 120 FPS adım büyüklüklerinde ve ani büyük hız vektörlerinde tekne engeli delip geçemez.
   - İteratif çözümleme (en fazla 3 geçiş) ile bir engelden kaçınırken teknenin komşu bir engelin içine itilmesi engellendi.
   - Engelin içinde başlama durumunda (overlap recovery) tekne en kısa dış normal yönünde güvenli alana çıkarılır.
3. **Görüş Hattı ve Bakış Açısı Denetimi (Sight Cone & Raycast):**
   - Keşif etkileşimi (Seyir Günlüğü ve Taş) artık yalnızca mesafe (`<= 18m`) kuralına değil, oyuncunun bakış yönüne (`dot(cameraFront, toItem) >= 0.2`, yaklaşık 78.5 derecelik görüş konisi) ve engellerle örtülmeme (line-of-sight raycast) şartına bağlandı.
   - Oyuncunun arkasında kalan veya araya katı bir sütun/duvar giren keşifler etkileşime açılamaz.
   - Bağlamsal düğme, `F` tuşu ve tıklama aynı merkezi kuralı (`discoverySystem.isAvailable`) paylaştığı için tutarsızlık giderildi.

## Değişen modüller ve dosya eşlemesi

- `js/collision-system.js` (Yeni modül): Engelleri kaydeden, süpürülmüş çarpışma çözümleyen, sütun durumunu izleyen ve görüş hattı ışın testi yapan modül.
- `js/discovery-system.js`: Çarpışma denetimini `collision-system` modülüne devretti; bakış açısı ve görüş hattı denetimlerini `isAvailable`, `nearby` ve `inspect` fonksiyonlarına entegre etti.
- `main.js`: `CollisionSystem` örneğini başlattı; sütunların yükselme durumunu (`pillarsRiseY > 0`) çarpışma sistemine iletti; keşif kontrollerine kamera bakış vektörünü aktardı.
- `index.html`: `js/collision-system.js` komut dosyasını ekledi.
- `scripts/validate.js`: Statik doğrulamaya `js/collision-system.js` dosyasını ekledi.
- `scripts/ritual-08.test.js`: Test ortamına `collision-system` desteği ekledi.
- `scripts/ritual-22.test.js` (Yeni test paketi): Sütun aktif/pasif durumları, çoklu engel etkileşimi, 30/60/120 FPS tünelleme önleme ve görüş açısı/örtülenme kontrollerini doğrulayan 4 kapsamlı test.

## Çalıştırılan komutlar ve sonuçlar

- `node --check main.js; node --check js/collision-system.js; node --check js/discovery-system.js` → PASS
- `node scripts/validate.js` → PASS
- `node --test scripts/ritual-*.test.js` → PASS (**49/49 test geçti**, 0 hata, ~940 ms)
- `git diff --check` → PASS

## Bilinen kusurlar ve bağımsız QA'ya kalan işler

- Dinamik sütun yükselme anındaki çarpışma hissi ve teğetsel kaymanın akıcılığı bağımsız QA sırasında insan kontrolüyle hissedilmelidir.
- Karmaşık içbükey gövde geometrisi yerine silindirik/elips süpürülmüş gövde modeli kullanılmıştır; mevcut gemi boyutları için yeterli ve performanslıdır.
