# gilOS

gil's personal site: a purple, terminal-style desktop that runs in the browser. Plain HTML, CSS and JavaScript with no
build step.

- **profile.exe**: avatar, pronouns, age, timezone, roots, and a card that tilts in 3D under the cursor
- **terminal**: a small shell. Try `help`, `neofetch`, `cat about_me.txt`, `bio otter`, `open chess`, `objection`
- **about_me.txt**, **dni.txt**: read-only text files
- **friends.exe**: shoutouts on a spinning 3D carousel
- **skills.exe**: skill levels as 3D segmented bars
- **gallery.exe**: a slideshow of images or gifs
- **music.exe**: a YouTube video with custom controls, on repeat
- **sysmon.exe**: live frame rate, cursor speed and frame time graphs, plus gil's clock and the visitor's
- **chess.exe**: chess against a bot (easy, normal, hard) with a 3D board view
- **flappy.exe**: a flappy bird clone with parallax scenery
- **zoo.exe**: all 50 animals, each with a short bio

Around the windows: a dot cursor with a trailing ring, 50 animals (a line of 16 that follows the cursor, the rest
wandering along the taskbar, flying around, or hanging from the top of the screen), birds and shooting stars, and a
wireframe planet. Right-click any animal, or long-press it on a phone, for its bio. The animals can be hidden from the
start menu or with `pets` in the terminal. Visitors who ask their system for reduced motion get a calmer page with the
animals off.

## Editing

All the text lives in [`config.js`](config.js): name, handle, pronouns, age, timezone, roots (flags), the about-me lines
and likes, DNI, shoutouts, skills, gallery images, links and the song. To change the profile picture, replace
`assets/avatar.png` with a square image. Gallery images go in `assets/gallery/` and are listed under `gallery` in
`config.js`; animated gifs work there too.

The animals and their bios are in [`animals.js`](animals.js). Each one needs a matching picture in `assets/animals/`.

The song is `music.youtubeId`, the part after `watch?v=` in a YouTube link. Browsers don't allow sound until a visitor
clicks or presses a key, so it starts on their first click; set `playOnFirstClick: false` to wait for the play button
instead. If the video's owner doesn't allow embedding, the player shows a "listen on youtube" link.

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
| `js/critters.js`   | the animals: the cursor line, walkers, flyers and the sloth              |
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
