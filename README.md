# gilOS

gil's personal site: a purple, terminal-style desktop that runs in the browser. Plain HTML, CSS and JavaScript with no
build step or dependencies.

- **profile.exe**: avatar, status, welcome message and shortcuts
- **terminal**: a small shell. Try `help`, `neofetch`, `cat about_me.txt`, `open dni`, `music pause`
- **about_me.txt** and **dni.txt**: read-only text files
- **music.exe**: a YouTube video with custom controls, on repeat

Windows can be dragged, minimized and closed, and the taskbar has a start menu and a clock. On phones the windows stack
into one scrolling column.

## Editing

All the text lives in [`config.js`](config.js): name, handle, status, welcome message, the about-me lines, the DNI list,
links and the song. To change the profile picture, replace `assets/avatar.png` with a square image.

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

| file             | what it does                                   |
| ---------------- | ---------------------------------------------- |
| `config.js`      | site text and settings                         |
| `index.html`     | markup for the windows, taskbar and start menu |
| `style.css`      | colours, fonts and layout                      |
| `js/core.js`     | the `GIL` namespace: DOM helper, ASCII logo    |
| `js/stars.js`    | the animated starfield                         |
| `js/music.js`    | the YouTube player and its controls            |
| `js/terminal.js` | the shell and its commands                     |
| `js/desktop.js`  | window management, taskbar, start menu, boot   |

Scripts are loaded in that order and share state through `window.GIL`.
