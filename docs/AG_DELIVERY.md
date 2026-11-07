# AG Teslim Dokümanı — Cthulhu Awakening

28 Ekim 2026 · **İlk teslim durumu: Bağımsız Codex QA'ya Hazır** — Ritüel XXIX QA kararı: **FAIL**. Bulguların düzeltmeleri ve güncel kod SHA'sı [bölüm 10](#10-ritüel-xxix-qa-bulgularının-düzeltmeleri)'dadır.

Bu belge, Antigravity (AG) tarafından Ritüeller XX–XXV ve XXVIII geliştirmelerinin tamamlanması sonrasında, [docs/AG_IMPLEMENTATION_GUIDE.md](AG_IMPLEMENTATION_GUIDE.md) ve [docs/QA_ACCEPTANCE_PLAN.md](QA_ACCEPTANCE_PLAN.md) sözleşmelerine uygun olarak hazırlanmıştır.

---

## 1. Commit Referansları

- **Başlangıç Kodu Referans SHA'sı:** `554a131` (Devir ve yol haritası dokümanları `095b470` ile eklenmiştir)
- **QA'ya Sunulan Son Kod Commit SHA'sı:** `f59525f`
- **Teslim Belgesi Commit SHA'sı:** Bu belge eklendikten sonra oluşacak commit (kod commit'i ile belge ayrımı korunmuştur).

---

## 2. Uygulanan Ritüeller ve Rapor Bağlantıları

Tüm ritüeller sıralı olarak uygulanmış, her biri kendi otomatik test paketi, raporu ve ayrı bir git commit'i ile `main` dalına işlenmiştir:

| Ritüel | Commit SHA | Başlık / Kapsam | Rapor Bağlantısı |
|---|---|---|---|
| **XX** | `83b71b6` | Başlangıç doğrulama, doğal rota, 1080p ve 360×800 ekran görüntüleri, seyir/uyanış performans tabanı | [docs/rituals/RITUAL_20_REPORT.md](rituals/RITUAL_20_REPORT.md) |
| **XXI** | `626541d` | Sessiz Güverte: HUD sadeleştirme (`#torch-ui` paneline taşındı), kalıcı altyazı boyutu (`captionSize`) ve açma/kapatma, çakışmayan katmanlar | [docs/rituals/RITUAL_21_REPORT.md](rituals/RITUAL_21_REPORT.md) |
| **XXII** | `2aab5aa` | Ayrık Geometri: `CollisionSystem` modülü, süpürülmüş tekne gövdesi (rx=2.0, rz=4.7), sütun su altı/aktif durum ayrımı, 78.5° görüş konisi ve ışınlama | [docs/rituals/RITUAL_22_REPORT.md](rituals/RITUAL_22_REPORT.md) |
| **XXIII** | `96f7668` | Zamana Direnen Fısıltı: Seslendirme geçerlilik pencereleri (TTL), duraklatma süresinin hariç tutulması, bayat decode/fetch reddi | [docs/rituals/RITUAL_23_REPORT.md](rituals/RITUAL_23_REPORT.md) |
| **XXIV** | `f780a1c` | Ayrılan Düğümler: `main.js` refaktörü (`GameConfig.world`, `SceneLifecycle`, `SceneInteraction`, `SceneRenderer`), temiz test erişimi | [docs/rituals/RITUAL_24_REPORT.md](rituals/RITUAL_24_REPORT.md) |
| **XXV** | `666e620` | Ölçülü Akış: `FRAME_BUFFERS` matris/vektör havuzu, `DOM_CACHE` arayüz yazım kısıtlaması, varsayılan Medium kalitesi | [docs/rituals/RITUAL_25_REPORT.md](rituals/RITUAL_25_REPORT.md) |
| **XXVIII** | `f59525f` | Teslim Edilebilir Demo: `.github/workflows/ci.yml` CI iş akışı, dağıtım paketi temizliği, göreli yollar, kapsamlı `README.md` | [docs/rituals/RITUAL_28_REPORT.md](rituals/RITUAL_28_REPORT.md) |

