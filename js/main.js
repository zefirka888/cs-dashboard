import { Dashboard } from "./Dashboard.js";
import { TodoWidget } from "./TodoWidget.js";
import { SkinsWidget } from "./SkinsWidget.js";
import { DealsWidget } from "./DealsWidget.js";
import { ProfileWidget } from "./ProfileWidget.js";

const registry = {
  todo: TodoWidget,
  skins: SkinsWidget,
  deals: DealsWidget,
  profile: ProfileWidget,
};

const dashboard = new Dashboard({
  root: document.querySelector("#dashboard"),
  emptyHint: document.querySelector("#empty-hint"),
  counter: document.querySelector("#widget-count"),
  library: document.querySelector("#library"),
  registry,
});

dashboard.init();