import { Widget } from "./Widget.js";
import { ICONS } from "./icons.js";

const makeId = () =>
  globalThis.crypto?.randomUUID?.() ??
  Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

export class TodoWidget extends Widget {
  static type = "todo";
  static title = "Тренировочный план";
  static icon = ICONS.todo;

  _defaultItems() {
    return [
      { id: makeId(), text: "20 минут Aim Botz", done: false },
      { id: makeId(), text: "Разминка на Deathmatch", done: false },
      { id: makeId(), text: "Разбор демки прошлого матча", done: false },
      { id: makeId(), text: "Смоки и флешки на Mirage", done: false },
      { id: makeId(), text: "Spray control 10 минут", done: false },
    ];
  }

  mount() {
    // Первый запуск (или виджет из старой версии без items):
    // заполняем дефолтным тренировочным списком и сразу сохраняем.
    if (!Array.isArray(this.data.items)) {
      this.data.items = this._defaultItems();
      this._onChange();
    }
    super.mount();
  }

  renderContent(box) {
    box.replaceChildren();
    box.append(this._buildForm());

    const items = this._items();
    if (items.length === 0) {
      const empty = document.createElement("p");
      empty.className = "stub";
      empty.dataset.empty = "1";
      empty.textContent = "Задач пока нет. Добавьте первую тренировку.";
      box.append(empty);
      return;
    }

    const list = document.createElement("ul");
    list.className = "todo-list";
    for (const item of items) list.append(this._buildItem(item));
    box.append(list);
  }

  _items() {
    if (!Array.isArray(this.data.items)) this.data.items = [];
    return this.data.items;
  }

  _buildForm() {
    const form = document.createElement("form");
    form.className = "todo-form";

    const input = document.createElement("input");
    input.type = "text";
    input.placeholder = "Новая задача…";
    input.setAttribute("aria-label", "Новая задача");
    input.maxLength = 120;

    const submit = document.createElement("button");
    submit.type = "submit";
    submit.className = "btn btn--primary";
    submit.textContent = "Добавить";

    form.append(input, submit);

    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const text = input.value.trim();
      if (!text) return;

      const item = { id: makeId(), text, done: false };
      this.setData({ items: [...this._items(), item] });

      input.value = "";
      input.focus();

      this.content.querySelector("[data-empty]")?.remove();

      let list = this.content.querySelector(".todo-list");
      if (!list) {
        list = document.createElement("ul");
        list.className = "todo-list";
        this.content.append(list);
      }
      list.append(this._buildItem(item));
    });

    return form;
  }

  _buildItem(item) {
    const li = document.createElement("li");
    li.className = "todo-item" + (item.done ? " todo-item--done" : "");
    li.dataset.id = item.id;

    const label = document.createElement("label");
    const cb = document.createElement("input");
    cb.type = "checkbox";
    cb.checked = Boolean(item.done);
    cb.addEventListener("change", () => {
      li.classList.toggle("todo-item--done", cb.checked);
      const items = this._items().map((it) =>
        it.id === item.id ? { ...it, done: cb.checked } : it
      );
      this.setData({ items });
    });

    const text = document.createElement("span");
    text.textContent = item.text;
    label.append(cb, text);

    const del = document.createElement("button");
    del.type = "button";
    del.className = "icon-btn icon-btn--danger";
    del.setAttribute("aria-label", `Удалить задачу «${item.text}»`);
    del.innerHTML = ICONS.close;
    del.addEventListener("click", () => {
      li.remove();
      this.setData({ items: this._items().filter((it) => it.id !== item.id) });
      if (!this.content.querySelector(".todo-item")) {
        const empty = document.createElement("p");
        empty.className = "stub";
        empty.dataset.empty = "1";
        empty.textContent = "Задач пока нет. Добавьте первую тренировку.";
        this.content.append(empty);
      }
    });

    li.append(label, del);
    return li;
  }
}