*Not: Ritüel XXVI (Türkçe seslendirme paketi) ve Ritüel XXVII ("Deniz Başka Hatırlar": her alamete bağlı, mevcut ses/ışık/dalga ile yapılan kısa ve tekrar üretilebilir olaylar) yol haritası uyarınca ilk teslim kapsamı dışında tutulmuş ve ertelenmiştir. XXVII bir derin deniz / su altı simülasyonu değildir; bu kapsam açıkça dışarıdadır.*

---

## 3. Çalıştırma Talimatları ve Bağımlılıklar

- **Gereksinimler:** Node.js 20+ (Node.js 22 önerilir), WebGL 2 destekli modern bir web tarayıcısı.
- **Harici Bağımlılık / Derleme Adımı:** Sıfır (`package.json`, `npm install` veya webpack/vite gibi derleyiciler yoktur; saf WebGL 2; modüller ES modülü değil, sırayla yüklenen klasik `<script>` dosyalarıdır ve `window` üzerinden paylaşılır).
- **Yerel Sunucu Başlatma:**
  ```powershell
  node scripts/serve.js
  ```
- **Kullanılan Port:** Varsayılan `8000` (`http://127.0.0.1:8000`). Farklı port için: `$env:PORT=9000; node scripts/serve.js`.
- **Çevrimdışı Çalışma Garantisi:** Tüm OBJ modelleri, GLSL shader dosyaları, WebP dokuları ve 10 adet nöral seslendirme MP3 dosyası yerel olarak sunulur; hiçbir CDN veya harici API anahtarı gerekmez.

---

## 4. Gerçek Komut ve Test Sonuçları

Aşağıdaki çıktılar ilk teslim commit'i `f59525f` anına aittir. Güncel sonuçlar [bölüm 10](#10-ritüel-xxix-qa-bulgularının-düzeltmeleri)'dadır.

```powershell
# 1. Sözdizimi kontrolü (Tüm JS dosyaları)
node --check main.js
Get-ChildItem -Path "js/*.js", "scripts/*.js" | ForEach-Object { node --check $_.FullName }
# Çıktı: 0 hata (Tüm dosyalar geçerli)

# 2. Statik varlık ve OBJ/MTL model geometrileri doğrulaması
node scripts/validate.js
# Çıktı:
# assets/models/woodBoat.obj: 407 vertices, 900 indices
# assets/models/torch.obj: 15939 vertices, 73902 indices
# assets/models/compass.obj: 58 vertices, 108 indices
# assets/models/pillars.obj: 11520 vertices, 33834 indices
# assets/models/Horror_low_subd.obj: 12439 vertices, 66624 indices
# Static files and model buffers are valid.

# 3. Otomatik regresyon test paketi
node --test scripts/ritual-*.test.js
# Çıktı:
# ℹ tests 63
# ℹ suites 0
# ℹ pass 63
# ℹ fail 0
# ℹ cancelled 0
# ℹ skipped 0
# ℹ todo 0
# ℹ duration_ms ~950ms

# 4. Git diff sözdizimi ve boşluk kontrolü
git diff --check
# Çıktı: 0 hata
```

### Kanıt Dosyaları Listesi:
- `docs/rituals/evidence/ritual-20-desktop-1080p.jpg` (1080p masaüstü HUD görünümü)
- `docs/rituals/evidence/ritual-20-small-360x800.jpg` (360×800 dar görünüm kontrolü)
- `docs/rituals/evidence/ritual-20-baseline-voyage-1080p-medium.json` (Ritüel XX sakin seyir tabanı)
- `docs/rituals/evidence/ritual-20-baseline-awakening-1080p-medium.json` (Ritüel XX uyanış tabanı)
- `docs/rituals/evidence/ritual-25-optimized-voyage-1080p-medium.json` (Ritüel XXV optimize seyir ölçümü)
- `docs/rituals/evidence/ritual-25-optimized-awakening-1080p-medium.json` (Ritüel XXV optimize uyanış ölçümü)

