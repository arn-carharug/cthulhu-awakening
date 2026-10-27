# AG uygulama ve teslim kılavuzu

28 Ekim 2026 · Bu belge AG içindir. Ürün sırası [AG_ROADMAP.md](AG_ROADMAP.md), bağımsız test sözleşmesi [QA_ACCEPTANCE_PLAN.md](QA_ACCEPTANCE_PLAN.md) içindedir.

## Başlamadan önce

1. Çalışma ağacını, aktif dalı ve HEAD'i kontrol et. Başlangıç kod referansı `554a131`; sonradan eklenen devir dokümanı commit'i doğal olarak bunun üzerinde olabilir. Başka değişiklikler varsa ayrıştır, silme veya sıfırlama.
2. README, eski ritüel raporları ve yeni haritayı oku. Eski raporlar tarihsel kanıttır; geçmişte açık kalan testi şimdi yapılmış gibi yeniden yazma.
3. XX başlangıç raporunu oluştur ve gerekli kontrolleri çalıştır. Henüz yapılmayan aşamalar için boş PASS raporu üretme.

## Çalışma biçimi

- İlk teslim XX–XXV ve XXVIII kapsamıdır. XXVI–XXVII'yi ilk pakete otomatik ekleme. Kullanıcının daha sonraki açık yönlendirmesi kapsamı değiştirebilir.
- Her ritüeli ayrı, anlaşılır commit ile mevcut kullanıcı tercihi olan main üzerinde tut. Kapsam dışı kullanıcı değişikliklerini commit'e katma. Push veya yayın yapma.
- Gerekli düzeltme ve testleri tamamla; rutin uygulama ayrıntıları için gereksiz onay bekleme. İnsan katılımı veya ortam erişimi gerçekten yoksa bunu raporla, sonucu uydurma.
- Çalışır davranışı koru. Bir test başarısızsa nedenini çöz; kapsamı daraltarak veya testleri silerek başarılı görünme. Uygulama ayrıntısını tekrar eden çok sayıda test yerine anlamlı sınır/regresyon kontrolleri yaz.
- Refaktör ve görsel/oynanış değişikliklerini mümkün olduğunca ayrı tut. Sorun olduğunda hangi değişikliğin sebep olduğunu izlemek kolay olsun.
- Oyun arayüzüne ritüel numarası, üretim betiği veya geliştirici talimatı ekleme. Bunlar rapor ve F2 tanılamasında kalır.
- Yeni dış bağımlılığın gereğini açıkla. İstemciye anahtar/kimlik bilgisi koyma; oynanışta harici TTS çağrısı ekleme.

## Korunacak davranışlar

- Dört alametin tohumlu sırası; R ile aynı tur/alamet, yeni tur ile ilerleme.
- İki bilinçli son, finalde doğru odak/fare bırakma ve tekrar oynama.
- Pusula inceleme kapısı; feneri dört saniye hedefte tutma; keşiflerin isteğe bağlı olması.
- Reset sırasında geç yükleme, zamanlayıcı ve sesin yeni tura taşmaması.
- Sekme/odak kaybında durma ve kullanıcı eylemiyle devam.
- Reduced-motion, ayrı tekne/sarsıntı/yıldırım tercihleri ve ses kapalıyken tamamlanabilirlik.
- Engelli veya bozuk localStorage durumunda oturumun çalışması; arşiv temizlemenin diğer tercihleri silmemesi.
- Mevcut 10 İngilizce kaydın kimlikleri, kaynak/atıf bilgisi ve gelecekte kullanıcı sesiyle Türkçe paket yolu.
- Üç sütunun mevcut dünya konumu ve yükseliş koreografisi. Çarpışma mevcut geometriye uydurulur.
- Low/Medium/High seçenekleri, yerel gl-matrix, yerel varlıklar ve framework'süz çalışma.

## Mevcut temel komutlar

Proje kökünden:

```powershell
node --check main.js
node --check scripts/serve.js
node scripts/validate.js
node --test scripts/ritual-*.test.js
git diff --check
node scripts/serve.js
```

Yeni veya değişen JavaScript modüllerine ayrıca `node --check` uygula. Refaktör dosya adlarını değiştirirse komutları ve README'yi yeni gerçek yapıya göre güncelle; eski komutu çalışıyormuş gibi gösterme.

Ses dosyası değiştiğinde, Python ve FFmpeg/FFprobe mevcutsa:

```powershell
python scripts/verify-narration.py
```

Bu komut kanıt JSON'unu yeniden yazar. Yeniden üretilen kanıtı doğru ritüel raporuyla ilişkilendir. TTS üretimini ses entegrasyonu testi için gereksiz yere tekrar çalıştırma.

## Her ritüelin raporu

Uygulandığında `docs/rituals/RITUAL_20_REPORT.md` biçiminde rapor oluştur. Şunları içer:

- Durum: Planlandı / Devam ediyor / Doğrulama bekliyor / Tamamlandı.
- Sorun, son davranış ve önemli uygulama kararları.
- Değişen modüller ve varsa eski→yeni dosya eşlemesi.
- Çalıştırılan komut, sonuç, test cihazı/tarayıcı sürümü, çözünürlük, DPR ve kalite.
- Doğal rota ile tanılama üzerinden atlanan rota ayrımı.
- Önce/sonra kanıtları; yeni test kanıtları ayrı dosyalarda, eski kanıtların üzerine yazılmadan saklansın. Üretim betiği aynı kanıt yolunu zorunlu kullanıyorsa sürüm farkını raporda belirt.
- Bilinen kusurlar, erişilemeyen kontroller ve bağımsız QA'ya kalan işler.

Otomatik test PASS, gerçek tarayıcı PASS ve insan dinleme/oynama PASS ayrı iddialardır. Biri diğerine kanıt değildir.

## Codex'e son teslim

İşler bittiğinde **docs/AG_DELIVERY.md** dosyasını oluştur. Bu dosya henüz oluşturulmuş bir teslim veya kabul kaydı değildir; aşağıdaki başlıklarla AG tarafından doldurulacak:

1. Başlangıç SHA'sı ve QA'ya sunulan son kod commit'i. Belge sonradan commitlenirse kod SHA'sı ile belge SHA'sını ayır; kendi commit hash'ini dosyanın içine tahmin ederek yazma.
2. Uygulanan ritüeller, ayrı commit'ler ve rapor bağlantıları.
3. Çalıştırma adresi/komutu, kullanılan port, ek bağımlılık ve gerekiyorsa veri hazırlama adımları.
4. Gerçek komut/test sonuçları, bilinen FAIL/erişilemeyen koşullar ve kanıt yolları.
5. Doğal tam rota, iki son ve dört alamet için yeniden üretim adımları. Seed/cycle eşleşmesini kaydet; varsayarak dört turu dört alamet diye sayma.
6. UI/oynanış davranışı değişiklikleri ve mevcut kabul planıyla farkları. Özellik kaldırıldıysa açık gerekçe ve kullanıcı yetkisini belirt.
7. Performans karşılaştırmasının koşulları ve ham sonuçlar.
8. Kalan sorunlar, insan testi/dinleme ihtiyaçları ve ertelenen XXVI–XXVII kapsamı.
9. Son git çalışma ağacı durumu. Kullanıcıya ait korunmuş değişiklik varsa ayrı listele.

AG teslimi kullanıcı tarafından Codex'e bildirildiğinde Codex bağımsız QA'ya başlar. Bu dosyaların hazırlanması AG'ye otomatik mesaj göndermez ve arka planda izleme başlatmaz.
