# Varlık Kaynakları, Lisanslar ve İşleme Notları

Bu dosya Fellhaven prototipinde **gerçekten kullanılan** varlıkları listeler. Lisans bilgisi hem depodaki
`README_Lisans_Kaynaklar.md` dosyasından hem de **31 Ekim 2026'da kaynak sayfalardan okunarak** doğrulanmıştır
(CC0 etiketi sayfada görüldü). CC0 atıf zorunluluğu getirmez; yine de kaynak/yazarlar burada belgelenmiştir.

## Ham varlıkların depodaki gerçek yolları (değiştirilmedi)

| Varlık | Yol | Kaynak | Yazar | Lisans |
|---|---|---|---|---|
| ambientCG Ground037 (2K-JPG) | `ambientCG/Ground037/Ground037_2K-JPG_{Color,NormalDX,Roughness,AmbientOcclusion}.jpg` | https://ambientcg.com/view?id=Ground037 | ambientCG | CC0 (https://docs.ambientcg.com/license/) |
| Poly Haven Rock 09 | `PolyHaven/Rock09/rock_09_2k.fbx`, `PolyHaven/Rock09/textures/*` | https://polyhaven.com/a/rock_09 | Jenelle van Heerden | CC0 |
| Poly Haven Tree Stump 01 | `PolyHaven/TreeStump01/tree_stump_01_2k.fbx`, `.../textures/*` | https://polyhaven.com/a/tree_stump_01 | Rob Tuytel | CC0 |
| Poly Haven Tree Small 02 | `PolyHaven/TreeSmall02/tree_small_02_2k.fbx`, `.../textures/*` | https://polyhaven.com/a/tree_small_02 | Rico Cilliers | CC0 |

Poly Haven lisansı: https://polyhaven.com/license

## Oyunda kullanılan, web için üretilmiş türevler (`public/assets/`)

`npm run assets` (`tools/prepare-assets.mjs`) ham dosyalardan bunları yeniden üretir. Ham dosyalar oyun tarafından **doğrudan yüklenmez**.

| Üretilen dosya | Kaynak | İşlem |
|---|---|---|
| `ground037/color.jpg` | Ground037 Color | 2K→1K, sRGB renk dokusu. Zemin materyali. |
| `ground037/normal_gl.jpg` | Ground037 NormalDX | 1K, **yeşil kanal ters çevrildi** (DirectX→OpenGL; three.js OpenGL bekler). |
| `ground037/rough.jpg`, `ao.jpg` | Ground037 Roughness / AO | 1K gri, lineer veri (sRGB değil). |
| `rock09/rock_lod0.glb` (12.416 üçgen), `rock_lod2.glb` (3.104) | `rock_09_2k.fbx` LOD0 / LOD2 | FBX'in kendi LOD'larından seçildi; dünya matrisi pişirildi, ölçek 0,1. Yakında LOD0, uzakta LOD2 (hücre bazlı). |
| `rock09/diff.jpg`, `normal_gl.jpg`, `rough.jpg` | `rock_09_diff_2k.jpg`, `rock_09_nor_gl_2k.exr`, `rock_09_rough_2k.exr` | EXR'ler Three.js `EXRLoader` ile Node'da çözülüp 1K JPG yapıldı. |
| `stump01/stump_low.glb` (4.061 üçgen) | `tree_stump_01_2k.fbx` (41.046 üçgen) | Three.js `SimplifyModifier` ile sadeleştirildi, ölçek 0,01 (≈1,6 m). |
| `stump01/diff.jpg`, `normal_gl.jpg`, `rough.jpg` | stump dokuları | 1K. |
| `tree_small02/tree_game.glb` (gövde 3.265 + dal 11.782 + yaprak 20.168 = ~35 bin üçgen) | `tree_small_02_2k.fbx` | **Bkz. aşağıdaki risk notu.** |
| `tree_small02/tree_far.glb` (~9 bin üçgen) | aynı | Uzak LOD. |
| `tree_small02/trunk_*.jpg`, `branch_diff.webp`, `leaves_rgba.webp` | ağaç dokuları | Yaprak rengi + alfa tek RGBA WebP (1K); dallar 512. Dal/yaprak normal ve roughness haritaları **kullanılmadı** (boyut/performans). |

Toplam `public/assets` ≈ 10 MB (ham varlıklar ≈ 190 MB).

## Doğrulanan riskler ve alınan önlemler

* **Tree Small 02**: FBX'te beklenen LOD'lar **yok**; yalnızca `LOD0` var ve **2.062.485 üçgen** (75 MB). Ham haliyle web oyununda kullanılamaz. Önlem: gövde sadeleştirildi, dalların 1/8'i tutuldu, her yaprak parçası (~19 üçgen, 29.783 adet) UV→3B afin uyumuyla **2 üçgenlik karta** indirgendi ve 1/3'ü tutulup büyütüldü. Bu, **orijinal modelin sadık bir kopyası değil, oyun için türetilmiş yaklaşık bir sürümdür** (taç orijinalden daha seyrek/düz görünür).
* **Rock 09**: Sayfadaki "23K üçgen", FBX'teki LOD0–3 toplamıdır (12.416+6.208+3.104+1.552). Tekil kaya LOD0'dır. Tüm model birimleri FBX'te `×100` ölçekle geliyor; metre cinsinden gerçek boyut güvenilir değildi, görsel olarak ayarlandı.
* **Ground037** gerçek boyutu ≈ 2,1 m × 2,1 m; döşeme bu ölçekte tekrarlanır. Tekrar belli olmasın diye shader'da ikinci, büyük ölçekli örneklemeyle renk modülasyonu yapılır (`src/game/world.js`).
* Normal haritalar OpenGL (`nor_gl`) kullanıldı; albedo `SRGBColorSpace`, diğerleri lineer.
* Dokular GLB'lerin UV sözleşmesine uygun olarak `flipY=false` yüklenir.

## Poly Haven / ambientCG dışı içerik

* **Geçici (placeholder) geometri — depoda bu varlıklar yok:** köy evleri, kuyu, demirhane, fenerler, goblin kampı çadırları ve ateşi, maden girişi, sandık, toplanabilir ot/elma, **tüm karakterler (oyuncu, NPC'ler, goblin, Yosun Trolü)**. Hepsi koddan üretilen basit low-poly şekillerdir. Ev dokuları kodla çizilen (canvas) geçici dokulardır.
* **Ses**: Depoda ses dosyası yok; tüm sesler WebAudio ile sentezlenir (`src/game/audio.js`). Harici ses indirilmedi.
* Arayüz simgeleri Unicode emoji'dir (sistem fontuna bağlı). Harici font/ikon kullanılmadı.
* Gökyüzü, güneş/ay, yıldızlar, yağmur: koddan üretilir.
