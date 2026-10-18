# Cthulhu Awakening — Araştırma ve geliştirme önerisi

Tarih: 18 Ekim 2026 · İncelenen sürüm: `de31a8e` (`ritual_7`)

Durum: Araştırma ve öneri kaydı. Uygulama sırası, kapsamlar ve kapanış ölçütleri [Ritüel yol haritası](RITUAL_ROADMAP.md) içinde VIII–XV olarak düzenlendi; güncel plan için o belge esas alınır. Başka bilgisayardaki önceki sohbetin yol haritası bulunamadı. Oyun kodu değiştirilmedi.

## Önerilen ürün yönü

Tek teknede, pusula ve fener etrafında gelişen, ilk oynanışı yaklaşık 5–10 dakika hedefleyen kısa bir kozmik korku deneyimi. Bu süre tasarım hedefidir; mevcut oyunda ölçülmedi. Önce kontrolleri güvenilir hale getirip oyuncuya keşif ve final üzerinde küçük ama anlamlı kararlar vermek; ardından görsel ayrıntıyı artırmak.

Araştırma geliştirici/yayıncı sayfaları ve teknik belgeler üzerinden yapıldı. Referans oyunlar bu çalışma sırasında oynanmadı. Aşağıdaki tasarım dersleri kaynaklardaki açıklamalardan çıkarılan önerilerdir; başarılı olacakları kullanıcı testiyle doğrulanmalıdır.

## Emsaller ve projeye aktarılabilecek dersler

