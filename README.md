# 10k_players_chess_Bot


# A bot written in JS that will automatically play in https://chess.ytdraws.win/

## Features
- Protect allies from being attacked by marking them via a dynamic leaderboard menu.
- Adjustable "kingdom size" defining the territory radius around your king piece.
- Intelligent piece movement considering safety, threat interception, territory expansion, and attack priorities.
- Allows attacks outside the kingdom for offensive plays while respecting defensive boundaries.
- Auto-refresh ally menu to keep updated with live leaderboard changes.

---

## Usage

### How to inject and run the bot script in your browser:

1. Open the game page in your browser.
2. Open the browser's developer console:
   - Chrome / Edge: Press `F12` or `Ctrl+Shift+I` then select the "Console" tab.
   - Firefox: Press `F12` or `Ctrl+Shift+K`.
3. Copy the entire bot JavaScript code.
4. Paste the code into the console prompt and press `Enter`.
5. The bot menu will appear at top-left allowing ally selection and kingdom size adjustment.
6. The bot will start running automatically, controlling your pieces based on the configured settings.

---

## Controls in the bot menu
- **Ally selection:** Check/uncheck players from the leaderboard to protect/attack them.
- **Kingdom Size:** Adjust with slider or numeric input (1 to 1000) to define your king's territory radius.
- Menu refreshes every 3 seconds to reflect leaderboard updates.

---

## Notes
- The bot respects protected allies and won't attack their pieces.
- Attacks beyond the kingdom radius are allowed only for offensive purposes, not defense.
- The bot tries to move pieces towards attacking, defending, or expanding the kingdom strategically.
- Safe moves and king's survival are prioritized.

---

## Troubleshooting
- If the bot menu doesn't appear, ensure the leaderboard is visible on the page.
- Reload the page and re-inject the script to reset.
- Adjust kingdom size if pieces behave too defensively or aggressively.

---

## Contribution
- Bugs or feature requests? Open an issue on [GitHub](https://github.com/GibsonFR/10k_players_chess_Bot/issues).
- Pull requests welcome.

---

## Contact
**Developer:** Gibson  
GitHub: [GibsonFR](https://github.com/GibsonFR)  
Discord: `gib_son`

