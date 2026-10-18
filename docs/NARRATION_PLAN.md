# Anlatıcı planı — İngilizce ses, ardından Türkçe kayıtlar

Durum: Planlandı. Ses kaydı üretilmedi; oyun entegrasyonu yapılmadı.

Kullanıcı kararı: İlk sürüm İngilizce AI anlatıcı; sonraki Türkçe anlatım kullanıcının kendi sesiyle yapılacak. Mevcut framework'süz WebGL 2 altyapısı korunacak. Bu plan, VIII–XV kapsamına eklenen yeni geliştirme dizisidir; XV'in açık kabul kontrollerini kapatmış sayılmaz.

## Ritüel XVI — Derinden Gelen Ses

Amaç: Anlatıcının tonunu ve üretim metnini belirlemek.

- Sakin, pes, tehditkâr, anlaşılır İngilizce; kontrollü nefes ve duraklamalar. Bağırma ve kelimeleri örten yoğun efekt kullanılmayacak.
- Önce üç kısa örnek: “You are no longer alone.”, “It sees you.” ve taş yazıtından bir bölüm. Tam kayıt paketinden önce kullanıcı bu örneklerden ses tarzını seçecek.
- Hizmet ve ses seçimi henüz yapılmadı. Üretimden önce kullanım/yayın hakları, indirme biçimi ve maliyet doğrulanacak; ücretli üretim ayrıca kullanıcı tarafından yetkilendirilecek. Bu ortamda doğrudan AI konuşma üretim aracı yok; ses dosyalarının sağlanması veya erişilebilir bir üretim hizmeti gerekiyor.
- R'lyeh ve Cthulhu için tutarlı telaffuz notu hazırlanacak; özel bir kişinin sesini taklit etmek gerekmiyor.
- İlk paket 10 kayıt: iki keşif, altı önemli anlatı anı ve iki final. Kontrol talimatları ve sürekli değişen HUD değerleri seslendirilmeyecek.

İlk kayıt metinleri:

- `discovery.journal`: The last entry ends mid-sentence: “The compass lies near the stones. Keep the pale beacon ahead. If the eyes open, the lantern can bear witness.”
- `discovery.stone`: A weathered inscription: “Three pillars keep the threshold. The sea remembers every visitor. What you choose to illuminate will remember you.”
- `awakening.rumble`: Something moves beneath the water.
- `awakening.presence`: You are no longer alone.
- `awakening.silhouette`: A shape eclipses the horizon.
- `awakening.eyes`: It sees you.
- `awakening.reveal`: Cthulhu awakens.
- `witness.begin`: Let the light bear witness.
- `ending.witnessed`: The sea remembers. So do you.
- `ending.refused`: The sea lets you pass. For now.

Sık aralıklı pusula, dalga, sütun ve şimşek altyazıları ilk sürümde yazılı kalacak. Böylece 42 saniyelik uyanış sürekli bir monoloğa dönüşmeyecek. Alamete özel ek cümleler bu paketin dışında.

Kabul: Üç örnek dinlenmiş, ses tarzı seçilmiş, 10 metin ve telaffuz sabitlenmiş; kayıtların kullanım hakkı ve üretim yolu belgelenmiş.

## Ritüel XVII — Sesin Bedeni

Bağımlılık: XVI'da seçilen ses ve kullanılabilir kayıtlar.

- Seçilen sesle 10 ayrı kayıt üretilecek. Düzenleme için temiz WAV kaynakları, oyun için sıkıştırılmış teslim dosyaları tutulacak.
- Kayıtlar kırpılma, dip gürültüsü, baş/son boşlukları ve birbirlerine göre ses yüksekliği açısından kontrol edilecek.
- Hafif yankı ve koyu tonlama uygulanacak; son sözcükleri örten uzun kuyruklardan kaçınılacak. Efektli teslim dosyaları hazırlanarak her cihazda aynı ses karakteri korunacak.
- Dosyalar `assets/audio/narration/en/` altında kararlı metin kimlikleriyle tutulacak. Manifest dil, kimlik, metin, dosya ve ölçülmüş süre içerecek; hizmet anahtarı istemciye konmayacak.
- Başlangıç hedefi: teslim seslerinin toplamı en fazla 3 MiB. Gerçek süre/kalite ölçümüyle bütçe yeniden değerlendirilebilir; bu rakam ölçülmüş sonuç değil.

Kabul: Eksiksiz 10 kayıt, süre manifesti ve kulaklık/hoparlör dinleme değerlendirmesi. Ses üretilmeden bu ritüel tamamlandı sayılmayacak.

## Ritüel XVIII — Deniz Konuşuyor

Bağımlılık: XVII teslim dosyaları; geliştirme için geçici test sesleri kullanılabilir, bunlar son ses diye sunulmayacak.

