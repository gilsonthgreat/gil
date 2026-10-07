# Rhada Evergarden

A character record for Rhada Evergarden: a dark, gold, game-menu style page that opens by zooming in on his planet and
then shows him standing in front of a sun on the horizon. Plain HTML, CSS and JavaScript with no build step, served from
this folder (`/rhada/`) alongside gilOS.

## Editing

All the writing is in [`index.html`](index.html), section by section (01 Overview to 09 Quotes & trivia). Only his name,
pronouns, true neutral alignment, his skin and hair, and the two looks came from the sketches and the brief. Everything
else (Evergarden, the Riverloom clan, dusk-keepers, his age, history, quotes and trivia) is a draft, and each of those
blocks carries a `data-draft` attribute so it's easy to find. The footer says the record is a draft; change or remove
that line once the details are settled.

The two looks are `img/rhada-afro.webp` (the afro sketch with its grey background cut out) and `img/rhada-down.webp`.
To use different art, replace those files and update the `width`/`height` attributes on their `<img>` tags. The round
face crops on the look switch are set in `css/style.css` under `.beam-end--afro .node` and `.beam-end--down .node`
(`--fx`/`--fy` is the centre of the face in the image, `--fw` how wide a slice of it to show).

Which look shows first is remembered per visitor; `?look=down` in the link opens the hair-down look.

## The intro

`js/arrival.js` draws the opening: a gold loading ring that tips over into Evergarden's ring, a zoom down into the
line between its day and night sides, then smoke parting to show the page. It plays once per browser tab; add
`?intro=1` to the link to see it again, or use "Replay arrival" on the page. Visitors who ask for reduced motion get a
still version, and anyone can turn the ambient dust and smoke off from the footer.

## Files

| file              | what it does                                                                   |
| ----------------- | ------------------------------------------------------------------------------ |
| `index.html`      | all the content, the icon sprite, and a small script that sets the look early  |
| `css/style.css`   | colours, type, layout and every section                                        |
| `css/arrival.css` | the intro overlay                                                              |
| `js/arrival.js`   | the intro animation, the planet drawing (also used in Homeworld) and the smoke |
| `js/main.js`      | the look switch, navigation, index, reveals, scales, planet figure, gold dust  |
| `img/`            | the two looks                                                                  |

Fonts are Bodoni Moda, Spectral and Marcellus SC from Google Fonts.
