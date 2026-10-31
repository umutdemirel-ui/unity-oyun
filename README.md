# FELLHAVEN — oynanabilir fantezi RPG prototipi (dikey kesit)

Tarayıcıda çalışan, **Three.js + Vite** ile yazılmış üçüncü şahıs aksiyon-RPG prototipi. **Unity kullanılmamıştır.**
Depodaki CC0 varlıklar (ambientCG `Ground037`, Poly Haven `Rock09`, `TreeStump01`, `TreeSmall02`) oyun içinde kullanılır; ayrıntı için **[ASSET_CREDITS.md](ASSET_CREDITS.md)**.

## Çalıştırma
```bash
npm install
npm run dev        # http://localhost:5173  (0.0.0.0'a bağlanır)
npm run build && npm run preview
npm test           # çekirdek mantık birim testleri (Node, tarayıcı gerekmez)
npm run assets     # ham FBX/EXR/JPG → public/assets (zaten üretilmiş halde depoda)
```
URL parametreleri: `?q=low` (gölgesiz/düşük çözünürlük), `?touch=1` (dokunmatik arayüzü zorla), `?autostart=1`, `?god=1` (test için ölümsüzlük).

## Oynanış
Köy ihtiyarı **Maren** ile konuş → **"Eski Yolun Gölgeleri"** görevini al → kuzeybatıdaki Gözcü Yolu kampında 4 **Goblin Akıncı**yı ve **Yosun Trolü** (boss) yen → **Gözcü Mührü**'nü Maren'e götür (XP, altın, Demir Kılıç, iksir). Demirci **Torin**'den alışveriş yapılır. Gizli alan: güneydoğudaki **Fısıldayan Taşlar**'da sandık vardır.

| Kontrol | Tuş |
|---|---|
| Hareket / koş / zıpla | `WASD` / `Shift` / `Space` |
| Kamera | Fare (tıklayınca kilitlenir), tekerlek = yakınlaştır, ok tuşları = alternatif |
| Hafif / ağır saldırı | Sol tık / Sağ tık veya `X` |
| Blok (basılı) / kaçış yuvarlanması | `F` / `V` veya `Ctrl` |
| Etkileşim | `E` |
| Envanter / günlük / yardım | `I` (`Tab`) / `J` / `H` |
| Eşya kullan / seçili eşyayı değiştir | `Q` / `R` |
| Duraklat-kaydet / ses | `Esc` / `M` |

Mobil (yatay): sol joystick, sağda saldırı/ağır/blok/kaçış/zıpla/etkileşim düğmeleri, boş alanda sürükleyerek kamera.

