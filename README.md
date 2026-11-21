# Rahul Raj · Momentum (scroll-driven portfolio)

A static site with no build step and no animation library. Open `index.html` through any web server, or upload the whole folder to GitHub Pages, Netlify or Cloudflare Pages.

## How it differs from the earlier versions
Momentum mixes warm paper sections with dark film sections, one signal orange and big Bricolage Grotesque type. The only WebGL is the tesseract and its black hole. Everything else moves with scroll itself.

## The scroll story (v7)
1. **Hero.** The anime figure in the grey blazer stands in front of a giant RAHUL / RAJ. As you scroll, RAHUL slides left and RAJ slides right (reversed in v7).
2. **A new world.** A circle opens from your chest and grows until the whole screen is deep space, with stars rushing past. "You have entered a new world", then "You imagine it. I make it work."
From here on every chapter uses the same deep space look (dark blue black with stars), apart from the warm tesseract.
3. **The short version.** Your background as one paragraph that lights up word by word.
4. **Process.** The PS-120 line drawing builds itself in four stages, then opens the live 3D demo.
5. **Interlude.** "Designed to engage / Built to be useful" slide in opposite directions.
6. **About.** Now before the tesseract, with the black suit portrait (`assets/about-coat.webp`).
7. **The tesseract (Capabilities and Work).** The glowing beam lattice from v3 is back (thin orange beams on all three axes, threads of light and dust, a glowing frame around each stop). The walls are covered in frozen frames of your work, repeated down the corridor and echoed behind each other, like moments of time laid out in space. Each page starts tiny, deep down the corridor on a side wall (left, then right, and so on; the two titles in the middle), rushes towards you as you fall, slows (but never stops) right in front of your face, then speeds past you while the next one is already on its way. Since v7 the fall is one continuous movement with no pauses between pages. Pills along the bottom jump to any stop.
8. **The black hole.** After the last project the corridor stretches, the camera speeds up and rolls, a black hole grows at the end and you fall in until the screen is fully black.
9. **Out of the lens.** Keep scrolling and a different universe fades in: a painted deep space nebula in teal, magenta and amber with dark dust lanes, bright stars and a small distant galaxy (`assets/deepspace.webp`, made by `tools/deepspace.py`). You are inside the lens of the sunglasses from your film. The camera pulls back out of the glass, then the film plays as you scroll: the light streak, the smoke, and you in the black suit, with stars around you. Then "Let's build something useful." and the Let's talk button arrive. Wide screens use the 16:9 cut (`assets/hero-film/`), tall screens the vertical cut (`assets/reveal/`).
10. **Contact details**, the note about private employer work, and the footer.

## Files
- `index.html` · structure and all styles
- `app.js` · the scroll engine and contact/demo logic. The wall frames are painted in code from your work images and mockups, so they add no extra download.
- `assets/` · `rahul-suit-full.webp` (hero), `about-suit.webp` (About), `rahul-anime.webp` (tesseract wall), `logo-rr-*.webp` (logo), `deepspace.webp` (the universe inside the lens), `hero-film/` and `reveal/` (the finale film), the pump blueprint capture and the Chain Reaction screenshots. `coat-wide.webp`, `orbit/`, `about-vr.webp`, `hero-desktop.webp` and `rahul-front.webp` are from earlier versions and are no longer used; they are not included in the GitHub copy.
- `previous-v3/` to `previous-v6/` · earlier versions of `index.html` and `app.js`, in case you want to go back
- three.js r128 loads from cdnjs only for the tesseract. Without it (or without WebGL) a simple CSS tunnel and a CSS black hole show instead; the lens finale is plain canvas and works everywhere.
- `demo/pump-skid.html` · the PS-120 3D demo, opened in a dialog (loads three.js 0.160.0 from jsDelivr)

## Fill in before publishing
Top of `app.js`:
```js
const CONTACT = { email: '', place: 'UAE', linkedin: '', github: '' };
```
Empty fields are simply left out of the contact list, the Copy email button stays hidden until an email is set, and Let's Talk says plainly that no address has been added. Nothing pretends to send.

## Accessibility and phones
- Reduced motion (system setting) or `?static` in the address turns every scroll scene into a normal readable page: drawing fully drawn, the hero shows the figure and name with both lines below, tools and projects are listed as a grid (no tesseract flight), the finale shows the black suit portrait with the Let’s talk block, no pinning.
- Without JavaScript the page is the same readable layout.
- Phones get the same scenes, sized for portrait screens (tested at 390 × 844). The work cards fit the screen height and the drawing's callouts become chips under step 04.

## Honesty rules kept
No clients, testimonials or metrics. Employer and client work (Sinor, marine 3D, VR, company websites) is not shown, and a note says why. PS-120 values are illustrative; concept projects use sample data.

## Version 9 (2026-11-21)
- Hero figure is now `assets/rahul-suit-full.webp` (black three-piece suit, cut out of its black background). The grey blazer figure `rahul-anime.webp` is still used in the tesseract wall frames.
- About photo is now `assets/about-suit.webp` (cropped at the thighs).
- The exact Version 8 files are kept in `../portfolio-scroll-saved-v8/`.

## Version 10 · QA pass (2026-11-21)
Tested in Chromium at 320×568, 375×667, 390×844, 414×896, 844×390 (landscape phone), 768×1024, 1024×768, 1280×800, 1440×900, 1920×1080 and 2560×1440, plus reduced motion, no JavaScript and the 3D demo page. No script errors, no failed files, no broken links, no sideways scrolling.

Fixes made:
- The opening statement now sizes to the screen height as well as width, so it fits on small and landscape phones.
- A soft fade sits under the top bar, so text scrolling beneath it never collides with the logo.
- The chapter chip at the bottom left is hidden on phones, where it covered text.
- Small phones: the name no longer overlaps the "Based in the UAE" line.
- Landscape phones: the process drawing and steps sit side by side and fit the screen.
- Tesseract: on phones the room strip scrolls itself so the current room is always visible.
- Reduced motion: the "Designed to engage / Built to be useful" bands show each phrase whole instead of a cropped strip.
- Contact: empty rows and the Copy email button are hidden instead of showing placeholders.
- Added a favicon, share preview tags and a larger "Back to top" tap target.

## Publishing on GitHub Pages
The site is static: `index.html`, `app.js`, `assets/` and `demo/`. In the repository go to Settings, Pages, choose "Deploy from a branch", pick the branch and the root folder, and save. The address will be https://rahulrajalpy16-coder.github.io/Portfolio/

## Tesseract: pages hold (2026-11-21)
You scroll and swipe through the tesseract freely, and the movement follows your finger or wheel. Every page is a wall for the gesture that reaches it: when a page fills the screen the scroll stops right there, even in the middle of a long fling, and only a new swipe or scroll carries on to the next page. On iPhone the leftover coast of a fling is cancelled at the wall.
