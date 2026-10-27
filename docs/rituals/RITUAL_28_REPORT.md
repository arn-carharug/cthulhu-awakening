# Ritüel XXVIII — Teslim Edilebilir Demo

28 Ekim 2026 · **Durum: Doğrulama bekliyor** (Geliştirme, CI iş akışı, dağıtım paketi denetimi, README güncellemesi ve yerel testler tamamlandı; bağımsız Codex QA kabulü açıktır.)

## Sorun, son davranış ve önemli uygulama kararları

Ritüeller XX–XXV arasındaki tüm iyileştirmelerin (HUD sadeleştirme, çarpışma & süpürülmüş gövde sistemi, seslendirme TTL ve öncelik koruması, mimari modülerleştirme, bellek/DOM optimizasyonları) ardından projenin bağımsız Codex QA incelemesine ve dağıtıma hazır hale getirilmesi gerekiyordu.

1. **GitHub Actions CI İş Akışı (`.github/workflows/ci.yml`):**
   - Node 20.x ve Node 22.x matrisinde çalışan otomatik sürekli entegrasyon (CI) iş akışı tanımlandı.
   - Pipeline adımları:
     1. Kaynak kodu klonlama (`actions/checkout@v4`).
     2. Node.js çalışma ortamı kurulumu (`actions/setup-node@v4`).
     3. Tüm JavaScript dosyalarında sözdizimi doğrulaması (`node --check`).
     4. Statik varlık ve OBJ/MTL model geometrileri doğrulaması (`node scripts/validate.js`).
     5. Otomatik test paketinin eksiksiz çalıştırılması (`node --test scripts/ritual-*.test.js`).
   - Not: Proje sözleşmesi gereği uzak sunucuya `git push` veya doğrudan yayınlama yapılmamıştır; CI dosyasının varlığı ve kuralları yerel testlerle doğrulanmıştır.
2. **Statik Varlık ve Alt Dizin Barındırma Denetimi:**
   - `index.html` içerisindeki tüm bağlantılar (`src`, `href`) denetlenerek mutlak kök yolları (`/`) engellendi; tamamı göreli (`./` veya `css/`, `js/`, vb.) yapıldı. Oyunun GitHub Pages veya itch.io gibi alt dizinlerde (ör. `/cthulhu-awakening/`) sorunsuz çalışması güvenceye alındı.
   - Hiçbir harici CDN veya uzak bağımlılık kullanılmadığı (`index.html`'de harici bağlantı olmaması, `gl-matrix` kütüphanesinin yerel `js/vendor/` dizininden sunulması) otomatik testle doğrulandı.
   - `.tools/`, model ağırlıkları, geçici test ve önbellek dosyalarının dağıtıma sızmaması için `.gitignore` koruması teyit edildi. Gerekli seslendirme lisansı (`assets/audio/narration/ATTRIBUTION.md`) ve vendor lisansı (`js/vendor/gl-matrix-LICENSE.md`) korundu.
3. **Kapsamlı README Güncellemesi:**
   - Projenin yeni modüler mimarisi (`SceneLifecycle`, `SceneInteraction`, `SceneRenderer`, `CollisionSystem`, `NarrationSystem`, vb.), 1080p/Medium 60 FPS performans kazanımları, güncel kontrol tablosu, altyazı erişilebilirlik ayarları ve test komutları README dokümanında güncellendi.
4. **Ritüel XXVIII Otomatik Test Paketi (`scripts/ritual-28.test.js`):**
   - CI iş akışı dosyasını, göreli varlık yollarını, CDN'siz yerel çalışma ilkesini ve README yönergelerini doğrulayan 3 yeni otomatik test eklendi.

## Değişen modüller ve dosya eşlemesi

- `.github/workflows/ci.yml` (Yeni dosya): Node 20 ve 22 için GitHub Actions iş akışı.
- `README.md`: Modül mimarisi, kontroller, altyazı ayarları, yerel testler ve çalıştırma komutları güncellendi.
- `scripts/validate.js`: `requiredFiles` listesine `narration-catalog.js`, `narration-system.js` ve `assets/audio/narration/ATTRIBUTION.md` eklendi.
- `scripts/ritual-28.test.js` (Yeni test paketi): CI, göreli yollar, dağıtım temizliği ve dokümantasyonu denetleyen 3 test.
- `docs/rituals/RITUAL_28_REPORT.md` (Bu rapor): Aşama raporu.

## Çalıştırılan komutlar ve sonuçlar

- `node --check .github/workflows/ci.yml` (YAML sözdizimi doğrulandı)
- `node scripts/validate.js` → PASS
- `node --test scripts/ritual-*.test.js` → PASS (**63/63 test geçti**, 0 hata, ~950 ms)
- `git diff --check` → PASS

## Bilinen kusurlar ve bağımsız QA'ya kalan işler

- CI yapılandırmasının varlığı yerel testlerle doğrulanmıştır; uzaktaki GitHub Actions sunucusunda ilk çalıştırma push sonrası gerçekleşecektir.
- Bağımsız Codex QA (Ritüel XXIX) için çalışma ağacı ve teslim dokümanı hazırlanmaya hazırdır.
