# Cthulhu Awakening — Ritüel yol haritası

18 Ekim 2026 · Başlangıç sürümü: `de31a8e` (`ritual_7`)

Bu projede geliştirme aşamalarının adı **ritüel**. VIII ve IX uygulandı; kalan tarayıcı doğrulamaları açık. X–XV'e başlanmadı.

Araştırma, emsaller ve mevcut kod bulguları: [Araştırma ve geliştirme önerisi](RESEARCH_AND_ROADMAP.md).

## Hedef

Tek teknede, pusula, keşif ve fener üzerine kurulu kısa bir kozmik korku deneyimi. İlk oynanış için 5–10 dakika tasarım hedefi; gerçek süre kullanıcı testleriyle belirlenecek. Mevcut WebGL 2 altyapısı korunur.

## Çalışma kuralları

- Her ritüel tek bir ana sonuç üretir. Kapsamı, doğrulaması ve kalan sorunları kendi kapanış raporunda tutulur: `docs/rituals/RITUAL_08_REPORT.md` biçiminde.
- Durumlar: **Planlandı → Devam ediyor → Doğrulama bekliyor → Tamamlandı**. Raporlar uygulama sırasında oluşturulur; planlanmış iş bitmiş gibi işaretlenmez.
- Kod kontrolleri geçti diye tarayıcı veya kullanıcı doğrulaması tamamlanmış sayılmaz. Çalıştırılmayan kontroller açıkça belirtilir.
- Önceki ritüelin gerekli çıktıları doğrulanmadan bağımlı işe geçilmez. Yeni kapsam veya erteleme kararı bu belgeye işlenir.
- 18 Ekim kullanıcı yönlendirmesi: Her ritüel test/raporuyla `main` dalına ayrı commitlenerek sırayla uygulanacak. Ortamın izin vermediği gerçek fare kilidi kontrolleri ve insan testleri açık maddeler olarak taşınabilir; bunlar tamamlanmış sayılmaz. Bu istisna VIII'den sonraki geliştirmeye izin verir; son doğrulama XV'te kapanır.
- Geliştirme ritüeli numarası ile oyundaki **Cycle** sayacı farklı kavramlardır; geliştirme numarası oyun arayüzüne taşınmaz.
- Gün/saat tahmini ilk ölçümden sonra yapılır. Bu plan uygulama veya yayınlama işlemi başlatmaz.

## Ritüel VIII — Sağlam Güverte

**Durum:** Doğrulama bekliyor · **Öncelik:** P0 · **Bağımlılık:** Mevcut Ritual VII kodu

Uygulama, testler, başlangıç ölçümü ve kalan kontroller: [Ritüel VIII raporu](rituals/RITUAL_08_REPORT.md).

**Amaç:** Kontrol, final ve yeniden başlatmayı güvenilir hale getirmek.

- Hareketi basılı tuş durumu ve saniye başına hız üzerinden kare döngüsüne taşı; çapraz hızı normalize et.
- Odak kaybında basılı tuşları temizle; menü etkileşimlerinin tekneyi hareket ettirmesini önle.
- Final/duraklatma ekranında fare kilidini bırak; devam tıklamasıyla geri al; başarısız kilit isteğinde geri bildirim göster.
- Pusula açıları dahil tüm geçici sahne durumunu sıfırla; eski zamanlayıcı ve ses olaylarının yeni tura taşmasını önle.
- Sekme gizlenmesi, duraklatma, simülasyon, ses ve tur süresi için ortak davranış kur. Bu pakette R yeniden denemeyi, finaldeki yeniden başlatma yeni turu ifade etsin; sayaç davranışını belgede ve arayüzde netleştir.
- Sınırlandırılmamış kare zamanını simülasyon delta'sından ayrı ölç; test cihazı, çözünürlük, tarayıcı, ilk yükleme ve kare süresi için başlangıç kaydı al.

