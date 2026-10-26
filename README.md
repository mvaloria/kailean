# Kailean website (redesign)

Static site with no build step. Open `index.html` in a browser to preview it.

## Pages
- `index.html`: homepage (hero, problems, pillars, Solutions Finder, approach timeline, before/after case, mini calculator, about, Calendly booking)
- `calculator.html`: waste cost / ROI calculator with a gated report (print or save as PDF)
- `assessment.html`: 15-question Ops Health Score with a radar chart and a gated 90-day report

## Configure (`assets/js/main.js`, top of the file)
- `calendlyUrl`: your Calendly link (already set)
- `leadEndpoint`: paste a Formspree, HubSpot or Make/Zapier webhook URL to receive calculator and assessment leads as JSON. Leave it empty and no lead data is sent.
- `phpPerUsd`: exchange rate used by the calculator's currency toggle

## Before going live
- Replace the metrics band (index.html, "METRICS BAND") with real, verifiable results.
- Replace the illustrative case study with real (or anonymized) client results.
- Add a team section and client logos (placeholders are marked in HTML comments).
- Add a privacy policy page and link it from the consent text.
- Review the industry cost defaults in `calculator.html` (`INDUSTRY_COST`).

## Hosting
Upload the folder to Netlify, Vercel, Cloudflare Pages or GitHub Pages, then point
kaileanconsultancy.com at it in place of Google Sites.
