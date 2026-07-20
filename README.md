# Atconiz — AI Real Estate Intelligence Platform

## Architecture (Refactored from Monolith)

This project was transformed from a single 3400+ line `index.html` into a clean, production-oriented multi-file structure. **Every feature, interaction, animation, calculation, localStorage key, and visual detail works identically to the original.**

### Current Structure

```
atconiz/
├── index.html                 # Pure markup + view structure (no <style>, no <script> logic)
├── css/
│   └── styles.css             # Complete original stylesheet (variables, glassmorphism, 
│                              # responsive rules, animations, components)
├── js/
│   ├── data/
│   │   └── properties.js      # Seeded PRNG, property templates, cities, agents,
│   │                          # globalData, currencies, generateProperties(), 
│   │                          # and shared state (properties, favorites, theme, etc.)
│   ├── utils/
│   │   └── helpers.js         # formatPrice, convertCurrency, debounce, 
│   │                          # debounceSearch, showToast
│   ├── app.js                 # Application logic: navigation, property cards & 3D tilt,
│   │                          # filtering/search, favorites, compare, property details
│   │                          # modals, AI chat, valuations, investment analysis,
│   │                          # global land/price calculator, mortgage calculator +
│   │                          # amortization, all dashboards, analytics canvas charts,
│   │                          # testimonials/blog/FAQ, theme, particles, init
│   ├── components/            # Reserved for future extraction (PropertyCard, etc.)
│   ├── core/                  # Reserved (Modal system, Theme, Navigation)
│   ├── features/              # Reserved (calculators/, ai/, dashboards)
│   └── effects/               # Reserved (particles, micro-interactions)
└── README.md
```

### Load Order (critical for globals)

```html
<script src="js/data/properties.js"></script>   <!-- state + data first -->
<script src="js/utils/helpers.js"></script>     <!-- pure helpers -->
<script src="js/app.js" defer></script>         <!-- everything else + DOMContentLoaded -->
```

Because the original HTML uses many inline event handlers (`onclick="switchView(...)"`, `onsubmit="runAIValuation(event)"`, etc.), the functions remain in the global scope. This guarantees zero breakage.

### Benefits of This Architecture

| Aspect              | Before (monolith)          | After                              |
|---------------------|----------------------------|------------------------------------|
| File size           | 1 × ~145 KB                | HTML ~25 KB + CSS ~20 KB + JS split|
| Concerns            | Mixed                      | Separated (markup / style / data / utils / logic) |
| Team collaboration  | Painful                    | Multiple people can work in parallel |
| Caching             | Single cache invalidation  | Independent cache for CSS & JS     |
| Onboarding          | Overwhelming               | Clear entry points                 |
| Future modules      | Hard                       | Folders already prepared           |
| Behavior            | —                          | 100% identical                     |

### Running

Any static file server:

```bash
npx serve /path/to/atconiz
# or
python3 -m http.server 8080 --directory /path/to/atconiz
```

Open the printed URL. The AI Assistant feature still expects a backend at `POST /api/chat` (unchanged from original).

### Next Evolution Steps (optional)

1. Convert remaining large functions in `app.js` into focused modules under `js/features/` and `js/core/`.
2. Switch to ES modules (`type="module"`) and explicitly `window.switchView = switchView` etc. only for the public API used by inline handlers.
3. Introduce a lightweight state management object instead of many top-level `let`s.
4. Add a simple build step (esbuild / Vite) later if tree-shaking or TypeScript is desired.

The current state is already a professional, maintainable codebase ready for a development team while being completely faithful to the original working application.
