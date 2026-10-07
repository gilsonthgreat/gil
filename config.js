/* ──────────────────────────────────────────────────────────────
   gilOS settings
   Change the text on the site here. You don't need to touch any
   other file. Keep the quotes and the commas at the ends of lines.
   ────────────────────────────────────────────────────────────── */
window.SITE = {
  name: "gil",
  handle: "@gil",
  osName: "gilOS",
  status: "online",

  // shown under your name in profile.exe
  welcome:
    "hey, welcome to my corner of the internet! open some windows, poke around, or type help in the terminal.",

  avatar: "assets/avatar.png",

  // about_me.txt: each line is ["label", "value"]
  about: [
    ["name", "gil"],
    ["pronouns", "edit me"],
    ["age", "edit me"],
    ["likes", "edit me"],
    ["timezone", "edit me"],
  ],
  // paragraphs shown under the list. add more by adding more strings
  aboutText: ["write a little about yourself here."],

  // dni.txt: one entry per line
  dniIntro: "do not interact if you are:",
  dni: [
    "a bigot (racist, homophobic, transphobic, ableist, etc.)",
    "edit me: add your own",
  ],
  dniOutro: "otherwise, feel free to say hi :)",

  // socials & links. leave the list empty to hide them. example:
  // { label: "github", url: "https://github.com/your-name" },
  links: [],

  music: {
    youtubeId: "d8_fZedifX0", // the part after watch?v= in a youtube link
    title: "", // leave empty to use the video's own title
    volume: 40, // 0 to 100
    playOnFirstClick: true, // start the song the first time a visitor clicks or types
  },
};