**Tamamlanma ölçütleri:** Aynı basılı tutma süresinde 30/60/120 FPS senaryoları arasında hareket mesafesi farkı en fazla %5; odak kaybında takılı tuş yok; final fare ve klavyeyle kullanılabiliyor; farklı aşamalarda art arda 10 reset eski durum taşımıyor; gizli sekmedeki süre istatistiğe eklenmiyor. Bunlar hedeflerdir, mevcut ölçüm sonucu değildir.

**Kapsam dışı:** Yeni keşif noktası, yeni son, görsel yeniden tasarım.

## Ritüel IX — Sakin Bakış

**Durum:** Doğrulama bekliyor · **Öncelik:** P0 · **Bağımlılık:** VIII

Uygulama ve kanıt: [Ritüel IX raporu](rituals/RITUAL_09_REPORT.md).

**Amaç:** Erişilebilir, tekrar üretilebilir bir deneyim temeli oluşturmak.

- Sistem hareket azaltma tercihini JavaScript sahnesine uygula; tekne salınımı ve kamera sarsıntısını ayrı ayarlara bağla.
- Yıldırım etkisini azaltma seçeneği ekle; finalin gerekli görsel ipuçlarını koru.
- Dört alameti tekrarsız bir sıra içinde dağıt; sıra yeniden karıştığında sınırda aynı alamet gelmesin.
- Sabit seed ile aynı alamet dizisini yeniden üret; ayarları mevcut ses ayarı yaklaşımıyla yerelde sakla, kayıt başarısızlığını tolere et.

**Tamamlanma ölçütleri:** Sistem tercihi ve oyun ayarı 3D sahneyi etkiliyor; azaltılmış efektlerle tam tur bitiyor; sabit seed aynı sonucu veriyor; 100 tur boyunca her dört turluk blok dört farklı alamet içeriyor ve blok sınırlarında tekrar yok; kayıt kapalıyken oyun çalışıyor.

**Kapsam dışı:** Alametlere yeni hikâye veya ses içeriği; bunlar XII'de.

## Ritüel X — Kaybolan Kuzey

**Durum:** Doğrulama bekliyor · **Öncelik:** P1 · **Bağımlılık:** IX

Uygulama: [Ritüel X raporu](rituals/RITUAL_10_REPORT.md).

**Amaç:** Pusulayı yön bulma aracına dönüştürmek ve ilk dakikayı anlaşılır kılmak.

- Açılışta kısa amaç, sonra yalnız sıradaki eylem için yardım göster; tam kontrol rehberini isteğe bağlı tut.
- Pusula sakin durumda yön göstersin; anomali yakınında anlaşılır şekilde sapsın.
- Uzak bir görsel işaret ve erişilebilir metin ipucuyla pusula bilgisini çapraz kontrol etme imkânı ver.
- Mevcut uyanış tetikleme koşullarını pusula ve görev akışıyla tutarlı hale getir.

**Tamamlanma ölçütleri:** Pusula yönü tekne/kamera dönüşleriyle doğru ilişki kuruyor; anomali tepkisi yeniden üretilebiliyor; ilk görevin ilerlemesi ile hareket kilidi çelişmiyor; pusula → yaklaşma → uyanış akışı her alamette çalışıyor. Yeni oyuncuyla ilk kullanım kontrolü kaydediliyor.

**Kapsam dışı:** Geniş harita ve rota sistemi.

## Ritüel XI — Suyun Getirdikleri

**Durum:** Doğrulama bekliyor · **Öncelik:** P1 · **Bağımlılık:** X

Uygulama: [Ritüel XI raporu](rituals/RITUAL_11_REPORT.md).

**Amaç:** Uyanış öncesine kısa, somut keşif etkileşimleri eklemek.

