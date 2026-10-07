# gilOS

gil's personal site: a purple, terminal-style desktop that runs in the browser.

- **profile.exe**: avatar, status, welcome message and shortcuts
- **terminal**: a small shell. Try `help`, `neofetch`, `cat about_me.txt`, `open dni`, `music pause`
- **about_me.txt** and **dni.txt**: read-only text files
- **music.exe**: plays a YouTube video with custom controls and loops it

Windows can be dragged, minimized and closed, and the taskbar has a start menu and a clock. On phones the windows stack into one scrolling column.

## Changing the text

Everything you'd want to edit is in [`config.js`](config.js): your name, handle, status, welcome message, the about-me lines, the DNI list, links and the song. Keep the quotes and commas, save, and refresh.

To change the profile picture, replace `assets/avatar.png` (a square image works best).

## Changing the song

In `config.js`, set `music.youtubeId` to the part after `watch?v=` in a YouTube link. For example, `https://www.youtube.com/watch?v=d8_fZedifX0` becomes `"d8_fZedifX0"`.

Browsers don't allow sound until a visitor clicks or presses a key, so the song starts on their first click. Set `playOnFirstClick: false` to make them press play instead. Some videos don't allow other sites to play them. If yours is one of those, the player shows a "listen on youtube" link instead.

## Previewing on your computer

The music needs the page to come from a web server, not a double-clicked file. From this folder, run:

```sh
npx serve .
```

and open the address it prints.

## Putting it online with Netlify

1. On [netlify.com](https://app.netlify.com), choose **Add new site → Import an existing project → GitHub**, then pick this repository.
2. Pick the branch the site is on. Leave the build command empty. The publish directory is already set to `.` in `netlify.toml`.
3. Deploy. After that, every push to that branch updates the live site.

## Files

| file | what it does |
| --- | --- |
| `config.js` | all the text and settings |
| `index.html` | page structure: windows, taskbar, start menu |
| `style.css` | colours, fonts and layout |
| `js/desktop.js` | windows, taskbar, start menu, boot screen |
| `js/terminal.js` | the terminal and its commands |
| `js/music.js` | the YouTube player |
| `js/stars.js` | the animated starfield |
| `js/core.js` | small helpers shared by the scripts |
