# Onyx Estates — Luxury Real Estate Website

A premium, animation-rich real estate website built with pure HTML, CSS and vanilla JavaScript. No frameworks, no build step — open `index.html` or serve the folder with any static server.

```bash
python3 -m http.server 8000
# → http://localhost:8000
```

## Design

- **Palette** — ink `#0b0d10` · charcoal `#12151a` · cream `#f4efe8` · champagne gold `#c8a96a`
- **Typography** — [Fraunces](https://fonts.google.com/specimen/Fraunces) for display, [Manrope](https://fonts.google.com/specimen/Manrope) for text
- **Imagery** — Unsplash, loaded lazily

## Features & animations

- Cinematic preloader with counter and curtain reveal
- Masked line-by-line hero headline reveal + slow Ken Burns zoom
- Custom cursor with trailing ring (desktop only)
- Sticky navigation that condenses on scroll and hides on scroll-down
- Glassmorphic property search panel
- Scroll-triggered staggered reveals (IntersectionObserver)
- Animated stat counters with ease-out
- Infinite marquee of destinations (pauses on hover)
- Filterable property grid with 3D tilt-on-hover cards and favourite toggles
- Parallax hero, about and CTA imagery
- Auto-advancing testimonial slider with dots and arrows
- Magnetic buttons
- Floating-label contact form
- Scroll progress bar + back-to-top button
- Full-screen circular-reveal mobile menu
- Respects `prefers-reduced-motion`

## Structure

```
index.html      — markup and content
css/style.css   — all styling and keyframe animations
js/main.js      — interaction and scroll logic
```
