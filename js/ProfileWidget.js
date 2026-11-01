import { Widget } from "./Widget.js";
import { ICONS } from "./icons.js";

export class ProfileWidget extends Widget {
  static type = "profile";
  static title = "Профиль игрока";
  static icon = ICONS.profile;

  renderContent(box) {
    box.replaceChildren();

    const note = document.createElement("p");
    note.className = "stub";
    note.textContent =
      "Демонстрационные данные — реальный профиль игрока не подключён.";
    box.append(note);

    const stats = [
      { label: "K/D", value: "1.24" },
      { label: "Побед", value: "512" },
      { label: "Часов", value: "3 600" },
      { label: "Faceit Lvl", value: "8" },
      { label: "Faceit ELO", value: "1 847" },
    ];

    const grid = document.createElement("dl");
    grid.className = "profile-stats";

    for (const s of stats) {
      const cell = document.createElement("div");
      cell.className = "goal__stat";
      const dt = document.createElement("dt");
      dt.textContent = s.label;
      const dd = document.createElement("dd");
      dd.textContent = s.value;
      cell.append(dt, dd);
      grid.append(cell);
    }
    box.append(grid);
  }
}