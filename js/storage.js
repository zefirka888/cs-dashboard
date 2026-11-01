// Обёртка над localStorage: все ошибки (переполнение, приватный режим,
// битый JSON) гасятся здесь, остальной код об этом не думает.
const PREFIX = "csdash:";

export const storage = {
  load(key, fallback) {
    try {
      const raw = localStorage.getItem(PREFIX + key);
      return raw === null ? fallback : JSON.parse(raw);
    } catch (err) {
      console.warn("storage.load:", err);
      return fallback;
    }
  },

  save(key, value) {
    try {
      localStorage.setItem(PREFIX + key, JSON.stringify(value));
      return true;
    } catch (err) {
      console.warn("storage.save:", err);
      return false;
    }
  },

  remove(key) {
    try {
      localStorage.removeItem(PREFIX + key);
    } catch (err) {
      console.warn("storage.remove:", err);
    }
  },
};