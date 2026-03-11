/**
 * preloadSettings()
 * - Carga todos los settings existentes
 * - Inicializa el cache reactivo
 * - Evita flash de UI
 */
async function preloadSettings(): Promise<void> {
  const table = "settings";

  try {
    const rows: SettingRow[] = await this.store.query(table);

    for (const row of rows) {
      if (!row?.key) continue;

      // si ya existe, no lo pisamos
      if (this.settingsMap.has(row.key)) continue;

      const initialValue =
        row.value !== undefined ? row.value : row.default;

      const [get, set] = createSignal<any>(initialValue);

      this.settingsMap.set(row.key, {
        get,
        set,
        unsub: undefined, // aún no hay liveQuery
      });
    }
  } catch (e) {
    console.warn("SchemaCache.preloadSettings failed", e);
  }
}
