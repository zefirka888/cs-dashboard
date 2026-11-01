import { storage } from "./storage.js";

const STORAGE_KEY = "widgets";
const MIME_NEW = "application/x-cs-widget";
const MIME_MOVE = "application/x-cs-move";
const NEW_WIDGET_HEIGHT = 190;
const HINT_DURATION = 3000;

// Сколько виджетов каждого типа разрешено на панели.
// Всё, что не указано явно — по одному.
const DEFAULT_LIMIT = 1;
const TYPE_LIMITS = {
  todo: 2,
  skins: 1,
  deals: 1,
  profile: 1,
};

const makeId = () =>
  globalThis.crypto?.randomUUID?.() ??
  Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

/** Управляет набором виджетов: создание, порядок, удаление, сохранение. */
export class Dashboard {
  constructor({ root, emptyHint, counter, library, registry }) {
    this.root = root;
    this.emptyHint = emptyHint;
    this.counter = counter;
    this.registry = registry;

    this.widgets = [];
    this.dragged = null;
    this.dragHeight = NEW_WIDGET_HEIGHT;

    this.placeholder = document.createElement("div");
    this.placeholder.className = "drop-placeholder";

    this._hintTimer = null;
    this._hintEl = null;
    this._saveWarned = false;

    this._bindDropZone();
    if (library) this._bindLibrary(library);
  }

  init() {
    this._restore();
    this._updateUI();
  }

  // ---------- Публичные операции ----------
  addWidget(type, index = this.widgets.length) {
    if (!this.registry[type]) {
      console.error(`Неизвестный тип виджета: ${type}`);
      this.showHint("Неизвестный тип виджета.");
      return null;
    }

    const limit = TYPE_LIMITS[type] ?? DEFAULT_LIMIT;
    const current = this._countByType(type);
    const title = this.registry[type]?.title || type;

    if (current >= limit) {
      this.showHint(this._limitMessage(title, limit));
      return null;
    }

    try {
      const widget = this._create({ id: makeId(), type, collapsed: false, data: {} });
      this._insert(widget, index);
      this._save();
      this._updateUI();
      return widget;
    } catch (err) {
      console.error("Не удалось добавить виджет:", err);
      this.showHint("Не удалось добавить виджет. Попробуйте ещё раз.");
      return null;
    }
  }

  removeWidget(id) {
    const index = this.widgets.findIndex((w) => w.id === id);
    if (index === -1) return;

    const [widget] = this.widgets.splice(index, 1);
    try {
      widget.destroy();
    } catch (err) {
      console.error("Ошибка при удалении виджета:", err);
    }
    widget.el.remove();
    this._save();
    this._updateUI();
  }

  _countByType(type) {
    return this.widgets.filter((w) => w.constructor.type === type).length;
  }

  hasWidget(type) {
    return this._countByType(type) > 0;
  }

  _limitMessage(title, limit) {
    return limit === 1
      ? `«${title}» уже на панели - второй раз добавить нельзя`
      : `${limit} тренировочных плана уже на панели - третий добавить нельзя`;
  }

  move(id, index) {
    const from = this.widgets.findIndex((w) => w.id === id);
    if (from === -1) return;

    const [widget] = this.widgets.splice(from, 1);
    const i = Math.max(0, Math.min(index, this.widgets.length));
    this.widgets.splice(i, 0, widget);

    const next = this.widgets[i + 1];
    this.root.insertBefore(widget.el, next ? next.el : null);
    this._save();
  }

  /** Тост внизу экрана. Видимый сразу, скрывается через HINT_DURATION. */
  showHint(message) {
    if (this._hintEl) {
      this._hintEl.remove();
      this._hintEl = null;
    }
    clearTimeout(this._hintTimer);

    const el = document.createElement("div");
    el.className = "toast";
    el.setAttribute("role", "status");
    el.setAttribute("aria-live", "polite");
    el.textContent = message;
    document.body.append(el);

    void el.offsetWidth;
    el.classList.add("toast--visible");

    this._hintEl = el;
    this._hintTimer = setTimeout(() => {
      el.classList.remove("toast--visible");
      setTimeout(() => {
        if (this._hintEl === el) {
          el.remove();
          this._hintEl = null;
        }
      }, 260);
    }, HINT_DURATION);
  }

  // ---------- Создание и восстановление ----------
  _create(config) {
    const WidgetClass = this.registry[config.type];
    if (!WidgetClass) throw new Error(`Неизвестный тип виджета: ${config.type}`);

    return new WidgetClass(config, {
      onChange: () => this._save(),
      onRemove: (widget) => this.removeWidget(widget.id),
    });
  }

  _insert(widget, index) {
    const i = Math.max(0, Math.min(index, this.widgets.length));
    this.widgets.splice(i, 0, widget);

    const next = this.widgets[i + 1];
    this.root.insertBefore(widget.el, next ? next.el : null);
    widget.mount();
  }

  _restore() {
    const saved = storage.load(STORAGE_KEY, []);
    if (!Array.isArray(saved)) return;

    for (const config of saved) {
      try {
        const type = config?.type;
        if (!type) continue;

        const limit = TYPE_LIMITS[type] ?? DEFAULT_LIMIT;
        if (this._countByType(type) >= limit) {
          console.warn("Пропущен сверх лимита при восстановлении:", type);
          continue;
        }
        this._insert(this._create(config), this.widgets.length);
      } catch (err) {
        console.error("Не удалось восстановить виджет:", config, err);
      }
    }
  }