---

## 5. Doğal Rota, İki Son ve Dört Alamet Yeniden Üretim Adımları

### A. Doğal Tam Rota (Tanıklık Sonu — `witness`)
1. `http://127.0.0.1:8000` adresini açın.
2. Başlangıç ekranında varsayılan `Medium` seçiliyken **Begin voyage** düğmesine tıklayın.
3. Fare ile etrafa bakın; teknedeki pirinç pusulaya tıklayın veya `E` / `#inspect-compass` düğmesine basın.
4. Pusula kerterizi okunduktan sonra `C` tuşuna basarak pusulayı indirin (hareket kilidi açılır).
5. `W` tuşu ile kuzeye, harabelere (`0, 0, -30`) doğru seyredin. Kuzey hedef işareti rehberlik eder.
6. Harabelere `< 40 m` kala `The Awakening Begins!` uyarısıyla 42 saniyelik doğal uyanış sekansı başlar.
7. Uyanış sırasında deniz kabarır, sis yoğunlaşır, tapınak sütunları sudan yükselir ve Cthulhu belirir.
8. `36. sn` reveal anında `Raise lantern` (`L` veya meşaleye tıklayarak) feneri yakın.
9. Fener ışığını Cthulhu'nun gözlerine doğrultarak 4 saniye kesintisiz tutun (odak çubuğu dolar).
10. **Sonuç:** `The Ancient One Has Awakened` son kartı açılır; fare kilidi güvenle serbest bırakılır, `witness:complete` durumu ve istatistikler arşive kaydedilir.

### B. İnkâr Sonu ve İptal Kontrolü (`refused`)
1. Harabelere yaklaşıp uyanışı başlattıktan sonra, son reveal aşamasında feneri yakmak yerine `B` tuşuna veya `#reject-light` (`Turn away`) düğmesine tıklayın.
2. Açılan `#choice-card` onay kutusunda önce `Keep the light` (`#reject-cancel`) düğmesine basarak seçimi iptal edin; oyunun duraklatmadan çıktığını ve devam ettiğini doğrulayın.
3. Tekrar `Turn away` düğmesine basıp bu kez `Extinguish the lantern and turn away` (`#reject-confirm`) ile onaylayın.
4. **Sonuç:** `You Withheld the Light` son kartı açılır, fener söner ve inkâr sonu arşive kaydedilir.

### C. Dört Alamet Sıralaması (Deterministik Tohum: `20261018`)
Konfor panelindeki varsayılan `20261018` tohumu ile `OmenSystem` 4 turluk deterministik bir torba (bag) üretir ve ardışık tekrar olmadan çalışır:
- **Tur 1 (Cycle I):** `The Hollow Calm` (Sakin ölü deniz, soluk gökyüzü, seyrek yıldırım)
- **Tur 2 (Cycle II):** `The Red Wake` (Kızıl dalgalar, kan rengi ufuk sisi)
- **Tur 3 (Cycle III):** `The Black Tide` (Zifiri siyah dalgalar, yoğun karanlık fırtına)
- **Tur 4 (Cycle IV):** `The Drowned Star` (Zümrüt yeşili/fosforlu deniz, parlak şimşekler)
- `R` tuşuna basıldığında mevcut turun tohumu ve alameti **korunur**; son kartından `Witness it again` denildiğinde bir sonraki tura geçilir.

---

## 6. UI ve Oynanış Davranışı Değişiklikleri

