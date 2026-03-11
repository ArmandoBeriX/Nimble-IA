import { useTranslation } from "solid-i18next"
import { store } from "../app"
import FieldEdit from "../components/fields/FieldEdit"
import { useRecordQuery } from "../hooks/useRecords"
import { Show } from "solid-js"
import { TableField } from '../types/schema';

export default function Preferences() {
  const [t, i18n, ready] = useTranslation()
  const user = store.watchSession('user')

  const langField = ((): Partial<TableField> => {
    return { identifier: 'lang', isEditable: true, name: t('lang'), descripcion: t('lang_description'), fieldFormat: 'list', storeData: { posibleValues: { 'default': { label: t('browser') }, 'es': { label: t('spanish') }, 'en': { label: t('english') } } } }
  })
  const langVal = store.watchSession('lang', 'default')
  
  const themeField = ((): Partial<TableField> => {
    ready()
    return { identifier: 'theme', isEditable: true, name: t('theme'), descripcion: t('theme_description'), fieldFormat: 'list', storeData: { posibleValues: { 'default': { label: t('browser') }, 'light': { label: t('light') }, 'dark': { label: t('dark') } } } }
  })
  const themeVal = store.watchSession('theme', 'default')

  const PreferencesHeader = () => (
    <div class="border-b border-gray-200 pb-4 mb-6">
      <h3 class="text-xl font-medium">{t("preferences")}</h3>
    </div>
  )

  const { loading, error } = { loading: () => '', error: () => null }
  //const { data: preferences, loading, error } = useRecordQuery('prefferencies', { user_id: user()?.id })

  return (
    <Show when={user()} fallback={
      <div class="max-w-2xl mx-auto p-4">
        <PreferencesHeader />
        <div class="bg-yellow-50 ...">
          <p>No estas registrado</p>
          <a href="/login?backUrl=/preferences">{t("login")}</a>
        </div>
      </div>
    }>
      <div class="max-w-2xl mx-auto p-4">
        <PreferencesHeader />

        {loading() && (
          <div class="text-gray-600">Cargando...</div>
        )}

        {error() && (
          <div class="bg-red-50 border border-red-200 p-4 rounded text-red-700">
            Error al cargar preferencias
          </div>
        )}

        {!loading() && !error() && (
          <div class="space-y-4">
            <FieldEdit value={themeVal} field={themeField()} onChange={
              (val) => store.setSession('theme', val)
            } />

            <FieldEdit value={langVal} field={langField()} onChange={
              (val) => store.setSession('lang', val)
            } />

            <div class="text-sm text-gray-500 pt-2">
              Más opciones próximamente
            </div>
          </div>
        )}
      </div>
    </Show>
  )
}