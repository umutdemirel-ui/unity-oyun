# Fellhaven için ücretsiz gerçekçi 3D assetler

Bu klasör, yeni oluşturulacak Fellhaven RPG projesine verilebilecek kaynak assetleri içerir. Dosyalar 31 Ekim 2026 tarihinde düzenlendi.

## İçerik

| Klasör | İçerik | Kaynak ve lisans | Kullanım notu |
|---|---|---|---|
| ambientCG/Ground037 | 2K renk, DirectX normal, roughness ve ambient occlusion PBR haritaları | https://ambientcg.com/view?id=Ground037 — CC0 | Mobilde platform bazlı doku sıkıştırması ve bellek ölçümü yap. |
| PolyHaven/Rock09 | FBX ve 2K renk/normal/roughness haritaları | https://polyhaven.com/a/rock_09 — CC0 | Kaynak model 23K üçgen. Tekil kaya olarak kullan; çok sayıda kopyada LOD/instancing uygula. |
| PolyHaven/TreeStump01 | 2K FBX ve renk/normal/roughness dokuları | https://polyhaven.com/a/tree_stump_01 — CC0 | Kaynak model 41K üçgen. Oyunda tekrarlamadan önce LOD/mesh sadeleştirmesi düşün. |
| PolyHaven/TreeSmall02 | 2K FBX, gövde/dal/yaprak renk ve normal/roughness/alpha dokuları | https://polyhaven.com/a/tree_small_02 — CC0 | Kaynak sayfa 5M üçgen bildiriyor ve LOD etiketi taşıyor. FBX içindeki LOD'ları doğrula; ham haliyle mobil oyunda kullanma. |

## Lisans

Poly Haven modelleri ve ambientCG dosyaları ilgili kaynak sayfalarında CC0 olarak yayımlanmıştır. CC0 ticari kullanım ve atıf zorunluluğu olmadan kullanım hakkı verir; yine de kaynağı belgelemek için yukarıdaki bağlantıları koru. Bu dosyaların yazarının sen olduğunu iddia etme ve ham assetleri tek başına yeniden paketleyip satma.

- Poly Haven lisans bilgisi: https://polyhaven.com/license
- ambientCG lisans bilgisi: https://docs.ambientcg.com/license/

## Unity import notları

- Renk/albedo haritaları sRGB; normal haritaları Normal Map; roughness ve AO haritaları lineer veri olarak içe aktarılmalı.
- Poly Haven normal dosyaları OpenGL (nor_gl). Unity’nin beklediği normal yönü farklıysa normal haritası yeşil kanalını doğrula/düzelt.
- Tree Small 02 ve Tree Stump 01 yüksek detaylı kaynak varlıklardır. PC ve mobil için LOD, mesh azaltma, doku sıkıştırma ve cihaz profili oluştur; performans doğrulaması yapmadan “mobil uyumlu” kabul etme.
- Bu klasörde önceki Unity projesine ait .meta/GUID dosyaları bulunmaz; içe aktarımda Unity kendi meta dosyalarını oluştursun.
