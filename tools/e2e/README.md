# Uçtan uca (başsız tarayıcı) senaryoları

Bu betikler oyunu gerçek bir Chromium'da (WebGL2) açar, `?manual=1` ile döngüyü elle sürer ve oyun mantığını doğrular.
Bağımlılıkları **projeye eklenmedi**; ayrı bir klasörde kurun:

```bash
mkdir ~/.tools && cd ~/.tools && echo '{"type":"module"}' > package.json && npm i puppeteer-core @sparticuz/chromium
# (Linux'ta @sparticuz/chromium için al2023.tar.br içindeki lib/ klasörünü /tmp/al2023/lib'e açıp LD_LIBRARY_PATH verin)
npm run dev   # proje kökünde
node run.mjs 'http://localhost:5173/?manual=1&q=low' /tam/yol/tools/e2e/sc_play.mjs
```
Senaryolar: `sc_play` (diyalog, görev, dükkân, savaş), `sc_boss` (boss, teslim, kayıt/yükleme, bozuk kayıt, klavye, ölüm),
`sc_walk` (köy→boss arenası yürüyüşü), `sc_touch` (dokunmatik yerleşim + joystick; `TOUCH=1 VW=800 VH=360`), `sc_visual` (ekran görüntüleri).
