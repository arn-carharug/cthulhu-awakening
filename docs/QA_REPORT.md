# Ritüel XXIX — Bağımsız Codex QA

28 Ekim 2026 · **Karar: FAIL. Doğrulama kapsamı kısmi.**

İncelenen teslim HEAD'i: `ec5296ef713fae41564284f4402edcebaf32a931`. Son uygulama commit'i: `f59525f`. Başlangıç karşılaştırması: `095b470`. QA başında çalışma ağacı temizdi. Bu çalışma yalnız QA raporu ve kanıt betikleri ekler; oyun kodu, AG raporları ve testleri değiştirilmedi.

AG'nin 63 testi geçti. Bağımsız sınır kontrolleri XXII, XXIII ve XXIV'teki zorunlu kabul davranışlarında eksik buldu. Bu nedenle yalnız test sayısına dayanarak kabul verilmedi. Doğrulanmış P0 veya normal rotayı genel olarak bitirmeyi engelleyen P1 iddiası yok; aşağıdaki somut P2 kusurlar ve açık testler teslimin koşulsuz kabulünü engelliyor.

## Bağımsız çalıştırılan kontroller

- Windows / Node **20.20.2**: 63/63 davranış testi PASS.
- Windows / Node **22.23.4**: 63/63 davranış testi PASS.
- Windows / Node **24.19.0**: 63/63 davranış testi PASS.
- `node scripts/validate.js`: beş OBJ/model buffer'ı ve gerekli statik dosyalar PASS.
- main.js, js/*.js ve scripts/*.js: `node --check` PASS.
- `git diff --check`: PASS.
- AG'nin mevcut test dosyalarındaki değişiklik incelendi; eski 08 test kapsamı silinmemiş, yeni modüller test yüklemesine eklenmiş.
- Gerçek yaşam döngüsü modülüyle, DOM/GPU sınırları taklit edilerek inkâr finali → duraklama → sonraki cycle / temiz witness durumu PASS.
- Bağımsız üretim modülü kontrolleri: [betik](qa/ag-delivery-probes.cjs), [ham sonuçlar](qa/AG_QA_PROBES.json). Betik üretim modüllerini yükler; gecikme/zaman ve ses sınırları kontrollüdür. Browser/WebGL görüntüsü üretmez.

Yeniden üretim:

```powershell
node --test scripts/ritual-*.test.js
node scripts/validate.js
node docs/qa/ag-delivery-probes.cjs
```

Son komut mevcut teslimde bulguları JSON'a yazar ve başarısız beklentiler nedeniyle **exit 1** döndürür. Bu, QA betiğinin çalışmaması anlamına gelmez. JSON'daki `pass` alanları ayrı ayrı okunmalı. Node 20/22 denemelerinde test dosyaları PowerShell üzerinden açık dosya listesi olarak iletildi; sonuçlar Windows testleridir, GitHub Actions/Ubuntu çalışması değildir.

## QA-F01 — P2: Çoklu çakışmadan kurtulma önceki engelin içine geri sokuyor

Dosya: [collision-system.js](../js/collision-system.js), özellikle son engel düzeltme döngüsü (125–140 civarı). Aynı algoritma discovery-system.js içindeki InternalCollisionSystem'de de kopyalı.

Yeniden üretim:

1. Gerçek CollisionSystem oluştur.
2. Mevcut taş `[-9, -1.4, 17]` yanında, `[-9, 0, 27]` konumuna yarıçapı 1,25 olan etkin ikinci engel ekle.
3. Başlangıç `[-9, 0, 22]`; hareket `[0, 0, 0]` ile içeride kalma kurtarmasını çağır.
4. Her engel için genişletilmiş gövde mesafesini ölç.

Beklenen: Son konum bütün etkin engellerin dışında veya tanımlanmış güvenli bir geri dönüş konumunda olmalı.

Gerçek: Son konum `[-9, 0, 21.049405]`. Yeni engel mesafesi 1,0001 iken mevcut taşın normalize mesafesi **0,680572**; 1'den küçük olduğu için tekne taşın içinde. Son engelden çıkarma, ilk engelin düzeltmesini bozuyor.

Sınır: İkinci engel bu QA senaryosunda eklendi. Mevcut doğal rotada bunun her oyuncuya olduğu veya normal dışarıdan yaklaşmada tünelleme bulunduğu iddia edilmiyor. Eksik olan, haritada açıkça istenen birden çok yakın engel + içeride kalma kurtarmasıdır.

AG düzeltmesi: Birlikte geçerli konum üreten çözüm/güvenli geri dönüş kullan; yalnız tek geçişli son projection'a dayanma. Bu başlangıç durumu ve aynı senaryonun sıralaması ters çevrilmiş hali regresyon testine girmeli.

## QA-F02 — P2: Ortak dünya konfigürasyonu gerçek tek kaynak değil

Dosyalar: [config.js](../js/config.js), [collision-system.js](../js/collision-system.js), [discovery-system.js](../js/discovery-system.js), navigation.js ve main.js'deki fallback tanımları.

Yeniden üretim ve sonuç:

- `GameConfig.world.journalPosition`: **[12, -1.4, 5]**.
- Gerçek `DiscoverySystem.sites` günlük konumu: **[8, -2.7, 43]**.
- Kontrollü birim bağlamında konfigürasyonun taş konumunu `[100, 0, 100]` yapıp yeni CollisionSystem oluştur: engel yine **[-9, -1.4, 17]** konumunda kuruluyor.
- DiscoverySystem içinde ayrı InternalCollisionSystem ve engel listesi bulunuyor. Geometri çözümü tek modüle taşınmış değil; aynı algoritma iki yerde tutuluyor.

Beklenen: Çizim, keşif ve çarpışma aynı dünya tanımını tüketmeli. Konfigürasyon sabitlerinin tesadüfen aynı değeri taşıması yeterli değil.

Etki: Yeni bir düzenleme tek kaynaktan yapılmış sanılırken çarpışma, etkileşim ve görünüm ayrışabilir. Bugünkü günlük için hangi konumun geçerli olduğu da konfigürasyonla çelişiyor. Mevcut geometriyi keyfî biçimde değiştirmek yerine önce gerçek konumu koruyacak ortak tanımı düzelt.

AG düzeltmesi: Gerçek modül tüketimini ortak veriye bağla; kopya algoritmayı kaldır veya gerçekten ortaklaştır. Test, yalnız sabit değerleri karşılaştırmak yerine değiştirilmiş dünya tanımıyla modüllerin aynı sonucu verdiğini kontrol etmeli.

## QA-F03 — P2: Decode zaman aşımı Loading durumunu temizlemiyor, geç kayıt yine başlıyor

Dosya: [narration-system.js](../js/narration-system.js), zamanlayıcı 149–156, decode ve başarılı sonuç yolu 174–195 civarı.

Yeniden üretim:

1. Gerçek NarrationSystem'de bir keşif kaydını `modal: true` ile başlat.
2. Fetch ve arrayBuffer tamamlanır; decodeAudioData kontrollü olarak bekletilir.
3. 15 saniyelik zaman aşımı callback'ini tetikle.
4. Sonra decode'u başarıyla tamamla.

Beklenen: Zaman aşımı güncel isteği ve yükleniyor durumunu sonlandırmalı; gecikmiş sonuç artık oynatılmamalı.

Gerçek: Callback yalnız AbortController'ı iptal ediyor. Decode iptal sinyalini tüketmediği için `current` hâlâ discovery.journal, durum hâlâ **Loading narrator…**. Decode sonra tamamlanınca sonuç **true**, ses başlangıcı **1** oluyor. Modal TTL sonsuz olduğu ve başarılı yolda `timedOut/signal.aborted` kontrol edilmediği için süre aşılmış istek kabul ediliyor. Decode hiç dönmezse Loading durumu da kalıyor.

AG düzeltmesi: Zaman aşımında isteği geçersizleştirip UI/kaynağı temizle; başarılı yol bütün async sınırlarından sonra aynı geçerlilik kontrolünü yapmalı. Decode'un AbortController ile iptal edilebildiğini varsayma. Hem hiç dönmeyen hem geç dönen decode testi ekle; pause'a göre geçerlilik süresi ile duvar saati ağ zaman aşımını ayrı tanımla.

## QA-F04 — P2: Sıfır tahsis/GC iddiası kod ve test kapsamıyla desteklenmiyor

Dosya: [scene-renderer.js](../js/scene-renderer.js), getCameraPosition (232 civarı), getFPSTorchMatrix (289 civarı); ayrıca main.js'deki çizim yardımcı çağrıları. İlgili test: scripts/ritual-25.test.js.

Gerçek üretim yardımcılarıyla 60 kamera/fener hesaplama iterasyonunda:

- mat4.create: **60**.
- vec3.create: **120**.
- vec3.clone: **240**.

Bu **420** tahsis, rapordaki “kare içi dinamik matris/vektör tahsisi sıfır” iddiasını karşılamıyor. Sayaç gerçek gl-matrix fonksiyonlarını sarmalayıp çağırır; matris hesabını kaldırmaz. Ölçüm bütün bir tarayıcı frame profili değil, çizimde gerçekten kullanılan yardımcıların alt kümesidir.

Mevcut XXV testi FRAME_BUFFERS'ın varlığını ve değişmeyen pusula metninin tekrar yazılmamasını denetliyor; adı tahsislerin ortadan kalktığını söylese de helper tahsislerini saymıyor. README'deki GC sıçramalarının kaldırıldığı ifadesi için de GC/profiler kaydı yok.

AG düzeltmesi: Ölçümün gösterdiği gerekli yardımcı tahsisleri azalt veya iddiayı yapılan gerçek optimizasyonla sınırla. Sıfır tahsis zorunlu ürün hedefi değildir; ölçülmüş darboğaz ve doğrulanabilir önce/sonra sonuç zorunludur. Gerçek çağrı zincirini ölçen test/profil ve koşulları rapora ekle.

AG'nin FPS/p95 JSON snapshot'ları mevcut; değerler aritmetik olarak raporla uyumlu. **+%141,5 FPS** ve **60 FPS hedefinin karşılandığı** sonucu bu QA'da bağımsız yeniden ölçülemedi. Bu nedenle onaylanmadı; snapshot bulunması tek başına sebebin GC olduğunu göstermez.

## QA-F05 — P2: Reset, bekleyen ses etkinleştirme/yeniden okuma devamını iptal etmiyor

Dosya: [scene-lifecycle.js](../js/scene-lifecycle.js), replayNarration 239–246 civarı.

Yeniden üretim:

1. Günlük kartını aç; Read aloud akışını başlat.
2. `audio.enable()` promise'ini beklet.
3. Kartı kapat ve turu resetle.
4. Eski enable promise'ini tamamla.

Beklenen: Eski kart/tur için yeniden okuma isteği artık geçersiz olmalı.

Gerçek: Kart kapalı ve reset tamamlanmışken `narrator.play('discovery.journal', { modal: true, repeat: true })` çağrılıyor. Narrator'ın kendi reset token'ı burada yeterli değil: eski play çağrısı resetten **sonra** yaratılıyor.

Kanıt: Gerçek SceneLifecycle metodu ve sahne adaptörü çalıştırıldı; ses etkinleştirme ve oynatıcı sınırı kontrollü tutuldu. Bu kontrol sesin insan tarafından duyulduğu iddiası üretmez; resetten sonra yapılan eski oynatma çağrısını kanıtlar.

AG düzeltmesi: Async enable öncesi tur/kart isteği kimliğini yakala, await sonrası tekrar denetle. Kart kapanması/reset/yeni tur bekleyen replay isteğini de geçersizleştirmeli. Bu yarış eski sürümde de bulunuyordu; AG'nin eklediği bir regresyon olarak etiketlenmiyor, korunması istenen reset sözleşmesinin açık kusuru olarak raporlanıyor.

## QA-F06 — P3: Teslim belgelerinde yanlış doğrulama ve kapsam ifadeleri

- RITUAL_28_REPORT.md, `node --check .github/workflows/ci.yml` ile YAML doğrulandığını söylüyor. Aynı komut **ERR_UNKNOWN_FILE_EXTENSION / exit 1** veriyor. Bu bulgu CI YAML'ının bozuk olduğunu kanıtlamaz; raporlanan doğrulama yöntemi yanlıştır.
- AG_DELIVERY.md içindeki **9** yerel Markdown bağlantısı `docs/docs/...` altına çözülüyor ve hedef bulunamıyor. Örneğin docs altındaki belgeden `docs/rituals/...` yerine `rituals/...` gerekir.
- AG_DELIVERY.md, XXVII'yi “derin deniz simülasyonu” olarak tanımlıyor. Asıl kapsam alamete bağlı küçük tekrar oynama olaylarıydı; su altı/derin deniz bölümü açıkça kapsam dışıydı. Ertelenen işin tanımı düzeltilmeli.
- README test açıklaması 60 diyor; teslimde ve bağımsız koşuda sayı 63. Raporların gerçekten ölçülen sürüm/komutla eşleşmesi gerekir.

## Çalıştırılmayan ve açık kalan QA

Canlı localhost sekmesine erişim, bu oturumda browser security policy tarafından reddedildi. Aynı sayfaya başka tarayıcı yüzeyi, ham CDP, headless araç veya dolaylı yöntemle erişilerek engel aşılmadı. Bu teknik engel uygulama açılış hatası olarak yorumlanmıyor.

Bu nedenle aşağıdakiler **ÇALIŞTIRILMADI / AÇIK**:

- Normal Chrome/Edge/Firefox × dört alamet × iki son: 24 doğal tarayıcı rotası.
- Yeni HUD'ın gerçek görüntüsü, %200 büyütme, dar ekranda odak ve kontrol erişimi.
- Gerçek WebGL shader çizimi, ses izinleri/oynatımı, fare kilidi, OS odağı ve sekme görünürlüğü geçişleri.
- Kontrollü soğuk yükleme/yavaş ağ ve karşılaştırılabilir FPS/p95 yeniden ölçümü.
- Gerçek alt dizin dağıtım paketiyle tarayıcı açılışı. HTML göreli yol testi geçiyor; bu tam dağıtım çalıştırması değil.
- Uzak GitHub Actions çalışması. Yerel Node 20/22 testi bunun yerine sayılmıyor.
- Yeni ses dosyası üretilmediği/değişmediği için ses üretimi ve ses ölçüm kanıtı yeniden yazılmadı. İnsan dinleme ve üç yeni oyuncu kabulü yapılmadı.

## AG'ye düzeltme ve tekrar test sırası

1. QA-F01, QA-F03 ve QA-F05 için davranış düzeltmeleri ve yarış/sınır testleri.
2. QA-F02 ortak geometri tüketimini düzelt; mevcut nesne yerlerini değiştirmeden tutarlılık sağla.
3. QA-F04 performans iddialarını gerçek kapsamla eşleştir; gerekiyorsa hedefli optimizasyon ve uygun profilleme.
4. QA-F06 rapor/bağlantı/kapsam düzeltmeleri.
5. Ayrı commit'ler ve güncel AG_DELIVERY.md ile yeni kod SHA'sını teslim et. İlgili testler ve bağlantılı regresyonlar Codex tarafından tekrar çalıştırılacak.

Mevcut teslim için tam QA PASS veya yayına hazır onayı verilmedi. Uygulama kodu bu QA çalışmasında düzeltilmedi; geliştirme sorumlusu AG olarak kaldı.
