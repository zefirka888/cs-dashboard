/**
 * Общий хелпер для GET-запросов JSON.
 * Бросает Error при HTTP-ошибке или невалидном JSON.
 * При отмене через AbortController бросает AbortError — вызывающий код
 * должен проверить `err.name === "AbortError"` и молча выйти.
 */
export async function fetchJSON(url, signal) {
  const res = await fetch(url, { signal });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}