Mevcut hiçbir temel özellik kaldırılmamış; kabul planındaki UX eksikleri giderilmiştir:
1. **Sadeleştirilmiş HUD (Ritüel XXI):** Normal seyir sırasında sol üstte gereksiz yere duran teknik meşale kutusu (`#torch-ui`) `F2` tanılama paneline taşındı.
2. **Çakışmayan Arayüz Alanları:** Dar ekranda (360×800) ve 1080p'de pusula inceleme butonu, seyir ipucu (`#voyage-hint`) ve altyazı kutusu (`#ritual-caption`) CSS Grid ve katmanlama ile ayrık bölgelere yerleştirildi.
3. **Kalıcı Altyazı Tercihleri:** Konfor panelinde altyazı açma/kapama (`captionsEnabled`) ve boyut (`small` 0.85rem, `medium` 1.05rem, `large` 1.35rem) seçenekleri eklendi; altyazı kapatıldığında anlatıcı ses kapalı olsa bile seyir ipuçları ve görev paneli korunur.
4. **Klavye Erişilebilirliği:** Tüm etkileşimli düğmelere `:focus-visible` dış hatları (outline) eklendi; modal iletişim kutularında `Tab` tuşu döngüsü sağlandı.
5. **Gelişmiş Çarpışma (Ritüel XXII):** Teknenin sütunlara ve işaret taşına tünelleme yapması eliptik süpürülmüş gövde (`CollisionSystem`) ile engellendi; tapınak sütunları batıkken teknenin üzerinden geçmesine izin verirken, uyanışta yükseldiğinde tekneyi kaydırarak engeller.
6. **TTL ve Seslendirme Koruma (Ritüel XXIII):** Ağ gecikmesi durumunda bayat seslerin geç konuşup altyazıyı ezmesi engellendi; duraklatma süreleri TTL penceresinden düşüldü.

---

## 7. Performans Karşılaştırması (Ritüel XX Tabanı vs Ritüel XXV Optimize)

Ölçümler birebir aynı kontrol cihazında (`ANGLE (Intel, Intel(R) UHD Graphics Direct3D11)`), `1920×1080`, `DPR = 1`, `Medium` ön ayarında soğuk yenileme sonrası doğal rota üzerinde Headless Chromium CDP ile toplanmıştır (600 aktif kare penceresi):

| Metrik | Ritüel XX Tabanı | Ritüel XXV Optimize | İyileşme Oranı |
|---|---|---|---|
| **Sakin Seyir — FPS** | `70,05 FPS` | **`107,11 FPS`** | **+%52,9** |
| **Sakin Seyir — Ortalama Kare Süresi** | `14,27 ms` | **`9,34 ms`** | **-%34,6** |
| **Sakin Seyir — p95 Kare Süresi** | `27,40 ms` | **`14,10 ms`** | **-%48,5** |
| **Uyanış Sekansı — FPS** | `38,93 FPS` | **`94,00 FPS`** | **+%141,5** |
| **Uyanış Sekansı — Ortalama Kare Süresi** | `25,69 ms` | **`10,64 ms`** | **-%58,6** |
| **Uyanış Sekansı — p95 Kare Süresi** | `34,80 ms` | **`14,20 ms`** | **-%59,2** |

> [!IMPORTANT]
> Bu değerler AG'nin kendi ölçüm anlık görüntüleridir. Ritüel XXIX QA'sı bunları bağımsız olarak yeniden ölçemedi; **+%141,5 FPS** ve **60 FPS hedefinin karşılandığı** sonucu onaylanmadı. Anlık görüntülerin varlığı, iyileşmenin nedeninin bellek ayırma/GC olduğunu göstermez. QA-F04 düzeltmesinden (`3847023`) sonra da yeniden FPS ölçümü yapılmadı.

