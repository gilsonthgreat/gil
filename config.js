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

  // dni.txt: the basic dni criteria (basic-dni.crd.co), then anything else to say
  dni: {
    criteria: [
      "homophobic, transphobic, xenophobic, islamophobic, etc.",
      "misogynistic",
      "racist, sexist, ableist, discrimination, etc.",
      "invalidates a person's pronouns / gender / identity",
      "pedophile, sexualizes minors, jokes about r×pe, etc.",
    ],
    notes: ["supports, participates, tolerates, or justify any of the above.", "i block freely."],
    source: "https://basic-dni.crd.co/",
  },

  // projects.exe: roblox games worked on. roles can be "dev", "mod" and "actor"; url is optional
  projects: [
    { name: "KEPLER V2", url: "https://www.roblox.com/games/126257737867782/KEPLER-V2", roles: ["dev"] },
    {
      name: "Flowing Cogito",
      url: "https://www.roblox.com/games/74182468438308/Flowing-Cogito",
      roles: ["dev", "mod"],
    },
    {
      name: "Bleach Primordial",
      url: "https://www.roblox.com/games/135513267808801/Title-Unavailable",
      roles: ["dev", "mod"],
    },
    {
      name: "Efflorescence II: City's Clutches",
      url: "https://www.roblox.com/games/126812721974678/Efflorescence-II-Citys-Clutches",
      roles: ["dev", "mod"],
    },
    { name: "AFU (A Future Unbound)", roles: ["dev", "mod"] },
    {
      name: "title unavailable",
      url: "https://www.roblox.com/games/72566318542858/Title-Unavailable",
      roles: ["actor"],
    },
    { name: "AOT Birdcage CCRP", roles: [] },
    { name: "LARP (Limbus Roleplay)", roles: [] },
  ],

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

  // the visit counter at the top of the screen, kept by abacus (a free counting api). hit adds one and returns the
  // total, get only reads it. remove this to hide the counter
  visits: {
    hit: "https://abacus.jasoncameron.dev/hit/gilsonthgreat-gil/visits",
    get: "https://abacus.jasoncameron.dev/get/gilsonthgreat-gil/visits",
  },

  music: {
    // played in order, then back to the top. youtubeId is the part after watch?v= in a YouTube link;
    // leave title empty to use the video's own title
    playlist: [
      { youtubeId: "Ts5ZiojkOe4", title: "" },
      { youtubeId: "d8_fZedifX0", title: "" }, // ENA
      { youtubeId: "I0S5CyJoZpw", title: "" },
      { youtubeId: "VRYs-QfdToc", title: "" },
      { youtubeId: "H-P1IcF137M", title: "" },
      { youtubeId: "IctykwvNQwQ", title: "" },
      { youtubeId: "J4ypOJbC1lA", title: "" },
    ],
    volume: 40,
    playOnFirstClick: true,
  },
};
