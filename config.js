// Text and settings for the site. To change the profile picture, replace assets/avatar.png.
window.SITE = {
  name: "gil",
  handle: "@gil",
  osName: "gilOS",
  status: "online",
  welcome: "hey, welcome to my corner of the internet! open some windows, poke around, or type help in the terminal.",

  // about_me.txt: ["label", "value"] pairs, then paragraphs
  about: [
    ["name", "gil"],
    ["pronouns", "edit me"],
    ["age", "edit me"],
    ["likes", "edit me"],
    ["timezone", "edit me"],
  ],
  aboutText: ["write a little about yourself here."],

  // dni.txt: the intro and outro lines can be left empty
  dniIntro: "do not interact if you are:",
  dni: ["a bigot (racist, homophobic, transphobic, ableist, etc.)", "edit me: add your own"],
  dniOutro: "otherwise, feel free to say hi :)",

  // shown in profile.exe and the terminal's `links` command, e.g.
  // { label: "github", url: "https://github.com/gilsonthgreat" },
  links: [],

  music: {
    youtubeId: "d8_fZedifX0", // the part after watch?v= in a YouTube link
    title: "", // empty uses the video's own title
    volume: 40,
    playOnFirstClick: true,
  },
};