> [!WARNING]
> **Ritüel XXV sütunu geçersizdir.** Ritüel XXIV'ten (`f780a1c`) Ritüel XXXIX'a (`633f7bc`) kadar izdüşüm matrisi hiç yüklenmiyordu: pencere boyutu değişmedikçe her kare yalnızca temizleme rengini gösteriyor, hiçbir piksel gölgelendirilmiyordu (tarayıcı duman testi ve commit'ler arası tarama ile bulundu). XXV ölçümleri bu dönemde alındığı için XX ile karşılaştırma iyileşmeyi değil boş kareyi ölçer.

---

## 8. Bilinen Sınırlamalar, İnsan Testleri ve Açık Bırakılan Maddeler

Aşağıdaki maddeler dürüst raporlama ilkesi uyarınca ön testlerde "geçti" olarak gösterilmemiş, bağımsız Codex QA (Ritüel XXIX) incelemesine açık bırakılmıştır:

1. **İnsan Dinleme ve Duygusal Ton Değerlendirmesi:** 10 adet İngilizce seslendirme kaydının (rumble, presence, silhouette, reveal, witness, endings, discoveries) frekans seviyeleri, miksaj dengesi ve Cthulhu anlatım tonunun uygunluğu insan dinlemesi ile doğrulanmalıdır.
2. **Kullanıcı Oynanış Hissi (Game Feel):** Teknenin WASD/yön tuşlarıyla dalgalar üzerindeki manevra kabiliyeti, fenerin Cthulhu'nun gözlerine odaklanma toleransı ve inkâr sonu onay penceresinin gerginlik hissi insan playtesting testine açıktır.
3. **Farklı Tarayıcı Motorları:** Headless Chromium üzerinde otomatik CDP testleri tamamlanmış olsa da, macOS Safari (WebKit), Firefox (Gecko) ve mobil dokunmatik cihazlardaki WebGL 2 ve Web Audio API davranışları bağımsız QA matrisinde test edilmelidir.
4. **Ertelenen Ritüeller (XXVI ve XXVII):** Kullanıcı ses kayıtları hazır olana kadar Türkçe seslendirme paketi (XXVI) ve alamete bağlı kısa tekrar oynama olayları (XXVII, "Deniz Başka Hatırlar") ilk teslim paketine dahil edilmemiştir. Derin deniz / su altı bölümü kapsam dışıdır.

---

## 9. İlk Teslim Anındaki Git Çalışma Ağacı Durumu

```text
On branch main
Your branch is ahead of 'origin/main' by 8 commits.
  (use "git push" to publish your local commits)

nothing to commit, working tree clean
```

- Kapsam dışı hiçbir kullanıcı değişikliği ezilmemiş veya silinmemiştir.
- Uzak depoya `git push` veya dış dağıtım yapılmamıştır.
- Çalışma ağacı temizdir ve bağımsız Codex QA incelemesine hazırdır.

---

## 10. Ritüel XXIX QA Bulgularının Düzeltmeleri

[QA_REPORT.md](QA_REPORT.md) (Ritüel XXIX, karar **FAIL**) bulgularının her biri ayrı commit ile düzeltildi. Her commit kendi regresyon testini içerir; testler düzeltme öncesi kodda başarısız olduğu doğrulanarak yazıldı.

- **QA'nın incelediği teslim HEAD'i:** `ec5296e` (son kod commit'i `f59525f`)
- **Yeniden QA'ya sunulan son kod commit'i:** `3847023`
- **Belge düzeltmeleri (QA-F06):** bu bölümü ekleyen commit

| Bulgu | Commit | Düzeltme | Regresyon testi |
|---|---|---|---|
| **QA-F01** (P2) | `11e72bc` | Çakışmadan kurtarma bütün etkin engellere birlikte uygulanır; tek geçişte çıkmazsa her engelin dışındaki en yakın sınır noktası seçilir. `discovery-system.js` içindeki kopya `InternalCollisionSystem` kaldırıldı. | `scripts/ritual-30.test.js` (iki engel sırası, sıkışıkken hareket, ikinci engele kayma) |
| **QA-F02** (P2) | `cf8d6b8` | `GameConfig.world` gerçek tek kaynak: çarpışma, keşif, görüş hattı, navigasyon, sıfırlama ve Cthulhu konumu oradan okunur. Config'teki günlük konumu oyundaki gerçek konuma (`[8, -2.7, 43]`) düzeltildi; nesne yerleri değişmedi. | `scripts/ritual-31.test.js` (değiştirilmiş dünya tanımıyla bütün modüller aynı sonucu verir) |
| **QA-F03** (P2) | `6e10ec2` | Yükleme zaman aşımı isteği sonlandırır, Loading durumunu temizler; geç gelen fetch/decode sonucu oynatılmaz. Duvar saati yükleme süresi (15 sn) duraklatmaya bağlı TTL'den ayrıldı. | `scripts/ritual-32.test.js` (hiç dönmeyen ve geç dönen decode, takılan fetch) |
| **QA-F05** (P2) | `688527b` | "Read aloud" isteği kimlik taşır; kart kapanması, yeni kart, son kartını geçme, reset ve daha yeni istek, ses etkinleştirmesini bekleyen eski isteği iptal eder. | `scripts/ritual-33.test.js` (gerçek yaşam döngüsü adaptörü) |
| **QA-F04** (P2) | `3847023` | Gerçek `drawScene()` zinciri ölçüldü: kare başına 2 (seyir), 4 (pusula), 8 (yanık fener) gl-matrix tamponu ayrılıyordu; artık 0. README iddiası ölçülen kapsamla sınırlandı. | `scripts/ritual-34.test.js` (sayaç gerçek `drawScene()`'i saydırır; fener matrisi eski algoritmayla aynıdır) |
| **QA-F06** (P3) | bu commit | Bu belgedeki 9 kırık bağlantı, XXVII kapsam tanımı, "ES6 modülleri" ifadesi ve performans iddiası düzeltildi; RITUAL_28 raporundaki yanlış YAML doğrulama yöntemi işaretlendi; README'deki test sayısı kaldırıldı. | `scripts/ritual-35.test.js` (README ve docs altındaki bütün göreli bağlantılar çözülür) |

### Güncel komut sonuçları

Windows, Node.js `v24.19.0`, Python `3.12.10`:

```powershell
node --check main.js; Get-ChildItem js/*.js, scripts/*.js | ForEach-Object { node --check $_.FullName }
# 0 hata

node scripts/validate.js
# Static files and model buffers are valid.

node --test scripts/ritual-*.test.js
# ℹ tests 93
# ℹ pass 93
# ℹ fail 0

node docs/qa/ag-delivery-probes.cjs
# QA-F01, QA-F02, QA-F02b, QA-F03, QA-F04, QA-F05, QA-PASS-01: pass = true (exit 0)
# Not: betik docs/qa/AG_QA_PROBES.json dosyasının üzerine yazar; QA kanıtı olarak saklanan sürüm değiştirilmedi.

python -c "import yaml; yaml.safe_load(open('.github/workflows/ci.yml'))"
# Hata yok (yalnız YAML ayrıştırması; GitHub Actions çalışması değildir)

git diff --check
# 0 hata
```

### Hâlâ açık olanlar

Bu düzeltmeler QA'nın "çalıştırılmayan ve açık kalan" listesini kapatmaz:

- Chrome/Edge/Firefox × dört alamet × iki son tarayıcı matrisi, gerçek HUD görüntüsü, %200 büyütme ve dar ekran odak kontrolü.
- Gerçek ses izinleri/oynatımı, fare kilidi, sekme görünürlüğü geçişleri ve insan dinlemesi.
- Karşılaştırılabilir FPS/p95 yeniden ölçümü (QA-F04 değişikliğinden önce ve sonra ölçülmedi).
- Uzak GitHub Actions çalışması; commit'ler push edilmedi.

Yapılan sınırlı tarayıcı kontrolü: oyun Claude masaüstü uygulamasının dahili tarayıcı panelinde yerel sunucuyla açıldı; yolculuk, pusula inceleme, uyanış, gözler, kamera sarsıntısı ve yanık fener durumlarında konsol hatası görülmedi. Bu panelde sahne çok karanlık görünüyor; değişiklik öncesi sürümde de aynı olduğu için görsel kalite buradan değerlendirilmedi.