- Ayrı anlatıcı modülü ve dil kataloğu eklenecek. Sahne olayları dosya adlarını değil kararlı metin kimliklerini kullanacak.
- Başlangıçtaki kullanıcı etkileşimi ses bağlamını açacak. Kayıtlar yerelden oynatılacak; oynanış sırasında AI hizmetine istek yapılmayacak.
- Ana ses kapatma ve ana ses seviyesi anlatıcıyı da kapsayacak. Anlatıcı için ayrı aç/kapat ve ses seviyesi olacak; tercihler mevcut ayarlar gibi kalıcı tutulacak.
- Konuşma sırasında ortam/efekt sesi ölçülü biçimde azalacak ve konuşma bitince eski seviyeye dönecek. Duraklatma veya ses kapatma bu geçişi bozmamalı.
- Aynı anda tek cümle çalacak. Öncelik: final → keşif → uyanış. Eski cümleler birikip sonradan okunmayacak; tekrar tetikleme kontrol edilecek.
- Uyanış kayıtları mevcut 0,1 / 14 / 19 / 29 / 36 saniyelik olaylara, tanıklık cümlesi 42 saniyede başlayan aşamaya bağlanacak. Ölçülmüş kayıt süreleri bu aralıklara sığmalı; uzun cümle için görsel koreografi kendiliğinden uzatılmayacak.
- Altyazılar kayıt metniyle eşleşecek ve anlaşılır okuma süresiyle gösterilecek. Ses kapalı veya dosya eksik olsa da oyuncu metni görebilecek ve oyunu bitirebilecek.
- Keşif kartı dünyayı durdururken kendi anlatımı çalabilecek. Kart kapanınca kayıt kesilecek. Normal pause, odak/sekme kaybı ve ses kapatmada anlatım duracak; devam kullanıcı eylemiyle olacak.
- Reset/yeni tur bekleyen yükleme ve kayıtları iptal edecek. Geç gelen dosya eski turu konuşturmayacak; ses yükleme hatası sahneyi durdurmayacak.

Kabul: İki keşif ve iki final doğru sesle çalışıyor; kısa cümleler çakışmıyor; pause/reset/mute ve eksik dosya senaryoları doğrulanıyor. Metinsiz veya internete bağımlı zorunlu adım yok.

## Ritüel XIX — Yankının Sınanması

Bağımlılık: XVIII.

- Gerçek ses kaydıyla Chrome, Edge ve Firefox'ta başlangıç izni, keşif, uyanış, iki son ve tekrar oynama kontrol edilecek.
- Ana ses, anlatıcı seviyesi, ortamın kısılması ve sonradan normale dönmesi; sekme dönüşü, tekrar tekrar reset ve yavaş/başarısız dosya yükleme denenecek.
- Otomatik testler olay yönlendirmesi, tek ses sınırı, eski tur yüklemelerinin iptali ve ses tercihlerini kapsayacak. Otomatik testin geçtiği, insan dinlemesi yapılmış anlamına gelmeyecek.
- En az üç dinleyiciyle anlaşılabilirlik, ürkütücülük, fener/hedef seslerini bastırma ve yoruculuk değerlendirilecek. En az ikisi önemli cümleleri yardımsız anlayabilmeli.
- Ses paketinin gerçek dosya boyutu, yüklemeye etkisi ve bilinen tarayıcı sınırları raporlanacak.

Kabul: Sonuçlar PASS/FAIL/açık olarak kaydedilmiş; anlatıcı kapalıyken de oyun tamamlanabiliyor. Yayın kararı XV ve XIX'in açık kabul maddelerine birlikte bakılarak verilecek.

## Sonraki dil — Kullanıcının Türkçe anlatımı

İlk sürümde Türkçe dosya bulunmadığı için arayüzde çalışmayan Türkçe seçeneği gösterilmeyecek. Katalog baştan `en` ve ileride `tr` paketlerini destekleyecek; kayıt süreleri dile göre ayrı tutulacak. Türkçe altyazılar da aynı kimliklerle eşleşecek.

Kullanıcının kendi sesi için cümle başına ayrı temiz kayıt ve okuma yönergesi hazırlanacak. Türkçe paket sağlandığında `assets/audio/narration/tr/` altına eklenip süre, seviye ve telaffuz kontrolü yapılacak. Kısmi paket için açık İngilizce geri dönüşü tanımlanacak; tam TR ses ve metin paketi hazır olduğunda dil seçimi açılacak. Ses klonlama bu planın parçası değil.

## Uygulama sırası

Önce XVI'nın üç ses örneği ve üretim yolu somutlaştırılacak. Ardından XVII → XVIII → XIX. Her ritüel kendi raporu ve ayrı `main` commit'iyle ilerleyecek. Üretim hizmeti olmadan entegrasyon iskeleti geliştirilebilir; buna rağmen ses üretimi veya dinleme kabulü tamamlandı diye yazılmayacak. Push/yayın bu planın kapsamında değil.
