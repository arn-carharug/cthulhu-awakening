# Ritüel XVIII — Deniz Konuşuyor

Durum: Oyun entegrasyonu uygulandı; otomatik ve in-app tarayıcı kontrolleri yapıldı. Nihai dinleme/normal tarayıcı kabulü XIX'te açık.

`NarrationSystem`, İngilizce katalog kimliklerini mevcut olaylara bağlıyor. Tek aktif Web Audio kaynağı var; final keşfi, keşif uyanış cümlesini kesebilir. Bekleme kuyruğu oluşturulmaz. Kayıtlar ihtiyaç oldukça yerelden indirilip çözülür ve oturumda önbelleğe alınır. Eksik dosya veya çözülemeyen ses oyunu engellemez; mevcut yazılar kalır.

Anlatıcı ayrı gain yoluyla mevcut kompresöre bağlandı. Dünya duraklatılınca not/final kartı konuşabilir; normal pause ve odak kaybı konuşmayı durdurur. Normal pause/resume çözülmüş kaydın ofsetini korur. Odak kaybı sonrası otomatik devam yok; kartın Read aloud/Replay narration düğmesi veya normal Resume kullanılır. Kart kapanması ve reset kaynakları durdurur. İptal denetimi geç gelen fetch/decode sonuçlarının eski turu konuşturmasını önler.

Comfort & replay altında kalıcı English narrator ve Narrator volume ayarları var. Ana mute/ses seviyesi anlatıcıyı da kapsıyor. Mute eski cümleyi düşürür; unmute geçmişte kalmış metni yeniden okutmaz. Konuşurken yalnız ortam/efekt bus'ı %38'e düşer, bitince geri gelir; kayıtlı kanal tercihleri değiştirilmez. Altyazı gerçek çözülmüş kayıt süresine göre tutulur; bu sırada kısa ara cümleler onu kapatmaz.

Not ve final kartlarına yeniden okuma düğmeleri eklendi. Yeniden okuma açık kullanıcı eylemiyle ses bağlamını etkinleştirir; ayrı anlatıcı seçeneğini de açar. Dil kataloğu eksik bir Türkçe girdide İngilizce girdiye dönebilir. Türkçe paket olmadığı için sahte dil seçeneği gösterilmiyor.

Kontroller: tek kaynak/öncelik, tekrar bastırma, pause/ofset, kart sırasında dünya pause'u, odak kaybı, mute ve ses tercihleri, gecikmiş fetch/decode iptali, eksik dosya, dil geri dönüşü ve gerçek dosya/manifest tutarlılığı. Mevcut sahne testi de gerçek olay adaptörünü kapsıyor. Güncel toplam doğrulama XIX raporunda.

In-app Chromium: günlük otomatik okuma, yeniden okuma, kart kapanınca durma; normal pusula→seyir→uyanış→fener→tanıklık rotası (4/4, %100 odak, 4 sn tutuş); final Replay narration ile gerçek kaydın çözümlenip oynatılması. Konsol hatası/uyarısı yok. Bu, insan dinleme veya normal Chrome/Edge/Firefox matrisi değildir.

![Sesli günlük](evidence/ritual-18-narrated-journal.jpg)
