---
name: Ethereal Pulse
colors:
  surface: '#0b1326'
  surface-dim: '#0b1326'
  surface-bright: '#31394d'
  surface-container-lowest: '#060e20'
  surface-container-low: '#131b2e'
  surface-container: '#171f33'
  surface-container-high: '#222a3d'
  surface-container-highest: '#2d3449'
  on-surface: '#dae2fd'
  on-surface-variant: '#e6bcbd'
  inverse-surface: '#dae2fd'
  inverse-on-surface: '#283044'
  outline: '#ad8888'
  outline-variant: '#5d3f40'
  surface-tint: '#ffb3b5'
  primary: '#ffb3b5'
  on-primary: '#680019'
  primary-container: '#ff5167'
  on-primary-container: '#5b0015'
  inverse-primary: '#be0036'
  secondary: '#c0c1ff'
  on-secondary: '#1000a9'
  secondary-container: '#3131c0'
  on-secondary-container: '#b0b2ff'
  tertiary: '#ddb7ff'
  on-tertiary: '#490080'
  tertiary-container: '#b76dff'
  on-tertiary-container: '#400071'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#ffdada'
  primary-fixed-dim: '#ffb3b5'
  on-primary-fixed: '#40000c'
  on-primary-fixed-variant: '#920027'
  secondary-fixed: '#e1e0ff'
  secondary-fixed-dim: '#c0c1ff'
  on-secondary-fixed: '#07006c'
  on-secondary-fixed-variant: '#2f2ebe'
  tertiary-fixed: '#f0dbff'
  tertiary-fixed-dim: '#ddb7ff'
  on-tertiary-fixed: '#2c0051'
  on-tertiary-fixed-variant: '#6900b3'
  background: '#0b1326'
  on-background: '#dae2fd'
  surface-variant: '#2d3449'
typography:
  display-lg:
    fontFamily: Montserrat
    fontSize: 48px
    fontWeight: '800'
    lineHeight: 56px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Montserrat
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
  headline-lg-mobile:
    fontFamily: Montserrat
    fontSize: 24px
    fontWeight: '700'
    lineHeight: 32px
  headline-md:
    fontFamily: Montserrat
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  body-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  label-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 20px
    letterSpacing: 0.05em
  label-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  unit: 4px
  container-padding-mobile: 16px
  container-padding-desktop: 48px
  gutter: 16px
  stack-sm: 8px
  stack-md: 16px
  stack-lg: 32px
---

> Status: Visual design reference for the Explore experience. The runnable React
> Native code in `frontend/src` is the behavioral source of truth. Keep changes to
> these tokens and components synchronized with the implemented theme, and verify
> them on mobile and desktop web.

## Brand & Style

The design system is built on the intersection of romantic connection and high-octane gaming culture. The brand personality is **vibrant, energetic, and tech-forward**, moving away from static layouts toward a dynamic, immersive experience. 

The visual style utilizes **Glassmorphism** and **High-Contrast Dark Mode** to create a sense of depth and premium quality. Surfaces are treated as semi-transparent layers that catch light from neon-infused accents, evoking the feeling of a high-end gaming setup merged with a sophisticated late-night lounge. The goal is to make the user feel secure yet excited, using deep backgrounds to provide a canvas where human connections and gaming achievements can "glow."

## Colors

The palette is anchored in a deep **Slate 950** background to ensure maximum contrast for its neon-tinged accents. 

- **Primary (Romantic Pink):** A high-saturation, high-energy pink used for dating-centric actions, heart icons, and "match" states.
- **Secondary (Electric Blue):** A tech-forward blue representing the gaming side of the platform, used for leveling, stats, and "find party" actions.
- **Tertiary (Vivid Purple):** The bridge between dating and gaming, used for social features and premium highlights.
- **Surface Treatments:** Use semi-transparent slate washes with 1px inner borders (white at 10% opacity) to create the "glass" effect.

## Typography

This design system utilizes **Montserrat** for headlines to provide a bold, geometric, and modern presence that feels "heavy" and authoritative. **Inter** is used for all functional and body text to maintain exceptional legibility amidst the vibrant colors and translucent backgrounds.

**Display** and **Headline** styles should favor tighter letter-spacing to create a more compact, digital aesthetic. **Labels** used for UI metadata (like player rank or distance) should be uppercase with slightly increased tracking for better scanability on dark backgrounds.

## Layout & Spacing

The layout follows a **fluid grid** model with a focus on vertical stack rhythm. 
- **Mobile:** A 4-column layout with 16px margins. Primary interaction cards (dating profiles/game lobbies) should occupy the full width of the viewport minus margins.
- **Desktop:** A 12-column layout. Content is centered in a max-width container of 1280px.
- **Rhythm:** Use a 4px base unit. Component internal padding should be generous (min 16px) to avoid visual clutter against the glassmorphic backgrounds. High-density information (like gaming stats) should use `stack-sm`, while dating profile headers use `stack-lg`.

## Elevation & Depth

Depth is conveyed through **Backdrop Blurs** and **Ambient Glows** rather than traditional drop shadows.

- **Level 0 (Base):** Deep Slate 950.
- **Level 1 (Cards/Lists):** Glassmorphism with `blur(20px)` and a 1px `white/10%` border. 
- **Level 2 (Modals/Popovers):** Higher opacity glass with a subtle outer glow matching the category color (Pink for dating, Blue for gaming).
- **Glows:** Active states (like a selected game mode or a new match notification) should use a `spread: 15px` shadow with 40% opacity of the primary or secondary color to simulate light emission.

## Shapes

The shape language is consistently **Rounded (2xl)**. 
- **Primary Cards:** Use `rounded-xl` (1.5rem / 24px) to create a soft, inviting feel for profile photos and game banners.
- **Buttons & Chips:** Use `rounded-lg` (1rem / 16px) or full pill-shape for small tags.
- **Interactive Elements:** All buttons should have a high corner radius to maintain the "friendly" aspect of the brand personality while the dark colors handle the "tech" side.

## Components

### Buttons
- **Primary Action:** Solid gradient background (e.g., Pink to Purple) with white text and a subtle drop shadow of the same hue.
- **Secondary Action:** Ghost style with a 2px colored border and `backdrop-filter: blur(10px)`.

### Cards (Profile/Game)
- Cards must feature a 1px top-to-bottom linear gradient stroke to simulate light hitting the top edge. 
- Content should be layered over a dark scrim if the background image is complex.

### Navigation
- **Bottom Bar (Mobile):** High-blur glassmorphic background with active states indicated by a glowing dot and color change.
- **Top Bar:** Integrated into the background, becoming visible only on scroll via a glass layer.

### Inputs
- Dark backgrounds (Slate 900) with a 1px border that glows when focused. Labels should always be visible above the input using the `label-sm` style.

### Game Chips
- Small, pill-shaped tags used for "Genres" or "Ranks." These should use the `secondary_color` (Electric Blue) as a low-opacity background with high-opacity text.
