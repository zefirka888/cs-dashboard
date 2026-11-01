import { Widget } from "./Widget.js";
import { ICONS } from "./icons.js";
import { fetchJSON } from "./api.js";

const ENDPOINT = "https://www.cheapshark.com/api/1.0/deals?pageSize=5";

export class DealsWidget extends Widget {
  static type = "deals";
  static title = "Скидки на игры";
  static icon = ICONS.deals;

  constructor(config, hooks) {
    super(config, hooks);
    this._controller = null;
  }

  async renderContent(box) {
    this.showLoading("Загрузка скидок…");
    let deals;
    try {
      deals = await this._fetch();
    } catch (err) {
      if (err.name === "AbortError") return;
      console.error("DealsWidget:", err);
      this.showError(
        "Не удалось загрузить скидки. Попробуйте ещё раз.",
        () => this.refresh()
      );
      return;
    }
    this._renderList(box, deals);
  }

  async _fetch() {
    this._controller?.abort();
    this._controller = new AbortController();
    const data = await fetchJSON(ENDPOINT, this._controller.signal);
    if (!Array.isArray(data)) throw new Error("Неожиданный формат данных");
    return data;
  }

  _renderList(box, deals) {
    box.replaceChildren();

    if (deals.length === 0) {
      const empty = document.createElement("p");
      empty.className = "stub";
      empty.textContent = "Скидок сейчас нет.";
      box.append(empty);
      return;
    }

    const list = document.createElement("div");
    list.className = "deals-list";

    for (const deal of deals) list.append(this._buildDeal(deal));
    box.append(list);
  }

  _buildDeal(deal) {
    const item = document.createElement("div");
    item.className = "deal-item";

    const info = document.createElement("div");
    info.className = "deal-item__info";

    const title = document.createElement("a");
    title.className = "deal-item__title";
    title.href = `https://www.cheapshark.com/redirect?dealID=${encodeURIComponent(deal.dealID || "")}`;
    title.target = "_blank";
    title.rel = "noopener noreferrer";
    title.textContent = deal.title || "Игра";

    const prices = document.createElement("div");
    prices.className = "deal-item__prices";

    const sale = document.createElement("span");
    sale.className = "deal-item__sale";
    sale.textContent = `$${Number(deal.salePrice).toFixed(2)}`;

    const old = document.createElement("span");
    old.className = "deal-item__old";
    old.textContent = `$${Number(deal.normalPrice).toFixed(2)}`;

    prices.append(sale, old);
    info.append(title, prices);

    const savings = document.createElement("span");
    savings.className = "deal-item__savings";
    savings.textContent = `−${Math.round(Number(deal.savings))}%`;

    item.append(info, savings);
    return item;
  }

  destroy() {
    this._controller?.abort();
  }
}