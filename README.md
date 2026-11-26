# Le Petit Bistro

A French restaurant game for Years 5 to 7. Pupils read or listen to orders in French, cook from the recipes on La Carte, and serve customers.

## Modes

- **Service classique**: one chef, up to three tables. Pupils build each dish, serve the right table, then pick the bill total in French.
- **Mode arcade**: a top-down Overcooked-style kitchen for 1 to 4 chefs. Pupils take plates, add ingredients, cook on the stove and send dishes, drinks and desserts to the hatch. Two chefs can share one keyboard; touch screens get a joystick.

Levels: Facile (plats and drinks, English hints), Moyen (desserts added, French only), Difficile (faster, bigger orders). Mode écoute blurs the orders so pupils must listen.

## Voices

`audio/` holds 148 clips recorded with ElevenLabs (Chloé, Calm & Natural; Antoine, Clear French Explainer; Multilingual v2): 90 orders, the numbers 1 to 25 in euros, and four customer reactions, in both voices. If a clip fails to load, the game falls back to the browser's French voice.

## Music

`music/menu.mp3` (Menu Mystère) plays on the menu and lobby; `music/game.mp3` (Quiz Parisien) plays during service. Both are Jonny's own Suno instrumentals. The music fades between screens and dips while a customer speaks. Players can switch it off or change the volume in the settings or with the ♪ button. In online games, music plays on the host's screen only unless a player turns it on.

## Running it

Open `index.html` through any web server, for example GitHub Pages. The page loads clips from `audio/` by relative path, so it does not work from a double-clicked file.

Online multiplayer uses the Claude artifact `room` capability and only works when the page is opened as a Claude artifact. Anywhere else, the page says so and keeps the one-device modes working.

## Editing

- Game code: `tools/src/src.html`. Run `python3 tools/src/build.py` to rebuild `index.html`.
- Orders and voice script: `tools/audio/gen.py` writes `manifest.json` and the batch scripts pasted into ElevenLabs. `split.py` cuts the downloaded batches into clips at the 1.5-second pauses.
