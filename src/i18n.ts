// stc/i18n.ts
import i18next from "i18next"

i18next.init({
  lng: "es",
  fallbackLng: "en",

  resources: {
    es: {
      translation: {
        english: "Inglés",
        spanish: "Español",
        lang: "Idioma",
        lang_description: "Cambiar idioma de la página",
        theme: "Tema",
        light: 'Claro',
        dark: 'Oscuro',
        theme_description: "Cambiar tema de la página",
        login: "Iniciar sesión",
        logout: "Cerrar sesión",
        account: "Cuenta",
        browser: "Navegador",
        preferences: "Preferencias",
      }
    },
    en: {
      translation: {
        english: "English",
        spanish: "Spanish",
        lang: "Language",
        lang_description: "Change the page language",
        theme: "Theme",
        light: 'Light',
        dark: 'Dark',
        theme_description: "Change the page theme",
        login: "Login",
        logout: "Logout",
        account: "Account",
        browser: "Browser",
        preferences: "Preferences"
      }
    }
  }
})

export default i18next