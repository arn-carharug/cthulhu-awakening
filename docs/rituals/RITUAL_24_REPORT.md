# Ritüel XXIV — Ayrılan Düğümler

28 Ekim 2026 · **Durum: Doğrulama bekliyor** (Geliştirme, modüler mimari ayrımı ve otomatik regresyon testleri tamamlandı; bağımsız QA kabulü açıktır.)

## Sorun, son davranış ve önemli uygulama kararları

Eski yapıda `main.js` 1900 satırı aşan monolitik bir dosya haline gelmişti; WebGL çizim döngüsü, kullanıcı arayüzü olay dinleyicileri, klavye/fare etkileşimleri, sahne durum yönetimi (pause, reset, uyanış, sonlar) ve dünya koordinatları tek bir dosyada birbirine karışmıştı. Ayrıca dünya koordinatları (`ruinsPosition`, `pillarPositions`, `stonePosition`) `main.js`, `discovery-system.js`, `navigation.js` ve `collision-system.js` arasında dağınık ve kopyalanmış durumdaydı. Testler ise sahne fonksiyonlarını test edebilmek için `main.js` kodunu metin düzeyinde keserek (`source.slice`) yüklemek zorunda kalıyordu.

1. **Ortak Dünya ve Geometri Tanımı (`js/config.js`):**
   - `GameConfig.world` altına tüm dünya koordinatları ve engel geometrileri tek kaynak olarak toplandı:
     - Başlangıç tekne konumu: `[10, 0, 60]`
     - R'lyeh / Tapınak merkezi: `[0, 0, -30]`
     - Üç tapınak sütunu: `[-50, 0, -30]`, `[0, 0, -30]`, `[50, 0, -30]` (yarıçap: `3.2m`)
     - İşaret taşı: `[-9, -1.4, 17]` (yarıçap: `1.25m`)
     - Seyir günlüğü: `[12, -1.4, 5]`
     - Tekne gövde sınırları: `rx = 2.0m`, `rz = 4.7m`
     - Cthulhu modeli ölçeği: `25`
   - Çarpışma sistemi (`CollisionSystem`), navigasyon (`VoyageNavigation`), keşifler (`DiscoverySystem`) ve çizici bu ortak tanımı kullanarak koordinat tutarsızlığını ve kopyalamayı ortadan kaldırdı.
2. **Tek Durum ve Yaşam Döngüsü Kaynağı (`js/scene-lifecycle.js`):**
   - Duraklatma (`setPaused`), sıfırlama (`reset`), uyanışı başlatma (`startAwakening`), iki sonun seçimi ve onaylanması (`openEndingChoice`, `resolveEnding`), not okuma (`inspectDiscovery`, `closeDiscovery`), pusula ve fener etkileşimleri `SceneLifecycle` sınıfında toplandı.
   - UI ve simülasyon arasındaki durum bayrağı kopuklukları engellendi.
3. **Giriş ve Arayüz Bağlayıcı (`js/scene-interaction.js`):**
   - Fare hareketi, tekerlek, klavye tuşları (WASD, yön tuşları, ESC, Tab, P, R, E, L, B, F, M, N), fare kilidi yakalama ve arayüz düğmelerinin olay dinleyicileri `SceneInteraction` modülüne taşındı.
   - `bind()` ve `unbind()` metotları ile modüllerin yeniden bağlanması durumunda olay dinleyicilerinin katlanması/sızıntısı önlendi.
4. **Çizim Hattı ve Matematik Ayrımı (`js/scene-renderer.js`):**
   - WebGL VAO/VBO üretimi, dinamik su ızgarası (`createWaterGrid`, `rebuildWaterMesh`), parçacık tamponları (`rebuildAtmosphere`), doku yönetimi (`refreshTextures`), kamera matrisleri, dalga/tekne hareketi hesaplamaları ve fare ışınlama (raycasting) algoritmaları bu modüle devredildi.
5. **Ana Birleştirici ve Temiz Test Erişimi (`main.js`):**
   - `main.js` artık modülleri bir araya getiren, simülasyon adımlarını (`advanceScene`) ve WebGL karelerini koordine eden hafif bir orkestratördür.
   - Testlerin metin kesme zorunluluğunu kaldıran `window.createSceneRuntime()` arayüzü sunuldu; aynı zamanda eski testlerle tam geriye uyumluluk için `// BOOTSTRAP` ayracı ve yönlendirici işlevler korundu.

## Değişen modüller ve dosya eşlemesi

- `js/config.js`: `GameConfig.world` ortak koordinat ve geometri nesnesi eklendi.
- `js/scene-lifecycle.js` (Yeni modül): Duraklatma, reset, uyanış, sonlar ve keşif kartları yaşam döngüsü.
- `js/scene-interaction.js` (Yeni modül): Klavye, fare, pointer lock ve DOM UI kontrollerinin dinleyicileri.
- `js/scene-renderer.js` (Yeni modül): WebGL VAO üretimi, su/parçacık oluşturma, kamera ve ışık matematiği.
- `main.js`: Monolitik kod refaktör edildi, modüller bağlandı, ileriye/geriye uyumlu yönlendiriciler eklendi.
- `index.html`: `js/scene-lifecycle.js`, `js/scene-renderer.js`, `js/scene-interaction.js` komut dosyaları eklendi.
- `scripts/validate.js`: Statik dosya denetim listesine yeni modüller eklendi.
- `scripts/ritual-08.test.js`: VM çalışma ortamına yeni modüller eklendi.
- `scripts/ritual-24.test.js` (Yeni test paketi): Ortak dünya koordinatları, `SceneLifecycle` durum tutarlılığı ve `SceneInteraction` dinleyici çoğalması önlemini doğrulayan 3 test.

## Çalıştırılan komutlar ve sonuçlar

- `node --check js/scene-lifecycle.js; node --check js/scene-renderer.js; node --check js/scene-interaction.js; node --check main.js` → PASS
- `node scripts/validate.js` → PASS
- `node --test scripts/ritual-*.test.js` → PASS (**57/57 test geçti**, 0 hata, ~1090 ms)
- `git diff --check` → PASS

## Bilinen kusurlar ve bağımsız QA'ya kalan işler

- Klavye odak sırası ve tarayıcı sekmesi geçişlerinde fare kilidinin serbest bırakılması bağımsız QA (Ritüel XXIX) matrisinde gerçek tarayıcılarda test edilmelidir.
