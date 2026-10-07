// Text and settings for the site. To change the profile picture, replace assets/avatar.png.
window.SITE = {
  name: "gil",
  handle: "@gilsonneer",
  osName: "gilOS",
  status: "online",
  welcome:
    "hey, i'm gil! luau scripter (roblox mainly), cook in my free time, and lucky enough to have a lot of friends. click around, play some chess, or type help in the terminal.",

  // shown on the profile card and at the top of about_me.txt
  pronouns: "all pronouns",
  age: "18",
  timezone: "EST",
  roots: ["iceland", "jamaica", "native"], // drawn as flags; "native" is the feather + us flag

  // the rest of about_me.txt: ["label", "value"] pairs
  about: [
    ["scripting", "luau, roblox mainly. scripter for hire"],
    ["cooking", "culinary is my other thing. i'll cook for anybody"],
    ["♿", "paraplegic since 11/17/25"],
  ],
  likes: [
    [
      "games",
      "ace attorney (every single one), danganronpa, persona 5, undertale, deltarune, omori, hollow knight, celeste, terraria, minecraft, stardew valley, outer wilds, roblox (i make stuff on it too)",
    ],
    ["anime", "bleach, vagabond, dorohedoro, chainsaw man, jojo, berserk"],
    ["books", "piranesi, house of leaves, the library at mount char, roadside picnic, annihilation, gideon the ninth"],
    [
      "food",
      "jerk chicken, oxtail with rice and peas, beef patties, fried plantains, birria tacos, ramen, mac and cheese, wings",
    ],
    ["also", "scripting, cooking, rp and writing, animatics, late night calls with friends"],
  ],
  aboutText: ["objection! if you made it this far, you're cool. say hi."],

  // dni.txt
  dni: ["no dni.", "i block freely."],

  // friends.exe
  shoutouts: ["Bleach Primordial", '"goodnight guys"', "The Last Call"],
  friendsNote: "and every single one of my friends. there's a lot of you and i appreciate all of you.",

  // skills.exe: [name, level out of 10]
  skills: [
    ["HTML", 6],
    ["Luau", 8],
    ["CSS", 5],
  ],
  forHire: "scripter for hire: roblox / luau. message me on discord: gilsonneer",

  // gallery.exe: images or gifs in assets/gallery
  gallery: [
    { src: "assets/gallery/animatic-1.png", caption: "" },
    { src: "assets/gallery/animatic-2.png", caption: "" },
    { src: "assets/gallery/animatic-3.png", caption: "summoner showdown 6 · animatic preview 4" },
  ],

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
