import { $ } from "./dom.js";

class GoogleTranslator {
  // static es para guardar constantes que no cambian
  static SUPPORTED_LANGUAGES = [
    "en",
    "es",
    "fr",
    "de",
    "it",
    "pt",
    "ru",
    "ja",
    "zh",
  ];

  static FULL_LANGUAGES_CODES = {
    es: "es-ES",
    en: "en-US",
    fr: "fr-FR",
    de: "de-DE",
    it: "it-IT",
    pt: "pt-PT",
    ru: "ru-RU",
    ja: "ja-JP",
    zh: "zh-CN",
  };

  static DEFAULT_SOURCE_LANGUAGE = "es";
  static DEFAULT_TARGET_LANGUAGE = "en";

  constructor() {
    this.init();
    this.setupEventListeners();
    this.currentTranslator = null;
    this.currentDetector = null;
    this.translationTimeout = null;
  }

  init() {
    //recuperar elementos del DOM;
    this.inputText = $("#inputText");
    this.outputText = $("#outputText");

    this.sourceLanguage = $("#sourceLanguage");
    this.targetLanguage = $("#targetLanguage");

    this.swapLanguagesClick = $("#swapLanguages");

    this.micButton = $("#micButton");
    this.copyButton = $("#copyButton");
    this.speakerButton = $("#speakerButton");

    //configuracion inicial;
    this.targetLanguage.value = GoogleTranslator.DEFAULT_TARGET_LANGUAGE;

    //verificar que el usuario tiene soporte para la api de la traduccion

    this.checkAPISupport();
  }
  checkAPISupport() {
    this.hasNativeTranslator = "Translator" in window;
    this.hasNativeDetector = "LanguageDetector" in window;

    if (!this.hasNativeDetector || !this.hasNativeTranslator) {
      console.warn(
        "APIs nativas de traduccion y detección NO soportadas en tu navegador."
      );
    } else {
      console.log("APIs nativas de IA disponibles");
    }
  }

  setupEventListeners() {
    //eventos al escribir en el input
    this.inputText.addEventListener("input", () => {
      this.debounceTranslate();
      //calcular el length del texto
      //traducir el texto con un debounce
    });

    //eventos para el cambio de idioma
    this.sourceLanguage.addEventListener("change", () => this.translate());
    this.targetLanguage.addEventListener("change", () => this.translate());

    this.swapLanguagesClick.addEventListener("click", () =>
      this.swapLanguages()
    );
  }

  debounceTranslate() {
    clearTimeout(this.translationTimeout);
    this.translationTimeout = setTimeout(() => {
      this.translate();
    }, 500);
  }

  async getTranslation(text) {
    const sourceLanguage = this.sourceLanguage.value;
    const targetLanguage = this.targetLanguage.value;

    if (sourceLanguage === targetLanguage) return text;

    //revisando si tenemos disponibilidad de lenguajes para hacer la traduccion
    try {
      const status = await window.Translator.availability({
        sourceLanguage,
        targetLanguage,
      });
      if (status === "unavailable") {
        throw new Error(
          `Traduccion de ${sourceLanguage} a ${targetLanguage} no disponible`
        );
      }
    } catch (error) {
      console.error(error);
      throw new Error(
        `Traducción de ${sourceLanguage} a ${targetLanguage} no disponible`
      );
    }
  }

  async translate() {
    const text = this.inputText.value.trim();
    if (!text) {
      this.outputText.textContent = "";
      return;
    }

    this.outputText.textContent = "Traduciendo...";
    try {
      const translation = await this.getTranslation();
      this.outputText.textContent = translation;
    } catch (error) {
      console.error(error);
      this.outputText.textContent = "Error al traducir";
    }
  }
  swapLanguages() {}
}

const googleTranslator = new GoogleTranslator();
//De aquí llamo al constructor
