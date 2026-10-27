# Codex bağımsız QA kabul planı

28 Ekim 2026 · Durum: Hazırlandı, **AG teslimine karşı henüz çalıştırılmadı**.

Sorumluluk: AG geliştirme ve ön test yapar; Codex teslimden sonra kod incelemesi, bağımsız doğrulama ve sonuç raporu hazırlar. Gerçek oyuncu/dinleyici gerektiren kısım erişilebilir katılımcılarla yapılır; otomasyon bunların yerine sayılmaz.

## QA'ya giriş

- `docs/AG_DELIVERY.md`, son kod SHA'sı, ritüel raporları ve çalıştırma yönergesi mevcut olmalı.
- QA başlangıcında gerçek HEAD ve çalışma ağacı kaydedilir. Teslim SHA'sıyla fark varsa incelenecek sürüm açıkça sabitlenir; dosyalar silinmez veya resetlenmez.
- AG'nin değiştirdiği tüm üretim/test dosyalarının farkı incelenir. Özellikle davranış kaldırılması, zayıflatılmış testler, kaynak/olay dinleyicisi sızıntısı ve ses iptal yarışları aranır.
- QA sırasında kod değişirse bu önceki sonuçları otomatik devralmaz; yeni SHA'da etkilenen kontroller tekrar edilir.

## QA-01 — Otomatik temel

1. Belgelenmiş Node sürümüyle tüm davranış testlerini, dosya/model doğrulamasını ve değişmiş JS sözdizimi kontrollerini bağımsız çalıştır.
2. Eksik varlık/dil anahtarı, yanlış script sırası veya manifest farkı olmadığını denetle.
3. Sesler değiştiyse son kodlanmış dosyaları bağımsız decode/seviye ölçümünden geçir. Araç yoksa yapılmadı yaz; geçmiş ölçümü yeni sesin sonucu gibi kullanma.

Beklenen: Gerekli tüm kontroller PASS. Test sayısının artması tek başına kabul değildir; kaldırılan/değişen kapsam incelenir.

## QA-02 — Başlangıç ve izinler

Her erişilebilir normal Chrome, Edge ve Firefox'ta:

- Low/Medium/High açılış, shader derleme ve ilk sahne.
- Sesin kullanıcı etkileşiminden sonra açılması; reddedilen ses/fare kilidinde açıklama ve kullanılabilir klavye alternatifi.
- Eksik doku, eksik ses ve WebGL context kaybı. GPU hatası anlaşılır dönüş yolu sunmalı; eksik anlatıcı yazıları veya ilerlemeyi engellememeli.
- İsteklerin yerel varlıklara gitmesi; oynanışta harici konuşma servisi/API anahtarı bulunmaması.

## QA-03 — Doğal oynanış matrisi

Normal Chrome/Edge/Firefox × dört alamet × iki son: **24 tam rota** hedeflenir. Her rota için browser/sürüm, seed, cycle, alamet, son, kalite, sonuç ve kanıt kaydedilir. Erişilemeyen hücre PASS sayılmaz.

Tanıklık rotası:

1. Yeni oturum/tur başlat; pusulayı incele ve indir. İncelemeden önce hareketin, inceleme sürerken seyir hareketinin doğru engellendiğini kontrol et.
2. Harabelere doğal biçimde yaklaş; bu rotada F2 Start awakening kullanma.
3. Feneri kaldır; hedefi bulup dört saniye odaklan. Hedef kaybında ilerlemenin tanımlı biçimde azalmasını gözle.
4. Doğru final, istatistikler, 4/4 görev ve kullanılabilir final düğmeleri.

İnkâr rotası:

1. Aynı alamet için yeniden üretilebilir seed/cycle ile doğal yaklaşma ve uyanış.
2. Turn away seç; önce iptal et ve oyunun devamını kontrol et.
3. Tekrar seçip açık onayla; doğru final ve arşiv kaydı oluşmalı.

Ek kontroller: İlk keşifler isteğe bağlı kalmalı; not okumadan da sonlara ulaşılmalı. R aynı turu/alameti, yeni tur sonraki cycle'ı açmalı. F2 üzerinden yapılan kısayol testleri ayrıca yazılabilir, tam rota hücresinin yerini alamaz.

## QA-04 — Dünya ve etkileşim

- Taşa önden, arkadan, yandan ve çapraz yaklaşma; yüksek adım, geri çıkma, kenardan kayma.
- Birbirine yakın en az iki engel; çözüm sırasında başka engelin içine itilme veya geçiş olmaması.
- Sütunların yükselmeden önce/sonra görünür geometriyle uyumlu katılığı. Teknenin geçerli geçiş koridoru kapanmamalı.
- Keşiflerin yakın/uzak, bakılan/bakılmayan ve örtülü/açık koşulları. F, tıklama ve bağlamsal düğme çelişmemeli.
- Günlük için planlanan sürüklenen/katı olmayan davranış ve tekrar inceleme.

## QA-05 — Ses ve altyazı

- İki keşif, altı anlatı anı ve iki final: doğru kayıt ve metin eşleşmesi. Sadece “speaking” etiketi değil gerçek audio decode/start akışı ve hata durumu kontrol edilir; duyuldu iddiası için dinleme gerekir.
- Tek aktif ses, final/keşif önceliği, ortamın azalması ve konuşma bitince tercih edilen düzeye dönmesi.
- Ana mute, ana ses sıfır, anlatıcı kapalı/sıfır ve bağımsız ortam/efekt seviyeleri. Yeniden açınca geçmiş cümle sürpriz biçimde başlamamalı.
- Not açıkken dünya durmalı, not anlatımı çalabilmeli; kapatma kaydı kesmeli. Read aloud ve final Replay narration açık kullanıcı eylemiyle çalışmalı.
- Yavaş fetch, yavaş decode, başarısız istek, eski olayın geçerlilik süresinin dolması, bu sırada pause ve reset. Eski tur veya eski olay yeni altyazıyı ezmemeli.
- Uzun altyazı, boyut tercihi, görünür kontrast ve %200 büyütmede erişim. Ses kapalıyken zorunlu bilgi kalmalı.
- Tercihler yenileme sonrası korunmalı; bozuk/engelli localStorage'da oyun açılmalı.

