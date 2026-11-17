# Mova: a Revolut homepage replica

> **Note:** This project is a replica of the [Revolut](https://www.revolut.com/) homepage, built as a front-end learning exercise. **All rights and credit for the original design, layout and interactions belong to Revolut Ltd.** This project is not affiliated with, endorsed by or connected to Revolut in any way. "Revolut" is a trademark of Revolut Ltd.

## What this is

A single-page rebuild of the revolut.com homepage that reproduces its structure, type scale, spacing and scroll choreography:

- The hero's full-screen image shrinks into the middle of three phone cards on the first scroll, and plays in reverse when you scroll back to the top.
- Dark sections run a timed "shrink into card" or "zoom out" animation as they come into view.
- The header hides as you scroll down and comes back when you scroll up.
- Tabbed sections, a dropdown menu, a mobile menu and a download pop-up.

To keep it clearly separate from the real brand, the brand name (**Mova**, which is fictional), all the text, the logo and the imagery are replaced. Mova isn't a bank, and none of the products, rates or figures on the page are real.

## Stack

Plain HTML, CSS and JavaScript, with [GSAP](https://gsap.com/) from a CDN for the timelines. There's no build step.

```bash
open index.html
```

## Credits

- Original design and interactions: [Revolut](https://www.revolut.com/)
- Footer closing effect: combines ideas from [Isidor](https://www.isidor.ai/) (flowing line field) and [Good Fella](https://good-fella.com/) (character art and a giant wordmark) into an original effect.
- Photos: [Pexels](https://www.pexels.com/), see [CREDITS.md](CREDITS.md)
- Fonts: [Geist](https://vercel.com/font) and [Inter](https://rsms.me/inter/) from Google Fonts
