# AG geliştirme haritası

28 Ekim 2026 · Başlangıç kodu: `554a131` · Durum: Planlandı

## Görev dağılımı

AG uygulamayı yapacak. Codex genel kapsamı ve kabul ölçütlerini tanımlar; AG tesliminden sonra bağımsız kod incelemesi ve QA yapar. Bu belge bir uygulama planıdır; aşağıdaki işler yapılmış veya testler geçmiş sayılmaz.

Okuma sırası:

1. Bu harita.
2. [Uygulama ve teslim kuralları](AG_IMPLEMENTATION_GUIDE.md).
3. [Bağımsız QA kabul planı](QA_ACCEPTANCE_PLAN.md).
4. Mevcut [README](../README.md), [XV raporu](rituals/RITUAL_15_REPORT.md) ve [XIX raporu](rituals/RITUAL_19_REPORT.md).

## Ürün hedefi

Tek teknede geçen kısa, anlaşılır ve atmosferik kozmik korku deneyimi. Ana döngü korunacak: pusulayı oku → harabelere yaklaş → feneri kaldır → tanıklık et veya bilinçli olarak vazgeç. İlk oyuncunun yardım almadan bitirebilmesi, yeni özellik sayısından daha önemli.

Mevcut temel: framework'süz WebGL 2, dört tohumlu alamet, iki son, iki isteğe bağlı keşif, dalgayla eşleşen tekne hareketi, erişilebilirlik/konfor ayarları, yerel arşiv ve 10 İngilizce AI anlatıcı kaydı. Başlangıçta 41 otomatik test geçiyor; bu sayı yeni işlerin kabulü veya insan testi yerine geçmez.

## Öncelik ve sıra

İlk teslim kapsamı XX–XXV ve XXVIII'dir. XXVI–XXVII sonraki geliştirme adayıdır; ilk teslimi bunlarla büyütme. XXIX, AG'nin kendi işini kabul ettiği bir aşama değildir: bağımsız QA'yı Codex yürütür.

Sıra: **XX → XXI → XXII → XXIII → XXIV → XXV → XXVIII → Codex QA (XXIX)**. Önceki aşamanın çalışır çıktısı olmadan bağımlı işi başlatma. Bir aşamada gerekli küçük hata düzeltmesi başka modüle dokunabilir; raporda nedenini belirt.

## Ritüel XX — Başlangıç Kaydı

Öncelik P0. Amaç: Çalışan sürümü ve bilinen eksikleri somutlaştırmak.

- Çalışma ağacını ve başlangıç commit'ini kaydet; kullanıcı değişikliklerini koru.
- Mevcut testleri ve doğrulama betiğini çalıştır. Başarısızlık varsa yeni özellikten önce nedenini ayır.
- Doğal rotayla en az bir turu ve iki sonun erişimini incele. F2 ile atlanan yaklaşmayı tam tur diye raporlama.
- Normal masaüstü ve 360×800 arayüz görüntülerini kaydet. Küçük görünüm kontrolünü dokunmatik destek olarak sunma.
- Cihaz/tarayıcı/çözünürlük/DPR/kalite/önbellek koşullarıyla performans başlangıcı al. Kaydedilemeyen alanı bilinmiyor yaz.

Kabul: Yeniden üretilebilir başlangıç raporu, test sonuçları ve bilinen sorun listesi. Bu aşamanın tarayıcı erişimi kısıtlıysa eksik koşullar açık tutulur; kod işleri devam edebilir.

## Ritüel XXI — Sessiz Güverte

Öncelik P1. Amaç: Ekrandaki bilgiyi azaltıp sıradaki eylemi okunur kılmak.

- Torch Control/Brightness gibi teknik göstergeleri normal HUD'dan F2 tanılamasına taşı; oyuncuya gereken fener durumu anlaşılır kalsın.
- Görev, yön, etkileşim ve altyazı alanlarını çakışmayacak biçimde düzenle. Her aşamada tek belirgin sonraki eylem olsun.
- Altyazı boyutu ayarı ekle; tercih kalıcı olsun. Altyazıları kapatmak zorunlu görev bilgisini kaldırmasın.
- Ses/konfor ayarları erişilebilir kalsın; Tab sırası, görünür odak ve modal odağı korunmalı.
- 360×800, 1280×720 ve 1920×1080'de kontrol et; %200 tarayıcı büyütmesinde gerekli düğmeler ulaşılabilir olsun.

Kabul: Teknik HUD normal görünümde yok; görev/altyazı/etkileşim birbirini örtmüyor; yalnız klavyeyle menüler, notlar ve finaller kullanılabiliyor. Önce/sonra ekran kanıtı ver.

## Ritüel XXII — Gerçek Temas

Öncelik P1. Amaç: Engel ve keşif davranışlarını ortak ve tutarlı hale getirmek.

