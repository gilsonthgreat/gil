# gilOS

gil's personal site: a purple, terminal-style desktop that runs in the browser. Plain HTML, CSS and JavaScript with no
build step.

- **profile.exe**: avatar, pronouns, age, timezone, roots, and a card that tilts in 3D under the cursor
- **terminal**: a small shell. Try `help`, `neofetch`, `cat about_me.txt`, `open chess`, `music pause`, `objection`
- **about_me.txt**, **dni.txt**: read-only text files
- **friends.exe**: shoutouts on a spinning 3D carousel
- **skills.exe**: skill levels as 3D segmented bars
- **gallery.exe**: a slideshow of images or gifs
- **music.exe**: a YouTube video with custom controls, on repeat
- **sysmon.exe**: live frame rate, cursor speed and frame time graphs, plus gil's clock and the visitor's
- **chess.exe**: chess against a bot (easy, normal, hard) with a 3D board view
- **flappy.exe**: a flappy bird clone with parallax scenery

Around the windows: a dot cursor with a trailing ring, a cat and a dog that chase the cursor (they sit when they catch
up, fall asleep when it stops, and float hearts if you hover over them), a bunny, duck and fox wandering along the
taskbar, birds and shooting stars, and a wireframe planet. The pets can be hidden from the start menu or with `pets` in
the terminal. Visitors who ask their system for reduced motion get a calmer page with the pets off.

## Editing

All the text lives in [`config.js`](config.js): name, handle, pronouns, age, timezone, roots (flags), the about-me lines
and likes, DNI, shoutouts, skills, gallery images, links and the song. To change the profile picture, replace
`assets/avatar.png` with a square image. Gallery images go in `assets/gallery/` and are listed under `gallery` in
`config.js`; animated gifs work there too.

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

| file               | what it does                                                                   |
| ------------------ | ------------------------------------------------------------------------------ |
| `config.js`        | site text and settings                                                         |
| `index.html`       | markup for the windows, taskbar and start menu                                 |
| `style.css`        | colours, fonts, layout and animation                                           |
| `vendor/chess.js`  | [chess.js](https://github.com/jhlywa/chess.js) 0.10.3 (BSD-2), the chess rules |
| `js/core.js`       | the `GIL` namespace: DOM and storage helpers, ASCII logo                       |
| `js/desktop.js`    | window management, desktop icons, taskbar, start menu, boot                    |
| `js/content.js`    | fills the windows from `config.js`: about, dni, friends, skills, gallery       |
| `js/sky.js`        | stars, planet, birds and shooting stars                                        |
| `js/cursor.js`     | the dot cursor                                                                 |
| `js/critters.js`   | the pets                                                                       |
| `js/music.js`      | the YouTube player and its controls                                            |
| `js/terminal.js`   | the shell and its commands                                                     |
| `js/sysmon.js`     | the live graphs and clocks                                                     |
| `js/chess-game.js` | the chess board and the bot (minimax with alpha-beta)                          |
| `js/flappy.js`     | the flappy game                                                                |

Scripts are loaded in that order and share state through `window.GIL`. Windows announce `window:open` and `window:hide`
events on `document`, which the games and graphs use to run only while they're visible.