- Mevcut varlıklarla iki küçük keşif noktası prototiple: sürüklenen günlük ve işaret taşı başlangıç adaylarıdır.
- En az bir keşfi isteğe bağlı tut; her keşif kısa bilgi veya görünür dünya tepkisi üretsin.
- İnceleme sırasında tekne/kamera girdisini ve fare kilidini doğru yönet; çıkınca görev akışını sürdür.
- Fenerin kullanılabilirliğini ve hedefe kilitlenmesini açık göster; görsel ışın yönü ile final hizalamasını ortak kurala bağla.

**Tamamlanma ölçütleri:** İki nokta bulunup incelenebiliyor; isteğe bağlı nokta atlanınca ana döngü tamamlanıyor; mevcut final çalışıyor. Projeyi bilmeyen üç kişiden en az ikisi sözlü yardım olmadan ilk etkileşimi bulup döngüyü bitirebiliyor; süre ve takılmalar kaydediliyor. İnsan testi yapılmadıysa bu ölçüt açık kalır.

**Kapsam dışı:** Envanter, crafting ve alternatif son.

## Ritüel XII — Derinliğin Nefesi

**Durum:** Doğrulama bekliyor · **Öncelik:** P1 · **Bağımlılık:** XI

Uygulama: [Ritüel XII raporu](rituals/RITUAL_12_REPORT.md).

**Amaç:** Ses, su, tekne ve yaratık görünüşünü aynı gerilim çizgisinde birleştirmek.

- Sakin başlangıç → tutarsızlık → yaklaşma → görünmeyen varlık → siluet → kısa tam görünüş sırasını düzenle; 42 saniyelik uyanışı önce değerlendir.
- Pusula, keşif ve fener için kısa sesler; uzaktaki olaylara yön hissi; büyük olay öncesinde sessizlik aralıkları ekle.
- Genel, ortam ve efekt ses düzeylerini ayır; reset/duraklatmada seslerin doğru kapanmasını koru.
- Su ve tekneyi ortak zaman/konum dalga örneklemesine bağla; uyanış şiddeti ikisine aynı kuralla etki etsin.
- Her alamete ses motifi, çevre davranışı ve kısa anlatı tepkisi ver; göz ve fener hedefini okunur tut.
- Mevcut üç sütunun konumunu ve yükselme koreografisini koru.

**Tamamlanma ölçütleri:** Dört alametin her birinde hedef bulunabiliyor; ses kapalıyken zorunlu bilgi kaybolmuyor; azaltılmış efektlerle final çalışıyor; su/tekne eşleşmesi farklı konumlarda ve uyanışta gözle doğrulanıyor; kulaklık ve dizüstü hoparlörü dinleme sonuçları kaydediliyor.

**Kapsam dışı:** Yeni büyük sahne veya yaratık modeli.

## Ritüel XIII — Tanıklık ve İnkâr

**Durum:** Doğrulama bekliyor · **Öncelik:** P2 · **Bağımlılık:** XII ve XI'deki oyuncu doğrulaması

Uygulama: [Ritüel XIII raporu](rituals/RITUAL_13_REPORT.md). İnsan testi açıkken uygulama, kullanıcının devam yönlendirmesi kapsamında yapıldı.

**Amaç:** Yeniden oynamaya anlamlı bir neden vermek.

- Tanıklık finalinin yanına bilinçli bir eylemle ritüelden vazgeçme sonucunu prototiple; kapatma/boş bekleme tek başına ikinci son sayılmasın.
- Alametleri küçük olay varyasyonlarıyla tekrar oynanışa bağla.
- Görülen alametler, bulunan notlar ve ulaşılan sonlar için küçük yerel kayıt ve açık bir kayıt temizleme davranışı ekle.
- Final istatistiklerini anlaşılır sun; anlatı ile skor sunumunun ağırlığını oyuncu geri bildirimiyle ayarla.

**Tamamlanma ölçütleri:** İki sonuç da bilinçli seçimle elde edilebiliyor; kayıt yenileme sonrası korunuyor, engelli depolamada oturum sürüyor; ikinci turda görünür farklılık var; yeniden deneme, yeni tur ve kayıt temizleme birbirine karışmıyor.