  _save() {
    const ok = storage.save(STORAGE_KEY, this.widgets.map((w) => w.toJSON()));
    if (ok) {
      this._saveWarned = false;
      return;
    }
    if (!this._saveWarned) {
      this._saveWarned = true;
      this.showHint(
        "Браузер не разрешает сохранение — изменения пропадут после перезагрузки."
      );
    }
  }

  _updateUI() {
    this.emptyHint.hidden = this.widgets.length > 0;
    if (this.counter) this.counter.textContent = `Виджетов: ${this.widgets.length}`;
  }

  // ---------- Библиотека: перетаскивание плиток и кнопка «+» ----------
  // Обработчик «+» живёт здесь, а не в main.js — гарантированно
  // нет дублей, работает при любой версии main.js.
  _bindLibrary(library) {
    library.querySelectorAll(".tile").forEach((tile) => {
      const type = tile.dataset.widgetType;

      tile.addEventListener("dragstart", (e) => {
        this.dragged = null;
        this.dragHeight = NEW_WIDGET_HEIGHT;
        e.dataTransfer.effectAllowed = "copy";
        e.dataTransfer.setData(MIME_NEW, type);
        e.dataTransfer.setData("text/plain", type);
        tile.classList.add("tile--dragging");
      });

      tile.addEventListener("dragend", () => {
        tile.classList.remove("tile--dragging");
        this._clearDragUI();
      });

      const addBtn = tile.querySelector(".tile__add");
      if (addBtn) {
        addBtn.addEventListener("click", (e) => {
          e.stopPropagation();
          const widget = this.addWidget(type);
          if (widget) {
            widget.el.scrollIntoView({ behavior: "smooth", block: "nearest" });
          }
        });
      }
    });
  }

  // ---------- Панель как зона сброса ----------
  _bindDropZone() {
    const root = this.root;

    root.addEventListener("dragstart", (e) => {
      const widget = this.widgets.find((w) => w.el === e.target);
      if (!widget) return;

      this.dragged = widget;
      this.dragHeight = widget.el.offsetHeight;

      e.dataTransfer.effectAllowed = "move";
      e.dataTransfer.setData(MIME_MOVE, widget.id);
      e.dataTransfer.setData("text/plain", widget.id);

      setTimeout(() => {
        if (this.dragged !== widget) return;
        widget.el.classList.add("widget--dragging");
        this._preparePlaceholder();
        widget.el.after(this.placeholder);
      }, 0);
    });

    root.addEventListener("dragend", () => {
      if (this.dragged) {
        this.dragged.el.classList.remove("widget--dragging");
        this.dragged.el.draggable = false;
        this.dragged = null;
      }
      this._clearDragUI();
    });

    root.addEventListener("dragover", (e) => {
      if (!this._acceptsDrag(e)) return;
      e.preventDefault();
      e.dataTransfer.dropEffect = this.dragged ? "move" : "copy";

      root.classList.add("dashboard--over");
      if (this.placeholder.parentNode !== root) {
        this._preparePlaceholder();
        root.append(this.placeholder);
      }
      this._movePlaceholder(e.clientX, e.clientY);
    });

    root.addEventListener("dragleave", (e) => {
      if (!root.contains(e.relatedTarget)) root.classList.remove("dashboard--over");
    });

    // Drop: читаем данные напрямую через getData — не полагаемся
    // на dataTransfer.types, чтобы тост появлялся и при отказе по лимиту.
    root.addEventListener("drop", (e) => {
      const newType = e.dataTransfer?.getData(MIME_NEW) || "";
      const moveId = e.dataTransfer?.getData(MIME_MOVE) || "";

      if (!newType && !moveId) return;
      e.preventDefault();

      const index = this._placeholderIndex();
      this._clearDragUI();

      if (moveId) {
        this.move(moveId, index);
      } else if (newType) {
        // addWidget сам покажет тост, если лимит уже достигнут
        this.addWidget(newType, index);
      }
    });
  }

  _acceptsDrag(e) {
    const types = Array.from(e.dataTransfer?.types ?? []);
    return types.includes(MIME_NEW) || types.includes(MIME_MOVE);
  }

  _preparePlaceholder() {
    this.placeholder.style.minHeight = `${this.dragHeight}px`;
    this.emptyHint.hidden = true;
  }

  _movePlaceholder(x, y) {
    const ph = this.placeholder;
    const target = document.elementFromPoint(x, y)?.closest(".widget");

    if (target && this.root.contains(target) && target !== this.dragged?.el) {
      const targetIsAfter = ph.compareDocumentPosition(target) & Node.DOCUMENT_POSITION_FOLLOWING;
      if (targetIsAfter) target.after(ph);
      else target.before(ph);
      return;
    }

    const cards = this.widgets.filter((w) => w !== this.dragged).map((w) => w.el);
    const bottom = Math.max(0, ...cards.map((c) => c.getBoundingClientRect().bottom));
    if (y > bottom && ph !== this.root.lastElementChild) this.root.append(ph);
  }

  _placeholderIndex() {
    let i = 0;
    for (const el of this.root.children) {
      if (el === this.placeholder) return i;
      if (el.classList.contains("widget") && el !== this.dragged?.el) i++;
    }
    return i;
  }

  _clearDragUI() {
    this.placeholder.remove();
    this.root.classList.remove("dashboard--over");
    this._updateUI();
  }
}