- **[Iron Lung](https://store.steampowered.com/app/1846170/Iron_Lung/):** Resmî açıklama sınırlı duyular, eksik harita, sensörler, ses ve fotoğraf üzerinden yön bulmayı vurguluyor. Çıkarım: Pusula yalnızca hareket kilidini açmasın; yön ve yaklaşan anomali hakkında işe yarayan, zaman zaman güvenilmez bilgi versin. Yaratığı uzun süre açıkta tutmak yerine ses, iz ve siluetle hazırlayalım.
- **[DREDGE](https://www.dredge.game/):** Keşif, buluntu toplama, tekne geliştirme ve yerel hikâyeler etrafında açık bir faaliyet döngüsü sunuyor. Çıkarım: R'lyeh'e gidişi boş yolculuktan çıkaracak iki küçük keşif noktası ekleyelim; balıkçılık ekonomisini veya geniş haritayı taşımayalım.
- **[Sunless Sea](https://www.failbettergames.com/games/sunless-sea):** Geliştirici keşif, yalnızlık, hikâye ve tehlikeyi temel olarak tanımlıyor. Çıkarım: Birkaç kısa çevresel metin ve oyuncunun verdiği son karar, yeni sistem yığınından daha uygun bir başlangıç olabilir.
- **[Water Womb World](https://pantagruel.itch.io/water-womb-world):** Yaklaşık 15 dakikalık deneyimde deniz tabanını keşfetme, balık yakalama, nesne bulma ve inceleme gibi somut eylemler var. Çıkarım: Mevcut sinematik sekansın öncesine kısa, elle yapılan bir keşif/inceleme eylemi eklemek oyuncunun katılımını artırabilir.
- **[Weird Lake Fisherman](https://zeoce.itch.io/weird-lake-fisherman):** HTML5 olarak sunulan küçük bir projede sakin başlangıç, geceyle değişen atmosfer ve fener ilerlemesi var. Tarayıcıda küçük kapsam karşılaştırmasıdır; kalite veya ticari başarı ölçütü olarak kullanılmadı. Çıkarım: Kısa tarayıcı deneyiminde okunabilir bir ana eylem ve belirgin atmosfer değişimi yeterli bir temel olabilir.
- **[Three.js Ocean](https://threejs.org/examples/webgl_shaders_ocean.html):** Tarayıcıdaki deniz görünümü için teknik referans. Three.js'e geçiş önerilmiyor; mevcut WebGL 2 altyapısında dalga, ışık ve ufuk bütünlüğü karşılaştırılabilir.

## Mevcut koddan doğrulanan durum

- Ritual I–VII ile kalite ayarları, olay sistemi, 42 saniyelik uyanış, ses, final, tur istatistikleri ve dört alamet mevcut.
- `node scripts/validate.js` ve `node --check main.js` geçti. Bu kontroller shader derlemesini, ses çıkışını veya oynanabilirliği doğrulamıyor.
- Hareket `main.js:394` sonrasındaki `keydown` işleyicisinde olay başına sabit mesafeyle yapılıyor. Tuş tekrarı ayarı hızı etkileyebilir.
- Final kartı zamanlayıcıyla açılıyor; `exitPointerLock` çağrısı yok. Fare kilitliyken düğmeleri kullanmak için Escape gerekiyor.
- Hareket azaltma tercihi yalnızca bazı CSS animasyonlarını kapatıyor; JavaScript kamera/tekne hareketi tercihi okumuyor.
- Alamet seçimi deterministik fakat tekrar engellemiyor: 2., 3. ve 4. tur `hollow-calm`. Test yalnızca 1. ve 2. turun farklılığını denetliyor. Tekrarın hata sayılıp sayılmayacağı ürün kararıdır; mevcut test mesajı tekrarın istenmediğini düşündürüyor.
- `resetScene` pusula inceleme modunu kapatıyor ama `compassYaw` ve `compassPitch` değerlerini sıfırlamıyor. İnceleme sırasında resetlenirse sonraki incelemeye dönüş kalabilir.
- Tekne dalgalanması zaman temelli; su shader'ı ayrıca konum bileşenleri ve uyanış şiddeti kullanıyor. Ortak dalga örneklemesiyle eşleşme iyileştirilmeli; görsel sorun düzeyi tarayıcıda ölçülmedi.
- Aktif yükleme listesindeki sekiz doku dosyasının toplam disk boyutu **34,65 MiB**. Bu sayı GPU belleği veya gerçek ağ aktarımı ölçümü değildir. Deniz JPEG'i tek başına **10,98 MiB**.
- Tur süresi duvar saatiyle, sahne ilerlemesi sınırlandırılmış kare süresiyle hesaplanıyor. Sekme değiştirme sonrası istatistiklerle oynanış süresi ayrışabilir.

## Uygulama sırası ve bitiş ölçütleri

### A — Kontrol ve durum güvenilirliği · Öncelik 0

Önce bu paket tamamlanmalı; içerik eklemenin ön koşulu.

1. `keydown` / `keyup` ile basılı tuşları izle; hareketi kare döngüsünde saniye başına hızla uygula. Çapraz hareketi normalize et. Pencere odağı kaybolunca tuş durumunu temizle; menü kontrolleriyle etkileşimde hareketi engelle.
2. Final ve duraklatma ekranında fare kilidini bırak; devam düğmesinde kullanıcı tıklamasıyla geri al. Fare kilidi hatası için görünür geri bildirim ekle.
3. Reset'i tüm pusula açıları, etkileşim durumları ve gecikmiş sunum/ses olayları için tutarlı yap. Yeniden deneme ile yeni tur sayımının aynı şey olup olmadığını belirle.
4. Sekme gizlenince simülasyon ve tur sayacını aynı kuralla durdur; ses için duraklatma/geri dönme davranışını eşleştir.
5. Sistem hareket azaltma tercihini JavaScript'e taşı. Kamera sarsıntısı ve tekne salınımını ayrı kontrol et; yıldırım parlaklığını azaltma seçeneği de sun.
6. Tekrarsız dört alametlik karıştırılmış sıra önerisi: bütün profiller görüldükten sonra yeniden karıştır; sınırda art arda aynı profil gelmesin. Sabit seed ile sorun yeniden üretilebilsin.

**Bitiş ölçütü:** Aynı basılı tutma süresiyle 30/60/120 FPS koşullarında hareket mesafesi yaklaşık aynı; odak kaybında takılı tuş yok; final fare ve klavyeyle kullanılabilir; arka arkaya 10 reset temiz; hareket azaltma 3D sahnede etkili; alamet sırası tek başına test ediliyor. FPS senaryoları test hedefidir, mevcut ölçüm değildir.

### B — İlk oynanış ve oyuncu katılımı · Öncelik 1

Bağımlılık: A.

1. Açılışta kısa bir amaç ve tek bir sonraki eylem göster: pusulayı incele → işareti takip et → kalıntıya yaklaş. Tam tuş listesini isteğe bağlı tut.
2. Pusulayı işlevsel hale getir: sakin durumda doğru yön, anomaliye yaklaşınca anlaşılır sapma; oyuncu yön bilgisini ses ve uzaktaki bir işaretle çapraz kontrol edebilsin.
3. Uyanıştan önce iki küçük keşif noktası: örneğin sürüklenen günlük ve bir işaret taşı. En az biri isteğe bağlı; her biri kısa bilgi veya görünür tepki versin. Yeni büyük model yerine mevcut varlıklarla prototiple.
4. Fenerin kullanılabildiği anı ve hedefe kilitlenmesini açık göster. Fenerin görsel ışın yönü ile final hizalama hesabını ortak kuraldan besle.
5. İlk testte mevcut finali koru. Yeni etkileşimler iyi anlaşılırsa sonraki pakette alternatif finali ekle.

**Bitiş ölçütü:** Projeyi bilmeyen üç kişiyle küçük test; en az ikisi sözlü yardım olmadan ilk etkileşimi bulabiliyor ve ana döngüyü bitirebiliyor. Süre ve takılma noktaları kaydediliyor; 5–10 dakika hedefi buna göre yeniden değerlendiriliyor.

### C — Gerilim, ses ve görsel bütünlük · Öncelik 1

Bağımlılık: A; keşif olaylarını bağlamak için B.

1. Gerilim çizgisi kur: sakin başlangıç → küçük tutarsızlık → yaklaşma → görünmeyen varlık → siluet → kısa tam görünüş. Mevcut 42 saniyelik sekansı önce ölç; sırf süreyi uzatmak için değiştirme.
2. Pusula, keşif, fener ve odak kazanımı için kısa ses geri bildirimleri; uzaktan gelen seslere yön hissi; tepe olaylarından önce kısa sessizlik aralıkları ekle.
3. Ortam, efekt ve genel ses düzeylerini ayır; tekrar başlatmada önceki turun geçici seslerinin taşmasını önle. Kulaklık ve dizüstü hoparlörüyle ayrı dinleme yap.
4. Tekne ve suyu ortak zaman/konum dalga fonksiyonuna bağla; hareketli su yamasının dünya koordinatlarında sürekliliğini koru. Uyanış şiddeti ikisine de aynı kuralla etki etsin.
5. Dört alameti yalnız renkle ayırma: farklı bir ses motifi, sis/deniz davranışı ve bir kısa anlatı tepkisi ekle. Sütun konumları ve yükselme koreografisini bu ilk kapsamda koru.
6. Yaratık, gözler ve fener hedefi karanlıkta okunur kalsın; yıldırımla tam görünüşü kısa tut. Bunu ekran görüntüsü ve kullanıcı testiyle değerlendir.

**Bitiş ölçütü:** Dört alametin her birinde final hedefi bulunabiliyor; ses kapalıyken gerekli bilgi kaybolmuyor; azaltılmış efekt modunda oyun tamamlanıyor; tekne/su eşleşmesi en az iki konumda ve uyanış sırasında gözle doğrulanıyor.

### D — Yeniden oynama gerekçesi · Öncelik 2

Bağımlılık: B ve C'nin anlaşılabilirlik kontrolü.

1. İlk alternatif olarak iki sonuç prototiple: ışığı tutarak tanıklık etmek veya bilinçli bir eylemle ritüelden vazgeçmek. İkinci sonuç yalnızca oyuncunun oyunu kapatmasına ya da boş beklemesine bağlı olmasın.
2. Alametleri küçük olay varyasyonlarına bağla; aynı görev sırasını farklı renkte tekrarlamakla sınırlama.
3. Görülen alametler, bulunan notlar ve erişilen sonlar için küçük yerel kayıt ekle; kayıt kullanılamadığında oturum çalışmaya devam etsin.
4. Final istatistiklerinde geçen süre, hedefe bakış oranı ve kesintisiz tutuşun ne anlama geldiğini netleştir. Hikâye deneyimini gereksiz skor baskısına çevirmemek için sunumu test et.

**Bitiş ölçütü:** Her iki son bilinçli eylemle elde edilebiliyor; kayıt/reset kuralları açık; ikinci oynanışta görülebilir bir farklılık var.

### E — Yükleme, performans ve yayın hazırlığı · Öncelik 1–2

A'dan sonra temel ölçüm yapılabilir; optimizasyon hedefleri ölçümle kesinleştirilir. C'nin bitmesini beklemeden büyük doku çalışması yapılabilir.

1. Ağ yüklemesini ve kare sürelerini ölç. İlk hedef: aktif dokuların toplamını 34,65 MiB'den yaklaşık 12 MiB veya altına indir; bu bir başlangıç bütçesidir, görünür kalite kaybı varsa yeniden ayarlanır.
2. Önce 10,98 MiB deniz JPEG'ini, ardından yeni ahşap/pusula dokularını boyut ve kodlama açısından incele. Düşük kalite için gerçekten küçük doku varyantları kullan; yalnız PBR'ı kapatmak yüklemeyi azaltmıyor.
3. Kare süresini simülasyon için sınırlandırılmış delta'dan ayrı ölç. Seçilmiş masaüstü test cihazında 1080p/medium için 60 FPS hedefi koy; cihaz, tarayıcı ve yüzde 95 kare süresini raporla. Henüz bu hedefi karşıladığı iddia edilmiyor.
4. Kalite seçimini başlangıca taşı; otomatik kalite düşürmeyi yalnız ölçüm ihtiyacı gösterirse ekle.
5. `gl-matrix` bağımlılığını sürüm/lisansıyla yerelden sun; yükleme aşaması ve tekrar deneme arayüzünü iyileştir. WebGL context kaybında sessizce takılmak yerine geri dönüş sun.
6. Chrome, Edge ve Firefox'ta tam tur; soğuk yükleme, ses izni, yeniden başlatma, sekme dönüşü ve küçük ekran kontrolü yap. Dokunmatik destek ayrı kapsam; yalnız responsive CSS mobil oynanabilirlik anlamına gelmez.

**Bitiş ölçütü:** Tanımlı cihazlarda ölçüm raporu, kritik tarayıcı hatası yok, eksik varlıkta açıklayıcı hata ve tekrar deneme, başlangıçtan yeniden oynatmaya kadar doğrulanmış akış. Yayınlama bu planın parçası olarak yapılmadı.

## Teknik kaynaklar

- [MDN — requestAnimationFrame](https://developer.mozilla.org/en-US/docs/Web/API/Window/requestAnimationFrame): zaman damgasıyla kare hızından bağımsız ilerleme.
- [MDN — Pointer Lock API](https://developer.mozilla.org/en-US/docs/Web/API/Pointer_Lock_API): kilit bırakma, kullanıcı etkileşimi ve hata olayları.
- [MDN — prefers-reduced-motion](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/At-rules/@media/prefers-reduced-motion): sistem tercihine göre hareket azaltma.
- [MDN — WebGL best practices](https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API/WebGL_best_practices): kaynak bütçesi, çözünürlük ve GPU kaynak yönetimi.

## Şimdilik ertelenecekler

Açık dünya, balıkçılık ekonomisi, crafting, savaş, çok oyunculu, kapsamlı envanter, yeni oyun motoruna geçiş ve tam mobil kontrol. Bunlar ilk 5–10 dakikanın kalitesini doğrulamadan maliyeti büyütür. İhtiyaç kullanıcı testiyle ortaya çıkarsa ayrı planlanır.

## Ritüellere aktarım

A kapsamı VIII–IX'a, B kapsamı X–XI'a, C kapsamı XII'ye, D kapsamı XIII'e aktarıldı. E'nin başlangıç ölçümü VIII'de, optimizasyon XIV'te, son doğrulama XV'te ele alınacak. Ayrıntılı sıra ve bitiş ölçütleri için [Ritüel yol haritasına](RITUAL_ROADMAP.md) bakın. Bu belgedeki A–E başlıkları araştırmanın tematik gruplarıdır; geliştirme aşamalarının adı ritüeldir.