- İşaret taşına özel çarpışmayı genel engel tanımından beslenen küçük bir modüle ayır. Gerekmedikçe fizik motoru ekleme.
- Gerçek model konum/ölçeklerinden hareketle taş ve sütunlar için uygun çarpışma sınırları belirle; yükselen sütunların katı hale gelme zamanını sahneyle eşleştir. Görünmez veya su altındaki engel oyuncuyu gereksiz durdurmasın.
- Tekne gövdesini hesaba kat; yüksek adımda delip geçmeyi, kenardan kaymayı, ters hareketi, başlangıçta içeride kalmayı ve birden çok yakın engeli kapsa.
- Mevcut tekne yönü ve serbest kamera davranışını koru. Bu işin içine yelken veya yeni direksiyon modeli katma.
- Keşif için mesafeye ek bakış/görüş hattı kullan. Bağlamsal düğme, F tuşu ve tıklama aynı erişilebilirlik kuralına bağlı olsun; görünmeyen not açılamasın, erişilebilir düğme de kullanılamaz hale gelmesin.
- Günlük yüzeyde sürüklenen bir keşif olarak kalabilir; tüm nesneleri gelişigüzel katı engel yapma.

Kabul: Taş ve etkin katı sütunlardan geçilemiyor; kenardan dolaşılabiliyor; birden çok engel çözümü önceki temasın içine geri sokmuyor. Yakın/uzak, önü/arkası ve örtülü/açık keşif durumları testli. 30/60/120 FPS ve büyük adım senaryoları doğrulanmış.

## Ritüel XXIII — Zamanında Gelen Fısıltı

Öncelik P1. Amaç: Anlatıcıyı olay zamanına ve kullanıcı tercihlerine güvenilir biçimde bağlamak.

- Uyanış cümlelerine olay türüne göre bir geçerlilik süresi tanımla. Süreyi fetch/decode tamamlanmasından değil istek anından başlat; oyun duraklatılmışken beklenen süre hesabını açıkça tanımla ve test et.
- Süresi geçmiş bir kayıt geç yüklenirse oynatma; yeni sahnenin altyazısını eski cümleyle değiştirme. Not/final için açık yeniden okuma bu sınıra aynı biçimde takılmak zorunda değil.
- Tek aktif konuşma, öncelikler, ana mute, anlatıcı seviyesi, ortamın kısılması ve eski tur iptali korunmalı.
- Hata/yavaş yüklemede yazılar ve ilerleme devam etmeli; Loading narrator durumunda sonsuz bekleme bırakma.
- 10 mevcut İngilizce kaydı ve manifesti koru. Dinleme kanıtı varsa telaffuz ve miks sorunlarını düzelt; yalnız frekans/seviye ölçümünü insan beğenisi gibi sunma.
- Yeni ücretli hizmet veya yeni ses modeli bu işin gereği değil. Kayıt değişirse temiz kaynağı, atfı, manifesti ve bağımsız ölçümü birlikte güncelle.

Kabul: Gecikmiş fetch ve gecikmiş decode senaryoları ayrı ayrı testli; reset sonrası eski cümle yok; pause/resume ve kart kapatma doğru; kaydın yokluğu iki sonu da engellemiyor.

## Ritüel XXIV — Ayrılan Düğümler

Öncelik P1. Amaç: Sahne yönetimini bakım yapılabilir hale getirmek.

- main.js içindeki giriş/arayüz bağlama, çizim, kaynak kurulumu ve sahne yaşam döngüsünü anlaşılır sorumluluklara ayır.
- Yeni modül sınırlarını ve veri akışını kısa bir notla açıkla. Tek dosyayı yalnızca küçük dosyalara kopyalamak yeterli değil.
- Duraklatma, reset, yeni tur ve son seçimi için tek davranış kaynağı kullan; aynı durumun UI ve simülasyonda ayrı ayrı tutulmasını azalt.
- Dünya konumları/ölçekleri hem çizim hem çarpışma için ortak tanımdan gelsin. Aynı eşik veya koordinat farklı modüllerde kopyalanmasın.
- Testlerin üretim kodunu metin keserek yüklemesi yerine açık test edilebilir modül sınırlarını tercih et. Gerçek davranış kapsamını azaltma.
- Framework/motor değişimi, zorunlu build sistemi veya kapsamlı paket geçişi yapma. Davranış değiştiren işi refaktör commit'lerinden ayır.

Kabul: Eski kontroller ve sahne akışı aynı; modüller tekrar bağlanınca olay dinleyicileri çoğalmıyor; mevcut ve gerekli yeni regresyon testleri geçiyor. Sabit bir satır sayısı hedefi yok.

## Ritüel XXV — Ölçülü Akış

Öncelik P1. Amaç: Ölçülmüş darboğazları azaltmak.

- XX koşullarını kullanarak normal seyir ve uyanış için önce/sonra ölçümü al.
- Ölçümle gerekçelenen kare içi matris/vektör tahsislerini yeniden kullanılabilir tamponlara taşı.
- Arayüz metinlerini değer değişmediğinde yeniden yazma; gerekliyse gezinme HUD'sını çizim hızından ayrı güncelle. Girdi ve nişan tepkisini geciktirme.
- Düşük güçlü cihazda başlangıç High seçimini değerlendir. Gerekirse muhafazakâr varsayılan seç; kanıt olmadan otomatik kalite sistemi ekleme.
- Low/Medium/High ve mevcut efekt kapatma seçeneklerini koru. Görsel kalite düşürerek kazanılan FPS'yi aynı kalite optimizasyonu gibi sunma.

