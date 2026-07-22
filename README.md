# 🏙️ Mount Lavinia Urban Analytics Dashboard

Interactive web dashboard for spatial and urban analysis along the **Galle Road corridor**, Mount Lavinia, Sri Lanka.

The study area covers **five Grama Niladhari (GN) divisions**: Mount Lavinia, Kawdana West, Watarappala, Wathumulla, and Wedikanda.

🌐 **Live demo:** [https://bronxtj.github.io/mount-lavinia-dashboard/](https://bronxtj.github.io/mount-lavinia-dashboard/)

---

## 📌 About

This dashboard brings **maps, KPIs, charts, and planning evidence** into one place for the coastal Galle Road corridor. It supports studio work, presentations, and evidence-based discussion of **problems and potentials** in Mount Lavinia.

- 📈 Baseline demographics and land use
- 🕸️ Network centrality, density, and urban maturation
- 🚶 Movement and pedestrian behaviour
- 🌡️ Modelled thermal comfort (UTCI), urban heat, and sky view factor
- 🔗 Integrated synthesis and issues / opportunities framing
- ☁️ **Live weather & air quality** on the Overview map via [Open-Meteo](https://open-meteo.com/)

Plain-language **info panels** are available throughout the app (look for the teal **ⓘ** buttons).

---

## 🧭 Dashboard sections

| Section | What you'll find |
|--------|-------------------|
| **Overview** | KPIs, population structure, land-use mix, interactive map, live Open-Meteo |
| **Focus Area** | Centrality · Density · Urban maturation (maps + side analytics) |
| **Movement & Behaviour** | Junction volumes, pedestrian flows, directional charts |
| **Environmental Analysis** | 10 m grid UTCI / UHI / SVF with map-linked panels |
| **Synthesis** | Integrated findings, story spine, cross-theme links |
| **Issues & Potentials** | Network view, SWOT, PESTEL, SFA-style assessment |
| **Export Maps** | Static map exports for reports |

📱 **Responsive layout:** Below 1024px width, Focus Area and Environmental views **stack vertically** (map first). Navigation uses a **mobile overlay sidebar**.

---

## 🛠️ Tech stack

| Layer | Tools |
|-------|--------|
| UI | **React 19**, **Vite 8**, **Tailwind CSS** |
| Routing | **React Router** |
| Maps | **Leaflet**, **react-leaflet** |
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

Outputs go to `src/data/` and `public/data/`. Full Focus Area and Environmental tabs need the prepared GeoJSON layers in `public/data/`.

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
├── public/data/              # GeoJSON & summaries served to the browser
├── src/
│   ├── components/           # Maps, panels, synthesis, issues, environmental UI
│   ├── tabs/                 # Main route pages
│   ├── features/             # Behaviour analysis module
│   ├── hooks/                # Data loading & UI helpers
│   ├── data/                 # JSON from prepare-data
│   └── constants/            # Layers, metrics, copy
├── scripts/
│   └── prepare-data.mjs      # GIS / Excel → web-friendly pipeline
└── json_files/               # Source GIS & Excel (when included in your clone)
```

📂 **`Social_media_analysis/`** (if present) is a **separate assignment** (Google Maps + YouTube analytics). See `Social_media_analysis/README.md`.

---

## 🗄️ Data & external APIs

| Source | Role |
|--------|------|
| Studio GIS + `chalani database.xlsx` | Demographics, boundaries, land use (`npm run prepare-data`) |
| `public/data/` | Precomputed centrality, density, maturation, environmental grids |
| [Open-Meteo Forecast](https://open-meteo.com/) | Live temperature, wind, etc. (Overview) |
| [Open-Meteo Air Quality](https://open-meteo.com/en/docs/air-quality-api) | Live AQI-style fields (Overview) |

No API key is required for Open-Meteo client requests from the browser.

---

## 👤 Author

**Thanuja Senarathne**

- 🐙 GitHub: [@BronXTJ](https://github.com/BronXTJ)
- 💼 LinkedIn: [thanuja-senarathne](https://www.linkedin.com/in/thanuja-senarathne-1122a828b)

### ✏️ Development note

The information architecture was **sketched on paper first**, then implemented in **[Cursor](https://cursor.com/)** with AI-assisted coding (e.g. Composer, Claude Sonnet/Opus, Grok). **Design choices, data interpretation, testing, and final code** are the author's responsibility.

---

## ⚖️ License & reuse

Academic / studio project. If you reuse code or ideas, please **credit the author** and confirm you have rights to any underlying spatial datasets.

---

<p align="center">
  <sub>Mount Lavinia · Galle Road Corridor · Sri Lanka 🇱🇰</sub>
</p>
