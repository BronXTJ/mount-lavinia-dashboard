# 🏙️ Mount Lavinia Urban Analytics Dashboard

Interactive web dashboard for spatial and urban analysis along the **Galle Road corridor**, Mount Lavinia, Sri Lanka.

The study area covers **five Grama Niladhari (GN) divisions**: Mount Lavinia, Kawdana West, Watarappala, Wathumulla, and Wedikanda.

🌐 **Live demo:** [https://bronxtj.github.io/mount-lavinia-dashboard/](https://bronxtj.github.io/mount-lavinia-dashboard/)

---

## 📌 About

This dashboard brings **maps, KPIs, charts, and planning evidence** into one place for the coastal Galle Road corridor. It supports studio work, presentations, and evidence-based discussion of **problems and potentials** in Mount Lavinia.

- 📈 Baseline demographics, housing, and land use
- 🕸️ Network centrality, density, and urban maturation
- 🚶 Walk accessibility and street-network form
- 🚗 Movement and pedestrian behaviour
- 🌿 Land-cover change (Landsat + Sentinel-2)
- 🌡️ Modelled thermal comfort (UTCI), urban heat, and sky view factor
- 🔗 Integrated synthesis and issues / opportunities framing
- ☁️ **Live weather & air quality** on the Overview map via [Open-Meteo](https://open-meteo.com/)

Plain-language **info panels** are available throughout the app (look for the teal **ⓘ** buttons). An in-app **User Guide** lives at the bottom of the sidebar.

---

## 🧭 Dashboard sections

| Section | What you'll find |
|--------|-------------------|
| **Overview** | KPIs, GN selection, population structure, land-use mix, interactive map, live Open-Meteo |
| **Focus Area · Centrality** | Closeness & betweenness at 500 / 2000 / 3000 / 5000 m; street colouring; What-if sketch & option compare |
| **Focus Area · Density** | Hex-grid FSI, GSI, OSR, typology, and land-use mix |
| **Focus Area · Urban Maturation** | UMI, Shannon entropy, accessibility, and related hex metrics |
| **Focus Area · Walk Accessibility** | Access score, access tier, and walk-time by destination group |
| **Focus Area · Network Form** | 4-way / 3-way / cul-de-sac typology, stub depth, GN scope |
| **Movement & Behaviour** | Junction volumes, pedestrian flows, vehicle mix, day & time filters |
| **Land Cover Change** | Landsat 30 m epochs (~2000 / ~2015 / ~2025) plus Sentinel-2 10 m per-GN metrics |
| **Environmental Analysis** | 10 m grid UTCI / UHI / air temp / Tmrt / shadow / SVF with map-linked panels |
| **Synthesis** | Story spine, relationships graph, finding catalog (F · WA · NF · LC · MB) |
| **Issues & Potentials** | Network view, SWOT, PESTEL, SFA-style assessment |
| **Export Maps** | Preview & download maps, GeoJSON, and rasters for Overview, Centrality, Density, Urban Maturation, and Environmental |

🗺️ **Maps:** Use the floating layer button (FAB) to toggle layers. Switch **Streets** or **Satellite** on most maps (Network Form uses **Dark** + Streets; Land Cover defaults to Satellite). Click a GN, hex, street, or junction to inspect values. Enlarge maps with the fullscreen control.

🔎 **Key Findings** chips on analysis tabs jump straight into Synthesis.

📱 **Responsive layout:** Below 1024px width, map-heavy views **stack vertically** (map first). Navigation uses a **mobile overlay sidebar**.

---

## ✏️ What-if (Centrality)

On **Focus Area → Centrality**, switch to **What-if** to sketch proposed street links and compare options against the baseline network.

Live closeness / betweenness recompute needs a **local sDNA worker**. GitHub Pages cannot host sDNA; the hosted demo can still open What-if and (in Chrome, after **Connect**) talk to a worker at `http://127.0.0.1:8787`.

```bash
pip install -r scripts/what-if/api/requirements.txt
npm run what-if:worker
```

Then open Centrality → What-if, connect the worker, and draw a link. Without the worker, you can export proposed GeoJSON for offline runs.

Details: [`scripts/what-if/README.md`](scripts/what-if/README.md).

---

## 🛠️ Tech stack

| Layer | Tools |
|-------|--------|
| UI | **React 19**, **Vite 8**, **Tailwind CSS**, **Lucide** |
| Routing | **React Router** |
| Maps | **Leaflet**, **react-leaflet**, **GeoTIFF** |
| Charts | **Recharts**, **D3** |
| Data | **GeoJSON** + prepared JSON (runtime) |

---

## 🚀 Getting started

### Prerequisites

- **Node.js** 18+ (LTS recommended)
- **npm**

### Install & run locally

```bash
git clone https://github.com/BronXTJ/mount-lavinia-dashboard.git
cd mount-lavinia-dashboard
npm install
npm run dev
```

Open the URL from the terminal (usually `http://localhost:5173/mount-lavinia-dashboard/`).

### 🔄 Regenerate web data (optional)

If you update sources under `json_files/` (Excel + QGIS exports):

```bash
npm run prepare-data
```

Outputs go to `src/data/` and `public/data/`. Focus Area, Land Cover, and Environmental tabs need the prepared layers in `public/data/`.

### 📦 Production build

```bash
npm run build
npm run preview
```

### 🚢 Deploy to GitHub Pages

```bash
npm run deploy
```

Uses `gh-pages` and `base: '/mount-lavinia-dashboard/'` in `vite.config.js`.

---

## 📁 Project structure

```
mount-lavinia-dashboard/
├── public/data/              # GeoJSON, rasters, and summaries served to the browser
├── public/exports/           # Static map images for Export Maps
├── src/
│   ├── components/           # Maps, panels, synthesis, issues, land cover, environmental UI
│   ├── tabs/                 # Main route pages
│   ├── features/             # Movement & behaviour module
│   ├── hooks/                # Data loading & UI helpers
│   ├── data/                 # JSON from prepare-data
│   └── constants/            # Layers, metrics, copy
├── scripts/
│   ├── prepare-data.mjs      # GIS / Excel → web-friendly pipeline
│   └── what-if/              # Local sDNA worker for Centrality What-if
└── json_files/               # Source GIS & Excel (when included in your clone)
```

📂 **`Social_media_analysis/`** (if present) is a **separate assignment** (Google Maps + YouTube analytics). See [`Social_media_analysis/README.md`](Social_media_analysis/README.md).

---

## 🗄️ Data & external APIs

| Source | Role |
|--------|------|
| Studio GIS + `chalani database.xlsx` | Demographics, boundaries, land use (`npm run prepare-data`) |
| `public/data/` | Precomputed centrality, density, maturation, walk access, network form, land cover, environmental grids |
| [Open-Meteo Forecast](https://open-meteo.com/) | Live temperature, humidity, wind, precipitation, UV, feels-like (Overview) |
| [Open-Meteo Air Quality](https://open-meteo.com/en/docs/air-quality-api) | Live US AQI and PM2.5 (Overview) |
| OpenStreetMap / Esri World Imagery | Streets and satellite basemaps |

No API key is required for Open-Meteo client requests from the browser.

🌿 **Land cover:** Corridor-wide Landsat 30 m percentages and per-GN Sentinel-2 10 m percentages are different products — do not mix them. Green is a subset of Soft on the Sentinel-2 cards; do not add those two together.

📐 **Export CRS:** GeoJSON downloads are WGS 84. Most rasters are WGS 84; the shadow aggregated raster is SLD99 (EPSG:5235). Centrality export maps include closeness and betweenness at 500, 1000, 2000, 3000, 4000, and 5000 m.

---

## 👤 Author

**Thanuja Senarathne**

Undergraduate — BSc (Hons) in Urban Informatics & Planning, University of Moratuwa

- 🐙 GitHub: [@BronXTJ](https://github.com/BronXTJ)
- 💼 LinkedIn: [thanuja-senarathne](https://www.linkedin.com/in/thanuja-senarathne-1122a828b)
- ✉️ Email: [thanujals1781@gmail.com](mailto:thanujals1781@gmail.com)

### ✏️ Development note

The information architecture was **sketched on paper first**, then implemented in **[Cursor](https://cursor.com/)** with AI-assisted coding (e.g. Composer, Claude Sonnet/Opus, Grok). **Design choices, data interpretation, testing, and final code** are the author's responsibility.

---

## ⚖️ License & reuse

Academic / studio project. If you reuse code or ideas, please **credit the author** and confirm you have rights to any underlying spatial datasets.

---

<p align="center">
  <sub>Mount Lavinia · Galle Road Corridor · Sri Lanka 🇱🇰</sub>
</p>
