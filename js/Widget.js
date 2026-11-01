import { ICONS } from "./icons.js";

/**
 * Базовый класс карточки-виджета.
 * Наследники задают static type / title / icon и переопределяют renderContent().
 * Всё остальное (шапка, сворачивание, удаление, ошибки) делает базовый класс.
 */
export class Widget {
  static type = "widget";
  static title = "Виджет";
  static icon = "";

  /**
   * @param {{id: string, collapsed?: boolean, data?: object}} config
   * @param {{onChange?: Function, onRemove?: Function}} hooks
   */
  constructor(config, hooks = {}) {
    this.id = config.id;
    this.collapsed = Boolean(config.collapsed);
    this.data = config.data ?? {};
    this._onChange = hooks.onChange ?? (() => {});
    this._onRemove = hooks.onRemove ?? (() => {});
    this._build();
  }

  // ---------- Построение карточки ----------
  _build() {
    const { type, title, icon } = this.constructor;

    const el = document.createElement("article");
    el.className = "widget";
    el.dataset.id = this.id;
    el.innerHTML = `
      <header class="widget__head">
        <span class="widget__grip" title="Потяните, чтобы переставить">${ICONS.grip}</span>
        <span class="widget__icon widget__icon--${type}">${icon}</span>
        <h2 class="widget__title"></h2>
        <div class="widget__actions">
          <button type="button" class="icon-btn icon-btn--toggle">${ICONS.chevronUp}</button>
          <button type="button" class="icon-btn icon-btn--danger">${ICONS.close}</button>
        </div>
      </header>
      <div class="widget__collapse">
        <div class="widget__body">
          <div class="widget__content"></div>
        </div>
      </div>`;

    el.querySelector(".widget__title").textContent = title;

    this.el = el;
    this.body = el.querySelector(".widget__body");
    this.content = el.querySelector(".widget__content");
    this.toggleBtn = el.querySelector(".icon-btn--toggle");

    const removeBtn = el.querySelector(".icon-btn--danger");
    removeBtn.setAttribute("aria-label", `Удалить виджет «${title}»`);

    this.toggleBtn.addEventListener("click", () => this.toggle());
    removeBtn.addEventListener("click", () => this.remove());

    // Карточку можно тянуть за всю шапку, кроме кнопок. Содержимое остаётся
    // «обычным», поэтому текст выделяется и поля ввода работают.
    const head = el.querySelector(".widget__head");
    head.addEventListener("pointerdown", (e) => {
      if (e.button !== 0 || e.target.closest("button")) return;
      el.draggable = true;
      document.addEventListener("pointerup", () => { el.draggable = false; }, { once: true });
    });
  }

  /** Вызывается панелью после вставки карточки в страницу. */
  mount() {
    this._applyCollapsed(this.collapsed);
    this.refresh();
  }

  // ---------- Содержимое ----------
  /** Переопределяется в наследниках. Может быть async. */
  renderContent(box) {}

  /** Перерисовывает содержимое. Ошибка здесь не выходит за пределы карточки. */
  refresh() {
    this.content.replaceChildren();
    let result;
    try {
      result = this.renderContent(this.content);
    } catch (err) {
      this._fail(err);
      return;
    }
    if (result && typeof result.catch === "function") {
      result.catch((err) => this._fail(err));
    }
  }

  _fail(err) {
    console.error(`Ошибка в виджете «${this.constructor.title}»:`, err);
    this.showError("Виджет не смог отобразиться.", () => this.refresh());
  }

  showLoading(text = "Загрузка…") {
    const box = document.createElement("div");
    box.className = "loading";
    box.textContent = text;
    this.content.replaceChildren(box);
  }

  showError(message = "Не удалось загрузить данные.", onRetry) {
    const box = document.createElement("div");
    box.className = "error";

    const text = document.createElement("p");
    text.textContent = message;
    box.append(text);

    if (onRetry) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "btn";
      btn.textContent = "Повторить";
      btn.addEventListener("click", onRetry);
      box.append(btn);
    }
    this.content.replaceChildren(box);
  }

  // ---------- Сворачивание, удаление ----------
  toggle() {
    this._applyCollapsed(!this.collapsed);
    this._onChange();
  }

  _applyCollapsed(value) {
    this.collapsed = value;
    this.el.classList.toggle("widget--collapsed", value);
    this.toggleBtn.setAttribute("aria-expanded", String(!value));
    this.toggleBtn.setAttribute("aria-label", value ? "Развернуть" : "Свернуть");
    this.body.inert = value;   // скрытое содержимое не попадает в Tab
  }

  remove() {
    this._onRemove(this);
  }

  /** Вызывается панелью перед удалением (здесь наследники отменяют запросы). */
  destroy() {}

  // ---------- Данные виджета ----------
  /** Обновляет собственные данные виджета и сохраняет панель. */
  setData(patch) {
    this.data = { ...this.data, ...patch };
    this._onChange();
  }

  toJSON() {
    return {
      id: this.id,
      type: this.constructor.type,
      collapsed: this.collapsed,
      data: this.data,
    };
  }
}