**Kapsam dışı:** Çok dallı hikâye ağacı ve kapsamlı ilerleme ekonomisi.

## Ritüel XIV — Hafifleyen Yük

**Durum:** Planlandı · **Öncelik:** P1 · **Bağımlılık:** XIII; VIII ölçümleri başlangıç referansı

**Amaç:** Tam içerikli deneyimin yükleme ve kare süresi maliyetini azaltmak.

- Aktif dokuları 34,65 MiB başlangıcından yaklaşık 12 MiB veya altına indirmeyi hedefle; önce 10,98 MiB deniz JPEG'ini incele. Bütçeyi görsel karşılaştırmayla kesinleştir.
- Low kalite için küçük doku varyantları kullan; başlangıçta kalite seçimi sun.
- Seçilmiş masaüstü cihazda 1080p/medium için 60 FPS hedefle; ham kare süresi ve yüzde 95 değerini raporla. Otomatik kaliteyi yalnız ölçüm gerektirirse ekle.
- `gl-matrix` sürümünü ve lisansını koruyarak yerelden sun; yükleme aşaması, hata ve tekrar denemeyi iyileştir.
- WebGL context kaybında anlaşılır geri dönüş sun; kaynak yaşam döngüsünü kontrol et.

**Tamamlanma ölçütleri:** Önce/sonra dosya boyutu, soğuk yükleme ve kare süresi aynı koşullarda karşılaştırılıyor; doku hedefi veya gerekçeli yeni bütçe belgeleniyor; düşük kalite daha küçük varlıkları yüklüyor; CDN erişimi olmadan yerel sunucudan açılıyor; eksik varlık ve context kaybı senaryolarında sessizce takılmıyor.

**Not:** VIII ölçümleri ciddi bir performans engeli gösterirse bu ritüelin gerekli kısmı öne alınır; içerik eklemeden önce engel kaldırılır ve sıra değişikliği kaydedilir.

## Ritüel XV — Son Mühür

**Durum:** Planlandı · **Öncelik:** P1 · **Bağımlılık:** VIII–XIV kapanışları

**Amaç:** Deneyimi yayınlanabilir durumda doğrulamak.

- Chrome, Edge ve Firefox'ta tam tur, iki son, dört alamet ve yeniden oynama akışını denetle.
- Ses izni, fare kilidi, soğuk yükleme, reset, sekme dönüşü, klavye kullanımı ve azaltılmış efektleri kontrol et.
- Küçük ekranda arayüzü kontrol et; klavye/fare gereksinimini belirt. Tam dokunmatik destek bu kapsamda değil.
- Gerekli davranış testlerini çalıştır; shader derleme ve tarayıcı hatalarını kontrol et; README'yi son davranışa göre güncelle.
- Test cihazı/tarayıcı sürümleri, PASS/FAIL sonuçları, kanıtlar ve kalan sorunlarla kapanış raporunu oluştur.

**Tamamlanma ölçütleri:** Ana akışı engelleyen hata yok; gerekli matrisin tamamı kanıtla doğrulanmış; performans bütçesi değerlendirilmiş; bilinen sınırlamalar yazılmış. Sonuç **yayına hazır** durumudur; barındırmaya yükleme ayrı işlemdir.

## Başlangıç ve ertelenen kapsam

VIII ve IX'un kodları ayrı `main` commitleriyle kaydedildi; kalan gerçek tarayıcı kontrolleri raporlarında açık. Kullanıcının sırayla uygulama yönlendirmesi kapsamında sıradaki geliştirme **X — Kaybolan Kuzey**.

Açık dünya, balıkçılık ekonomisi, savaş, crafting, çok oyunculu, motor değişimi ve tam mobil kontrol plan dışında. Önce kısa deneyimin oynanabilirliği ve atmosferi doğrulanacak.