Kabul: Aynı cihaz/çözünürlük/DPR/kalite/önbellekle karşılaştırılabilir ölçüm; ham kare süreleri, p95, yükleme ve görsel kanıt birlikte var. Kontrol cihazında 1080p/Medium 60 FPS hedefi değerlendirilmiş; hedef karşılanmazsa neden ve kalan iş açık. Donanımdan bağımsız garanti verme.

## Ritüel XXVI — İki Dilin Eşiği (sonraki kapsam)

Öncelik P2. İlk teslim için zorunlu değil.

- Menü, görev, not, final ve anlatı metinlerini ortak kimlikli dil kataloğuna taşı; İngilizce varsayılan ve eksik çeviride geri dönüş olsun.
- Türkçe metin çevirisi ve kullanıcının gelecekteki Türkçe ses kayıtları ayrı paketler olarak ele alınsın. Kullanıcının sesi olmadan ona aitmiş gibi ses üretme.
- Dil başına bağımsız ses süresi; uzun Türkçe metinler için taşma/altyazı testi. Tamamlanmamış dil veya ses seçeneğini hazır gösterme.

Kabul: Mevcut İngilizce davranış korunmuş; eksik anahtarlar sessizce boş metne dönüşmüyor. Türkçe ses kullanıcının kaydı sağlanmadan tamamlandı sayılmaz.

## Ritüel XXVII — Deniz Başka Hatırlar (sonraki kapsam)

Öncelik P2. İlk teslim için zorunlu değil; oyuncu geri bildiriminden sonra.

- Her alamete kısa, gözlenebilir ve ana döngüyü bozmayan bir olay adayı tanımla. Renk filtresinin ötesinde bir farklılık hedefle.
- Yeni olaylar aynı seed ve cycle ile yeniden üretilebilsin; R aynı turu, yeni tur sıradaki alameti korusun.
- Yeni büyük model/savaş/ekonomi yerine mevcut ses, ışık, dalga ve küçük keşifleri kullan. Üç sütunun konumu/yükseliş koreografisi kullanıcı yönlendirmesi olmadan değiştirilmesin.

Kabul: Oyuncu ilk ve ikinci tur farkını görebiliyor; dört alamette iki son ve azaltılmış efektler çalışıyor. Kalıcı arşiv kayıtlarının geriye uyumu korunmuş.

## Ritüel XXVIII — Teslim Edilebilir Demo

Öncelik P1. İlk teslimde zorunlu; XX–XXV'den sonra. Amaç yayın yapmak değil, doğrulanabilir teslim hazırlamak.

- Mevcut Node kontrollerini otomatik çalışan CI iş akışına bağla. Yerel çalışma biçimini ve CDN'siz çalışma özelliğini koru.
- Yayına girecek statik dosyaları açıkça listele veya paketle. .tools, model ağırlıkları, çalışma önbellekleri ve gereksiz geliştirme kanıtları pakete girmesin; gerekli lisans/atıflar kalsın.
- Alt dizinden barındırma için göreli varlık yollarını, MP3/WAV/JSON MIME türlerini ve başarısız yükleme ekranını kontrol et.
- Kontroller, bilinen sınırlamalar ve çalıştırma yönergelerini README'de güncelle.
- Kullanıcı ayrıca istemedikçe push, GitHub Pages/itch.io kurulumu veya dışarı yayınlama yapma.
- AG teslim özetini ve ritüel raporlarını [uygulama kılavuzundaki](AG_IMPLEMENTATION_GUIDE.md) sözleşmeye göre tamamla.

Kabul: Yeni kopyada belgelenmiş komutlarla açılan oyun, geçen yerel kontroller, tanımlı dağıtım paketi ve bağımsız QA'ya hazır teslim SHA'sı. CI yapılandırmasının bulunması, uzaktaki CI'nın çalıştığı anlamına gelmez.

## Ritüel XXIX — Bağımsız QA

Sorumlu: Codex. AG'nin son commit'i sabitlenip teslim belgeleri sağlandıktan sonra [QA planı](QA_ACCEPTANCE_PLAN.md) uygulanır. AG kendi ön testlerini yapar; bağımsız QA sonucunu veya insan kabulünü kendi adına PASS yazmaz.

Bulgu çıkarsa AG düzeltir; Codex yeni SHA üzerinde ilgili kontrolleri tekrarlar. Kapanış sonucu kapsamı açık bir **PASS / FAIL / KISMİ** olur. İnsan veya tarayıcı erişimi gerektiren açık madde varken koşulsuz yayına hazır etiketi verilmez.

## Şimdilik kapsam dışı

Açık dünya, savaş, crafting, ekonomi, çok oyunculu, tam fizik tabanlı yelken, sanity göstergesi, su altı bölümü, motor değişimi, tam mobil/gamepad desteği ve yoğun yeni post-processing ilk teslimde yok. Bunlar mevcut oynanış kabulünün yerine geçmez.