## QA-06 — Yaşam döngüsü ve klavye

- Seyirde, uyanışta, anlatım sırasında, not ve final kartında pause/resume; gerçek sekme gizleme ve OS odağı değiştirme.
- Gizli/duraklatılmış süre sahne/tur/final sayaçlarına eklenmemeli. Sekmeye dönüş kendiliğinden hareket/ses başlatmamalı.
- Normal fare kilidi giriş/çıkışı, Escape, reddedilme ve tekrar deneme. Klavye alternatifiyle tamamlama.
- Menü odağı sırasında WASD tekneyi hareket ettirmemeli. Bütün modal düğmelerine Tab/Shift+Tab ile ulaşılmalı; görünür odak ve doğru kapanış odağı olmalı.
- En az 10 ardışık reset; gecikmiş kayıt/yükleme ve dinleyici birikimi olmamalı. Kaliteyi hızlı değiştirme ile reset birlikte denenmeli.

## QA-07 — Görünüm, konfor ve performans

- 360×800, 1280×720, 1920×1080 ve %200 büyütme. Görev, altyazı, ayar ve düğmeler çakışmamalı; kaydırma gerekli kontrole eriştirmeli. Bu test dokunmatik destek iddiası üretmez.
- Reduced-motion sistem tercihi, bağımsız tekne/sarsıntı/yıldırım ayarları, dört alamette hedef görünürlüğü.
- Aynı cihaz/koşullarla başlangıç ve son sürümde seyir/uyanış ölçümü: gerçek render çözünürlüğü, DPR, kalite, ham kareler, p95, yükleme, önbellek ve CPU/GPU bilgisi.
- Soğuk/sıcak yükleme ayrımı ve mümkünse kontrollü yavaş ağ. Ses/doku transfer boyutu ile çözümlenmiş GPU/audio belleğini birbirine karıştırma.
- 1080p/Medium 60 FPS tasarım hedefi, referans cihaz üzerinden değerlendirilir. Donanım veya eşdeğer başlangıç ölçümü yoksa evrensel PASS ya da gerileme oranı uydurma.

## QA-08 — Dağıtım hazırlığı ve CI

- Temiz kopyadan belgelenmiş komutla açılış; dağıtım paketinde gerekli tüm model/doku/shader/ses/lisanslar.
- Alt dizinden servis edilen statik paket; köke sabitlenmiş yanlış varlık yolu ve hatalı MIME olmadığını kontrol et.
- .tools, model ağırlıkları ve çalışma önbelleklerinin teslim paketine girmemesi.
- CI iş akışının gerçek komutları çalıştırması ve hataları gizlememesi. Uzaktaki CI çalışması erişilemiyorsa yerel çalışmayla eşit sayma.
- Dışarı yayınlama yapma; yayın kullanıcı tarafından ayrıca istenir.

## QA-09 — İnsan kabulü

En az üç yeni oyuncu; en az ikisi sözlü yardım olmadan ana döngüyü tamamlayabilmeli. Gerçek oynama süresi, takılma noktaları ve son seçiminin anlaşılması kaydedilir. 5–10 dakika bir tasarım hedefidir; testi uzatarak veya boş bekleterek sağlanmış gösterilmez.

Üç gerçek dinleyiciyle kulaklık/hoparlör: en az ikisi önemli anlatıcı cümlelerini yardımsız anlayabilmeli. Telaffuz, korku hissi, yoruculuk ve ortam/fener dengesi ayrıca değerlendirilir. İnsan bulunamazsa bu madde açık kalır; Codex otomasyonunu insan katılımcı diye saymaz.

## Bulgu ve sonuç biçimi

Codex, testler gerçekten yapıldıktan sonra `docs/QA_REPORT.md` oluşturur. Bu plan dosyası sonuç raporu değildir.

Her bulgu: kimlik, önem, test edilen SHA, ortam, yeniden üretim adımları, beklenen/gerçek sonuç, kanıt, etkilenen dosya ve tekrar test sonucu.

- P0: Açılmama, veri kaybı veya ana akışın genel olarak çalışmaması.
- P1: Bir sonun/alametin tamamlanamaması, çarpışma delme, takılı girdi/ses, bozuk reset veya gerekli kontrolün erişilememesi.
- P2: Belirli koşulda görsel/ses/performans sorunu; kullanılabilir geçici yol var.
- P3: Küçük sunum veya doküman kusuru.

Sonuç:

- **PASS:** Tanımlı zorunlu kapsam kanıtla geçti; açık yayın kabul maddesi yok.
- **FAIL:** Doğrulanmış P0/P1 var veya zorunlu davranış başarısız.
- **KISMİ:** Erişilen kapsam geçti ancak tarayıcı/cihaz/insan kabulü eksik. “Tam QA geçti” veya “yayına hazır” diye sunulmaz.

AG düzeltmesinden sonra yalnız etkilenen testler ve gerekli bağlantılı regresyonlar tekrar edilir. Yeni başarısızlık veya kapsam değişikliği yoksa gereksiz tam tekrar yapılmaz. Son rapor son test edilen SHA'yı, geçti/kaldı/çalıştırılmadı ayrımını ve yayın kararına engelleri açıkça belirtir.
