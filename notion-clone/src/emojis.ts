// Compact emoji catalog: "emoji keywords" separated by "|", grouped by category.
const RAW: Record<string, string> = {
  People:
    "😀 grin happy|😃 smile happy|😄 laugh|😁 beam|😆 lol|🥹 touched|😅 sweat|🤣 rofl|😂 joy tears|🙂 slight smile|😉 wink|😊 blush|😇 angel|🥰 love|😍 heart eyes|🤩 star struck|😘 kiss|😋 yum|😛 tongue|🤪 zany|😎 cool sunglasses|🤓 nerd|🧐 monocle|🤔 thinking|🤨 raised eyebrow|😐 neutral|😴 sleep|🥳 party|🤯 mind blown|😤 triumph|😭 cry|😱 scream|😡 angry|🥶 cold|🥵 hot|🤗 hug|🫡 salute|🤫 shush|🙄 eye roll|😬 grimace|🤠 cowboy|👻 ghost|🤖 robot|👽 alien|💀 skull|🎃 pumpkin|👋 wave hello|👍 thumbs up|👎 thumbs down|👏 clap|🙌 raised hands|🙏 pray thanks|💪 strong|✌️ peace|🤞 fingers crossed|👀 eyes|🧠 brain|👶 baby|🧑‍💻 developer|🧑‍🎨 artist|🧑‍🚀 astronaut|🧑‍🍳 cook|🧑‍🏫 teacher|🦸 hero|🧙 wizard",
  Nature:
    "🐶 dog|🐱 cat|🐭 mouse|🦊 fox|🐻 bear|🐼 panda|🐨 koala|🐯 tiger|🦁 lion|🐮 cow|🐷 pig|🐸 frog|🐵 monkey|🐔 chicken|🐧 penguin|🐦 bird|🦉 owl|🦄 unicorn|🐝 bee|🦋 butterfly|🐢 turtle|🐙 octopus|🐬 dolphin|🐳 whale|🦈 shark|🦖 dinosaur|🌵 cactus|🌲 tree|🌴 palm|🌱 seedling grow|🌿 herb|🍀 clover luck|🍁 maple leaf|🍄 mushroom|🌸 blossom|🌹 rose|🌻 sunflower|🌷 tulip|🌍 earth world|🌙 moon|⭐ star|🌟 glowing star|✨ sparkles|⚡ lightning|🔥 fire|🌈 rainbow|☀️ sun|⛅ cloud|❄️ snow|🌊 wave ocean|💧 drop water",
  Food:
    "🍎 apple|🍊 orange|🍋 lemon|🍌 banana|🍉 watermelon|🍇 grapes|🍓 strawberry|🍒 cherry|🍑 peach|🥑 avocado|🥕 carrot|🌽 corn|🥐 croissant|🥖 bread|🧀 cheese|🍳 egg cooking|🥞 pancakes|🍔 burger|🍟 fries|🍕 pizza|🌮 taco|🍣 sushi|🍜 ramen|🍝 pasta|🍿 popcorn|🍩 donut|🍪 cookie|🎂 cake birthday|🍰 shortcake|🍫 chocolate|🍦 ice cream|☕ coffee|🍵 tea|🧋 boba|🍺 beer|🍷 wine|🥂 cheers",
  Activity:
    "⚽ soccer|🏀 basketball|🏈 football|⚾ baseball|🎾 tennis|🏐 volleyball|🏓 ping pong|🏸 badminton|⛳ golf|🎯 target goal|🏹 archery|🎣 fishing|🥊 boxing|🏋️ gym weights|🚴 cycling|🏃 running|🧘 yoga meditate|🏊 swimming|⛷️ ski|🏄 surf|🧗 climbing|🎮 gaming|🎲 dice game|🧩 puzzle|♟️ chess|🎨 art palette|🎭 theater|🎬 movie film|🎤 mic sing|🎧 headphones music|🎸 guitar|🎹 piano|🥁 drum|🎻 violin|🏆 trophy|🥇 gold medal|🎖️ medal|🎟️ ticket",
  Travel:
    "🚗 car|🚕 taxi|🚌 bus|🚓 police|🚑 ambulance|🚒 fire engine|🏎️ race car|🚲 bike|🛴 scooter|🏍️ motorcycle|✈️ airplane travel|🚀 rocket launch|🛸 ufo|🚁 helicopter|⛵ sailboat|🚢 ship|🚂 train|🗺️ map|🧭 compass|🏔️ mountain|🏕️ camping|🏖️ beach|🏝️ island|🏜️ desert|🌋 volcano|🏠 house home|🏡 garden house|🏢 office building|🏰 castle|🗽 statue liberty|🗼 tower|⛩️ shrine|🌃 night city|🌉 bridge|🎡 ferris wheel|🎢 roller coaster",
  Objects:
    "⌚ watch|📱 phone|💻 laptop|🖥️ desktop computer|⌨️ keyboard|🖱️ mouse|💾 floppy save|💿 cd|📷 camera|🎥 video camera|📺 tv|📻 radio|🔋 battery|🔌 plug|💡 bulb idea|🔦 flashlight|🕯️ candle|💸 money|💰 money bag|💳 credit card|💎 gem diamond|⚖️ scale balance|🔧 wrench|🔨 hammer|⚙️ gear settings|🧰 toolbox|🧲 magnet|🔬 microscope|🔭 telescope|📡 satellite|💊 pill|🩺 stethoscope|🧪 test tube|🧬 dna|🔑 key|🗝️ old key|🚪 door|🛋️ couch|🛏️ bed|🧸 teddy|🎁 gift|🎈 balloon|🎉 party popper tada|🎊 confetti|✉️ envelope mail|📦 package box|📫 mailbox|📝 memo note|📄 page document|📃 curl page|📑 tabs|📊 bar chart|📈 chart up|📉 chart down|🗒️ notepad|🗓️ calendar|📅 date|📆 tear-off calendar|📇 card index|🗃️ card box|🗄️ cabinet|📋 clipboard|📁 folder|📂 open folder|🗂️ dividers|📌 pin|📍 location pin|📎 paperclip|✂️ scissors|🖊️ pen|✏️ pencil|🖍️ crayon|🖌️ paintbrush|🔍 search magnify|🔒 lock|🔓 unlock|📓 notebook|📔 decorated notebook|📕 red book|📗 green book|📘 blue book|📙 orange book|📚 books library|📖 open book|🔖 bookmark|🏷️ label tag|📰 newspaper|🗞️ rolled newspaper|📐 triangle ruler|📏 ruler|🧮 abacus|⏰ alarm clock|⏳ hourglass|🧭 compass",
  Symbols:
    "❤️ red heart love|🧡 orange heart|💛 yellow heart|💚 green heart|💙 blue heart|💜 purple heart|🖤 black heart|🤍 white heart|💔 broken heart|💯 hundred|✅ check done|☑️ checkbox|✔️ check mark|❌ cross no|❎ cross box|⭕ circle|❓ question|❗ exclamation|⚠️ warning|🚫 prohibited|⛔ no entry|🔴 red circle|🟠 orange circle|🟡 yellow circle|🟢 green circle|🔵 blue circle|🟣 purple circle|⚫ black circle|⚪ white circle|🟥 red square|🟩 green square|🟦 blue square|⬛ black square|🔶 orange diamond|🔷 blue diamond|▶️ play|⏸️ pause|⏹️ stop|🔁 repeat|🔀 shuffle|➕ plus|➖ minus|✖️ multiply|➗ divide|♻️ recycle|⚛️ atom|☯️ yin yang|🔔 bell|🔕 mute|💬 speech chat|💭 thought|🗯️ anger bubble|♾️ infinity|🆕 new|🆒 cool|🆗 ok|🆘 sos|ℹ️ info|🔝 top|🔜 soon|©️ copyright|®️ registered|™️ trademark|#️⃣ hash|🔢 numbers",
  Flags: "🏁 checkered flag finish|🚩 red flag|🎌 crossed flags|🏴 black flag|🏳️ white flag|🏳️‍🌈 rainbow flag|🏴‍☠️ pirate|🇺🇸 usa|🇬🇧 uk|🇨🇦 canada|🇫🇷 france|🇩🇪 germany|🇮🇹 italy|🇪🇸 spain|🇯🇵 japan|🇰🇷 korea|🇨🇳 china|🇮🇳 india|🇧🇷 brazil|🇲🇽 mexico|🇦🇺 australia|🇳🇬 nigeria|🇿🇦 south africa|🇪🇬 egypt|🇵🇰 pakistan|🇸🇦 saudi|🇺🇦 ukraine|🇸🇪 sweden",
};

export interface Emoji {
  char: string;
  keywords: string;
}

export const EMOJI_CATEGORIES: { name: string; emojis: Emoji[] }[] = Object.entries(RAW).map(([name, list]) => ({
  name,
  emojis: list.split("|").map((entry) => {
    const [char, ...rest] = entry.split(" ");
    return { char, keywords: rest.join(" ") };
  }),
}));

export const ALL_EMOJIS = EMOJI_CATEGORIES.flatMap((c) => c.emojis);

export const randomEmoji = () => {
  const pool = ["📄", "📝", "🚀", "💡", "🎯", "📚", "🌱", "⭐", "🔥", "🧠", "🎨", "🗂️", "📌", "✨", "🌈", "🧩", "🪴", "🍀"];
  return pool[Math.floor(Math.random() * pool.length)];
};
