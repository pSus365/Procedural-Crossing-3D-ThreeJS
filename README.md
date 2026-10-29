# Road Hopper 3D – Laboratorium 1 / WebGL2

Jest to **kompletny, uruchamialny projekt** przeznaczony do analizowania podczas zajęć.
W kodzie **nie ma zadań TODO** ani brakujących funkcji. Podczas laboratorium najpierw uruchom projekt, a następnie wykonuj eksperymenty opisane w `docs/Laboratorium_1_WebGL2_Road_Hopper_NOWE.pdf`.

## Uruchomienie

1. Sprawdź w terminalu: `node --version` oraz `npm --version`. Jeśli Node.js nie jest zainstalowany, pobierz wersję LTS z https://nodejs.org/en/download.
2. Otwórz katalog `road-hopper-3d` w Visual Studio Code.
3. W terminalu w tym katalogu wykonaj `npm install`.
4. Uruchom `npm run dev` i otwórz adres podany przez Vite, zwykle `http://localhost:5173/`.

Nie trzeba instalować WebGL ani Three.js. WebGL2 jest obsługiwane przez zgodną przeglądarkę.
Jeżeli PowerShell blokuje `npm.ps1`, uruchom `npm.cmd install` i `npm.cmd run dev` lub skorzystaj z terminala CMD.

## Organizacja

- `src/game/sceneData.js` – **jakie** obiekty istnieją i gdzie się znajdują.
- `src/webgl/primitiveObjects.js` – **jak wyglądają** bryły gracza, aut, drzew i podłoża.
- `src/webgl/geometry.js` – pozycje wierzchołków płaszczyzny i sześcianu.
- `src/webgl/mesh.js` – VBO / VAO i konfigurowanie atrybutów.
- `src/webgl/renderer.js` – uniformy oraz `drawArrays`.
- `src/shaders/vertexShader.js` – wyznaczanie pozycji wierzchołków.
- `src/shaders/fragmentShader.js` – kolor fragmentów.
- `src/main.js` – inicjalizacja programu i kolejność renderowania sceny.

**Uwaga:** Po każdym eksperymencie zapisz zmiany, obserwuj efekt w przeglądarce, zanotuj wniosek, a następnie przywróć wartość początkową, jeżeli instrukcja nie mówi inaczej. Dzięki temu następne eksperymenty zaczynają się od tej samej sceny.

## Oddanie

Zadania domowe znajdują się na końcu instrukcji PDF. Projekt oddaj jako archiwum ZIP **bez katalogu `node_modules`**, a sprawozdanie jako osobny PDF.