## Sistemler
* **Oyuncu**: yürüme/koşma/zıplama, can, dayanıklılık (koşma, saldırı, kaçış, blok harcar), XP/seviye (maks. 20), envanter (24 slot, yığınlama), ekipman (silah/zırh).
* **Savaş**: hafif/ağır saldırı (menzil, yay, süre ve dayanıklılık maliyeti farklı), kısa otomatik hedefe dönme, geri tepme, sersemleme, kritik vuruş, blok (hasarı azaltır, dayanıklılık harcar, savunma kırılabilir), **savuşturma** (vuruştan hemen önce blok), kaçışta dokunulmazlık, kıvılcım/yüzen hasar sayısı/ekran sarsıntısı/ses.
* **Düşmanlar**: devriye → algıla (alert) → takip → saldırı (telegraph'lı) → sersemleme → menzil/yaprak kaybında geri dönüş + can yenileme. Boss'un her 3. saldırısı alan hasarlı yer vuruşudur, can %50 altında hızlanır.
* **Görev/NPC**: duruma bağlı diyalog ağacı, görev durum makinesi (`available→active→ready→completed`), takipçi + günlük (J), ödül (XP/altın/eşya), dükkân (al/yarı fiyata sat).
* **Eşya yapısı** (`src/core/items.js`): `weapon, armor, potion, food, material, quest`. Yeni eşya = tek kayıt.
* **Dünya**: ~320×320 m arazi (Ground037, tekrar kırıcı shader), dağ halkası, göl + nehir, orman (TreeSmall02), kayalar (Rock09), kütükler (TreeStump01), köy, goblin kampı, maden girişi, gizli taş halkası. Gündüz/gece (10 dk), hava (açık/bulutlu/yağmur), yıldız/ay, köy fenerleri ve pencereler geceleri yanar, sentezlenmiş ortam sesleri (rüzgâr, kuş, cırcır, yağmur).
* **Kayıt**: `localStorage` (`fellhaven.save.v1`). Konum, can/dayanıklılık, seviye/XP, envanter+ekipman+altın, görev ilerlemesi, yenilen düşmanlar, toplananlar, saat. Otomatik (30 sn + önemli olaylar + sekme kapanırken) ve `Esc` menüsünden elle. Bozuk/uyumsuz kayıt ve dolu depolama için kullanıcıya mesaj gösterilir.

## Doğrulama (nasıl, ne kadar)
* `npm test`: 11 birim testi (envanter, ekipman, XP, görev, diyalog, kayıt gidiş-dönüş/bozuk kayıt/kota hatası, dünya yerleşimi, **yolların su altında kalmaması**).
* `tools/e2e/*`: başsız Chromium'da (SwiftShader WebGL2) çalıştırıldı: etkileşim ipucu → diyalog → görev kabulü → dükkân satın alma → bot ile gerçek savaş (devriye/alert/takip/saldırı/sersemleme/ölüm, XP/seviye atlama) → boss dövüşü (blok, kaçınma, darbe, yer vuruşu) → görev teslimi/ödül → kaydet → **sayfayı yenile → devam et** → bozuk kayıt mesajı → gerçek klavye (`I`,`J`,`Esc`,`W`) → ölüm ekranı/yeniden doğma → köyden boss arenasına yürüyüş. Ekran görüntüleriyle gündüz/gece/yağmur, envanter, dükkân, dokunmatik yerleşim görsel olarak kontrol edildi.

## Bilinen sınırlar ve dürüst notlar
* **Gerçek GPU/cihazda performans ölçülmedi.** Sahne ~1,2–1,9 M üçgen çiziyor (yakın ağaçlar ~35 bin üçgen, uzaktakiler ~9 bin; hücre bazlı LOD/culling var). Yavaş cihazlarda `?q=low` deneyin. Hedef FPS doğrulanmadı.
* **Mobil/dokunmatik gerçek cihazda test edilmedi.** Yalnızca masaüstü Chromium'da dokunmatik emülasyonla yerleşim ve joystick hareketi doğrulandı. Hotbar/düğme yerleşimi farklı ekranlarda ayar isteyebilir.
* **Ses duyularak doğrulanmadı** (başsız ortam). Sesler WebAudio ile sentezlenir; ilk tıklamadan sonra başlar. Dengesi ayar isteyebilir.
* **Pointer lock** gömülü önizleme (iframe) içinde engellenebilir; bu durumda sağ tuş sürükleyerek veya ok tuşlarıyla kamera döndürülür. Ağır saldırı için `X` tuşu bu yüzden de vardır.
* **At/binek sistemi ertelendi** (ilk sürümde yok).
* Tüm **karakterler, köy binaları, çadırlar, sandık, maden girişi geçici low-poly geometridir** (depoda bu varlıklar yok); Poly Haven ağaç/kaya/kütükle görsel stil farkı vardır. Ağaç, 2 M üçgenli kaynaktan türetilmiş yaklaşık sürümdür.
* Arayüz simgeleri emoji'dir; emoji fontu olmayan sistemlerde boş görünebilir (envanterde eşya adı da yazılır).
* Düşmanların görüş/engel algısı yok (basit mesafe algılama); nehir/derin su yürünemez (köprü yok).
* Kayıt yalnızca tarayıcıya yereldir; çoklu slot yok.

## Yapı
`src/core/` saf mantık (eşya, envanter, ilerleme, görev, diyalog, kayıt, dünya üretimi) · `src/game/` Three.js sahne, oyuncu, düşman, çevre, ses · `src/ui/` DOM arayüz ve dokunmatik · `tools/` varlık hazırlama, testler, e2e.
