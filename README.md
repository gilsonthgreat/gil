# gilOS

gil's personal site: a purple, terminal-style desktop that runs in the browser. Plain HTML, CSS and JavaScript with no
build step.

- **profile.exe**: avatar, pronouns, age, timezone, roots, and a card that tilts in 3D under the cursor
- **terminal**: a small shell. Try `help`, `neofetch`, `cat about_me.txt`, `bio otter`, `open chess`, `objection`
- **about_me.txt**, **dni.txt**: read-only text files
- **friends.exe**: shoutouts on a spinning 3D carousel
- **skills.exe**: skill levels as 3D segmented bars
- **gallery.exe**: a slideshow of images or gifs
- **music.exe**: a YouTube playlist with custom controls that loops back to the first song
- **sysmon.exe**: live frame rate, cursor speed and frame time graphs, plus gil's clock and the visitor's
- **chess.exe**: chess against a bot (easy, normal, hard) with a 3D board view
- **flappy.exe**: a flappy bird clone with parallax scenery
- **zoo.exe**: all 58 animals, each with a short bio

Windows can be dragged by their title bars and resized from the right edge, the bottom edge or the corner grip.

Around the windows: a dot cursor with a trailing ring, birds and shooting stars, a wireframe planet, and a habitat of
animals, a different set each visit. They wander the taskbar and the tops of open windows, greet each other, play-fight,
chase, and nap in piles (more of them at night). Birds and bugs fly around and perch on windows, a flock passes over
now and then, and a sloth hangs from the top of the screen or the bottom of a window.

Any animal can be picked up and carried: drop it on a window and it lives up there, riding along when the window is
dragged and falling off when it's closed. Fling it and it arcs through the air. A click boops it; right-click, or
long-press on a phone, shows its bio. The animals can be hidden from the start menu or with `pets` in the terminal.
Visitors who ask their system for reduced motion get a calmer page with the animals off.

## Editing

All the text lives in [`config.js`](config.js): name, handle, pronouns, age, timezone, roots (flags), the about-me lines
and likes, DNI, shoutouts, skills, gallery images, links and the music. To change the profile picture, replace
`assets/avatar.png` with a square image. Gallery images go in `assets/gallery/` and are listed under `gallery` in
`config.js`; animated gifs work there too.

The animals and their bios are in [`animals.js`](animals.js). Each one needs a matching picture in `assets/animals/`.
Who likes to fight, who naps in piles, who chases whom, and the sounds they make are lists at the top of
[`js/habitat.js`](js/habitat.js).

The music is `music.playlist` in `config.js`: one entry per song, using the part after `watch?v=` in a YouTube link,
played in order and then from the top again. Browsers don't allow sound until a visitor clicks or presses a key, so it
starts on their first click; set `playOnFirstClick: false` to wait for the play button instead. A video whose owner
doesn't allow embedding is skipped; if none of them will play, the player shows a "listen on youtube" link.

## Running locally

The YouTube player won't load from a double-clicked file, so serve the folder:

```sh
npx serve .
```

Formatting is Prettier with the settings in `.prettierrc.json`: `npx prettier --write .`

## Hosting

Any static host works. Two free options:

- **GitHub Pages**: in the repository's Settings → Pages, deploy from the branch with the site, folder `/ (root)`. On a
  free GitHub plan the repository has to be public.
- **Netlify**: import the repository and leave the build command empty. `netlify.toml` sets the publish directory.

## Layout

| file               | what it does                                                             |
| ------------------ | ------------------------------------------------------------------------ |
| `index.html`       | markup for the windows, taskbar, start menu and bio card                 |
| `style.css`        | colours, fonts, layout and animation                                     |
| `config.js`        | site text and settings                                                   |
| `animals.js`       | the animals: size, how they move, and their bios                         |
| `vendor/chess.js`  | chess.js 0.10.3, the chess rules                                         |
| `js/core.js`       | the `GIL` namespace: DOM and storage helpers, ASCII logo                 |
| `js/desktop.js`    | window management, desktop icons, taskbar, start menu, boot              |
| `js/content.js`    | fills the windows from `config.js`: about, dni, friends, skills, gallery |
| `js/sky.js`        | stars, planet, birds and shooting stars                                  |
| `js/cursor.js`     | the dot cursor                                                           |
| `js/zoo.js`        | the animal bio card and zoo.exe                                          |
| `js/critters.js`   | one animal on screen: its sprite and how it's posed each frame           |
| `js/habitat.js`    | what the animals do: walking, fights, naps, flying, carrying             |
| `js/music.js`      | the YouTube player and its controls                                      |
| `js/terminal.js`   | the shell and its commands                                               |
| `js/sysmon.js`     | the live graphs and clocks                                               |
| `js/chess-game.js` | the chess board and the bot (minimax with alpha-beta)                    |
| `js/flappy.js`     | the flappy game                                                          |

The scripts load in the order listed and share state through `window.GIL`. Windows announce `window:open` and
`window:hide` events on `document`, which the games and graphs use to run only while they're visible.

## Credits

Animal artwork is from [Noto Emoji](https://github.com/googlefonts/noto-emoji) by Google, under the Apache License 2.0
(`assets/animals/LICENSE`). Chess rules come from [chess.js](https://github.com/jhlywa/chess.js) by Jeff Hlywa, under
the BSD 2-Clause license (`vendor/chess.js.LICENSE`).
