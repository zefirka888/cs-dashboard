import { Widget } from "./Widget.js";
import { ICONS } from "./icons.js";
import { fetchJSON } from "./api.js";

const ENDPOINT =
  "https://raw.githubusercontent.com/ByMykel/CSGO-API/main/public/api/en/skins.json";
const MAX_VISIBLE = 60;

export class SkinsWidget extends Widget {
  static type = "skins";
  static title = "Каталог скинов";
  static icon = ICONS.skins;

  constructor(config, hooks) {
    super(config, hooks);
    this._controller = null;
    this._query = "";
    this._randomSkin = null;
  }

  async renderContent(box) {
    this.showLoading("Загрузка каталога скинов…");
    let skins;
    try {
      skins = await this._fetch();
    } catch (err) {
      if (err.name === "AbortError") return;
      console.error("SkinsWidget:", err);
      this.showError(
        "Не удалось загрузить каталог скинов. Проверьте соединение.",
        () => this.refresh()
      );
      return;
    }
    this._renderList(box, skins);
  }

  async _fetch() {
    this._controller?.abort();
    this._controller = new AbortController();
    const data = await fetchJSON(ENDPOINT, this._controller.signal);
    if (!Array.isArray(data)) throw new Error("Неожиданный формат данных");
    return data;
  }

  _renderList(box, skins) {
    box.replaceChildren();

    if (this._randomSkin) {
      const card = this._buildSkinCard(this._randomSkin);
      card.classList.add("skin-item--random");
      box.append(card);
    }

    const toolbar = document.createElement("div");
    toolbar.className = "widget-toolbar";

    const search = document.createElement("input");
    search.type = "search";
    search.placeholder = "Поиск по названию…";
    search.value = this._query;
    search.setAttribute("aria-label", "Поиск скина");

    const randBtn = document.createElement("button");
    randBtn.type = "button";
    randBtn.className = "btn";
    randBtn.textContent = "Случайный";

    const list = document.createElement("div");
    list.className = "skins-list";

    search.addEventListener("input", () => {
      this._query = search.value;
      this._fillItems(list, skins);
    });

    randBtn.addEventListener("click", () => {
      if (!skins.length) return;
      this._randomSkin = skins[Math.floor(Math.random() * skins.length)];
      this._renderList(box, skins);
    });

    toolbar.append(search, randBtn);
    box.append(toolbar, list);
    this._fillItems(list, skins);
  }

  _fillItems(list, skins) {
    const q = this._query.trim().toLowerCase();
    const filtered = q
      ? skins.filter((s) => (s.name || "").toLowerCase().includes(q))
      : skins;

    list.replaceChildren();

    if (filtered.length === 0) {
      const empty = document.createElement("p");
      empty.className = "stub";
      empty.textContent = "Ничего не найдено.";
      list.append(empty);
      return;
    }

    const slice = filtered.slice(0, MAX_VISIBLE);
    for (const skin of slice) list.append(this._buildSkinCard(skin));

    if (filtered.length > slice.length) {
      const note = document.createElement("p");
      note.className = "stub";
      note.textContent = `Показано ${slice.length} из ${filtered.length}. Уточните поиск.`;
      list.append(note);
    }
  }

  _buildSkinCard(skin) {
    const item = document.createElement("div");
    item.className = "skin-item";

    if (skin.image) {
      const img = document.createElement("img");
      img.className = "skin-item__img";
      img.src = skin.image;
      img.alt = "";
      img.loading = "lazy";
      item.append(img);
    }

    const info = document.createElement("div");
    info.className = "skin-item__info";

    const name = document.createElement("div");
    name.className = "skin-item__name";
    name.textContent = skin.name || "Без названия";
    info.append(name);

    const rarity = document.createElement("div");
    rarity.className = "skin-item__rarity";

    if (skin.rarity?.name) {
      const dot = document.createElement("span");
      dot.className = "skin-rarity-dot";
      const color = skin.rarity.color || "#b79cff";
      dot.style.background = color;
      dot.style.color = color;
      rarity.append(dot, document.createTextNode(skin.rarity.name));
    } else if (skin.weapon?.name) {
      rarity.textContent = skin.weapon.name;
    }

    info.append(rarity);
    item.append(info);
    return item;
  }

  destroy() {
    this._controller?.abort();
  }
}