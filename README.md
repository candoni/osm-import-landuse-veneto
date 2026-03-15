# osm-import-landuse-veneto

Questo progetto è una rielaborazione del lavoro documentato su [wiki.openstreetmap.org — Import dalla CTRN Veneto a OSM](https://wiki.openstreetmap.org/wiki/Veneto/Guide_e_documentazione/Import:_dalla_CTRN_Veneto_a_OSM).

Partendo dai dati aperti di [Copertura del Suolo 2023](https://idt2.regione.veneto.it/idt/webgis/viewer?previewLayerId=14275) pubblicati da Regione Veneto, il progetto produce file `.osm` pronti per l'importazione in [OpenStreetMap](https://www.openstreetmap.org/) — uno per ogni comune del Veneto — e un'[app web interattiva](https://candoni.github.io/osm-import-landuse-veneto/) per visualizzare e confrontare i dati regionali con quelli già presenti in OSM.

Licenze dei dati:

- I dati della Regione Veneto sono pubblicati con licenza [IODL 2.0](https://www.dati.gov.it/iodl/2.0)
- I dati OpenStreetMap sono disponibili con licenza [ODbL 1.0](https://www.openstreetmap.org/copyright)

## Come usare questo progetto

Ci sono diversi livelli di coinvolgimento, dal più semplice al più tecnico.

---

### 1. Esplora i dati nell'app web

Apri l'[app online](https://candoni.github.io/osm-import-landuse-veneto/) per visualizzare, comune per comune, i poligoni di copertura del suolo con i tag OSM convertiti. Puoi passare tra tre viste:

- **Regione** — i poligoni così come risultano dalla conversione dei dati regionali
- **OSM** — i poligoni di landuse già presenti in OpenStreetMap
- **Diff** — un confronto _indicativo_ che mostra le corrispondenze, le discordanze e le aree mancanti in OSM

---

### 2. Importa i dati di un comune in JOSM

I file `.osm` si trovano nella cartella [`dist/copsuolo_2023_14275/`](dist/copsuolo_2023_14275/) organizzati per provincia. Ogni file corrisponde a un comune e contiene le geometrie originali della Regione con i tag già convertiti alle convenzioni OSM.

Per usarli:

1. Scegli il comune che ti interessa, ad esempio `dist/copsuolo_2023_14275/VI/vicenza_24116.osm`
2. Aprilo in JOSM
3. Sovrapponi i dati esistenti di OSM e procedi con l'importazione seguendo le linee guida della comunità

Rispetto al processo originale, sei già al punto 3.10 [JOSM: validazione, correzione errori e semplificazione geometria](https://wiki.openstreetmap.org/wiki/Veneto/Guide_e_documentazione/Import:_dalla_CTRN_Veneto_a_OSM#JOSM:_validazione,_correzione_errori_e_semplificazione_geometria_2).
Puoi proseguire da lì seguendo le istruzioni.

---

### 3. Segnala o correggi un tag errato

La conversione dei codici regionali in tag OSM è interamente definita nel file [`src/copsuolo/translation/map_copsuolo.yaml`](src/copsuolo/translation/map_copsuolo.yaml).

Ogni voce ha questa struttura:

```yaml
- clc_lv_all: "22100"
  description: "Vigneti"
  tags:
    landuse: vineyard
```

- `clc_lv_all` è il codice della classe regionale, come descritto in `docs/Specifiche_di_contenuto.pdf`. 
- `description` viene dallo stesso file. Non è usato nel processo, è solo indicativo per non dover accedere al PDF.
- `tags` contiene i tag OSM corrispondenti che verranno applicati.

Se noti che un tipo di terreno è mappato in modo errato o incompleto, apri una issue o proponi una modifica a `src/copsuolo/translation/map_copsuolo.yaml`.

L'unica eccezione alla definizione nel file è per queste classi regionali escluse dalla conversione (non rilevanti per OSM):

- `52300` Mari e Oceani
- `12210`/`12220`/`12230` Reti stradali con territori associati

---

### 4. Riproduci l'intero flusso in locale

Se vuoi rigenerare i file `.osm` o ricostruire le mappe da zero, clona il repository e segui le istruzioni nella sezione [Sviluppo](#sviluppo) qui sotto.

---

## Sviluppo

### Requisiti

- Linux
- Python ≥ 3.10 con venv
- GDAL (libreria di sistema + pacchetto Python)
- [`ogr2osm`](https://github.com/roelderickx/ogr2osm)
- [`tippecanoe`](https://github.com/felt/tippecanoe) e [`pmtiles`](https://github.com/protomaps/go-pmtiles) (per generare le mappe)
- Node.js + npm (per il frontend)
- JOSM (per verificare i file prodotti)

### Installazione

```bash
# Libreria GDAL di sistema
sudo apt install libgdal-dev

# Ambiente Python
python3 -m venv .venv
source .venv/bin/activate
pip install .[dev]
pip install gdal==$(gdal-config --version)

# Dipendenze frontend
npm install --prefix frontend
```

### Pipeline completa

```
Scarica shapefile  →  Converti in .osm  →  Costruisci mappe  →  Avvia il viewer
```

#### Scarica i dati regionali

```bash
poe download --provincia VI
```

I dati vengono salvati in `data/copsuolo_2023_14275/{PROVINCIA}/`, uno shapefile per comune. Gli zip temporanei finiscono in `data/tmp/`. Lo script aspetta 1 secondo tra un comune e il successivo (modificabile con `--sleep-seconds`).

Province disponibili: `BL`, `PD`, `RO`, `TV`, `VE`, `VI`, `VR`

Sorgente dati: [IDT2 Regione Veneto, layer 14275](https://idt2.regione.veneto.it/idt/webgis/viewer?previewLayerId=14275)

Licenza dati regionali: [IODL 2.0](https://www.dati.gov.it/iodl/2.0)

Licenza dati OSM usati per il confronto: [ODbL 1.0](https://www.openstreetmap.org/copyright)

Le chiamate vegono a volte rifiutate dal server: si dovrà quindi rilanciare lo script che ritenterà le richieste fallite, fino al completamento.

#### Converti gli shapefile in .osm

```bash
poe convert-shp2osm
```

Esegue `ogr2osm` su ogni shapefile trovato sotto `data/copsuolo_2023_14275/` usando `src/copsuolo/translation/landuse.py` come file di traduzione (che legge i mapping da `src/copsuolo/translation/map_copsuolo.yaml`). I file `.osm` vengono scritti in `dist/copsuolo_2023_14275/`.

Opzioni utili:

```bash
# Solo una provincia, sovrascrivendo i file esistenti
poe convert-shp2osm --input data/copsuolo_2023_14275/VR --force-overwrite

# Anteprima senza eseguire
poe convert-shp2osm --dry-run
```

#### Costruisci le mappe PMTiles

```bash
poe build-region-map   # poligoni Regione Veneto
poe build-osm-map      # poligoni OSM estratti da un .pbf locale
poe build-compare-map  # layer di confronto Regione vs OSM
```

Il layer di confronto richiede un estratto `.pbf` locale (default: `data/italy-nord-est.osm.pbf`) disponibile ad esempio su [geofabrik](https://download.geofabrik.de/europe/italy/nord-est.html). Ogni comando salta automaticamente le province già aggiornate.

I file prodotti vanno in `frontend/public/data/`.

#### Avvia il viewer in locale

```bash
poe serve
```

Apri l'URL stampato da Vite, tipicamente `http://localhost:5173/osm-import-landuse-veneto/`.

#### Pubblica su GitHub Pages

Il repository include un workflow GitHub Actions che pubblica automaticamente il frontend su GitHub Pages a ogni push su `main`.

Prerequisiti:

1. I file PMTiles e i metadata JSON devono essere presenti in `frontend/public/data/`
2. Se vuoi rendere scaricabili i file `.osm` per singolo comune dal repository pubblico, anche `dist/` deve essere committata
3. In GitHub, vai in `Settings > Pages` e imposta `Source: GitHub Actions`

Deploy:

1. Genera o aggiorna i PMTiles con i comandi `poe build-*` sopra
2. Fai commit dei file aggiornati sotto `frontend/public/data/`
3. Fai push su `main`

Il workflow `.github/workflows/deploy-frontend-gh-pages.yml` esegue:

1. `npm ci` in `frontend/`
2. `npm run build` in `frontend/`
3. publish della cartella `frontend/build/` su GitHub Pages
