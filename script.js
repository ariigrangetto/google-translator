import { $ } from "./dom.js";
console.log("working");

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
    this.currentTranslatorKey = null;
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

  updateDetectedLanguage(detectedLanguage) {
    const option = this.sourceLanguage.querySelector(
      `option[value="${detectedLanguage}"]`
    );

    if (option) {
      const autoOption =
        this.sourceLanguage.querySelector(`option[value="auto"]`);
      autoOption.textContent = `Detectar idioma (${option.textContent})`;
    }
  }

  async getTranslation(text) {
    const sourceLanguage =
      this.sourceLanguage.value === "auto"
        ? await this.detectLanguage(text)
        : this.sourceLanguage.value;

    const targetLanguage = this.targetLanguage.value;

    if (sourceLanguage === targetLanguage) return text;

    //checking availability of languanges for translation.
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

    const translatorKey = `${sourceLanguage}-${targetLanguage}`;

    try {
      if (
        !this.currentTranslator ||
        this.currentTranslatorKey !== translatorKey
      ) {
        //window.Translator.create creates a new Translator instance that can be used to translate text
        this.currentTranslator = await window.Translator.create({
          sourceLanguage,
          targetLanguage,
          //monitor download progress;
          monitor: (monitor) => {
            monitor.addEventListener("downloadprogress", (e) => {
              this.outputText.innerHTML = `<span class="loading">Descangando modelo: ${Math.floor(
                e.loaded * 100
              )}%</span>`;
            });
          },
        });
      }

      this.currentTranslatorKey = translatorKey;

      const translation = await this.currentTranslator.translate(text);
      return translation;
    } catch (error) {
      console.error(error);
      return "Error al traducir";
    }
  }

  async translate() {
    const text = this.inputText.value.trim();
    if (!text) {
      this.outputText.textContent = "";
      return;
    }

    this.outputText.textContent = "Traduciendo...";

    if (this.sourceLanguage.value === "auto") {
      const detectedLanguage = await this.detectLanguage();
      this.updateDetectedLanguage(detectedLanguage);
    }

    try {
      const translation = await this.getTranslation(text);
      this.outputText.textContent = translation;
    } catch (error) {
      console.error(error);
      const hasSuport = this.checkAPISupport();
      if (!hasSuport) {
        this.outputText.textContent =
          "¡Error! No tienes soporte a la API de traducción con IA";
      }

      this.outputText.textContent = "Error al traducir";
    }
  }
  async swapLanguages() {
    if (this.sourceLanguage.value === "auto") {
      const detectedLanguage = await this.detectLanguage(this.inputText.vaue);
      this.sourceLanguage.value = detectedLanguage;
    }
    //change select value
    const temporalLanguage = this.sourceLanguage.value;
    this.sourceLanguage.value = this.targetLanguage.value;
    this.targetLanguage.value = temporalLanguage;

    //interchange texts
    this.inputText.value = this.outputText.value;
    this.outputText.value = "";

    if (this.inputText.value.trim()) {
      this.translate();
      //calling again the function to control the translation after the swap
    }
  }

  async detectLanguage(text) {
    try {
      if (!this.currentDetector) {
        this.currentDetector = await window.LanguageDetector.create({
          expectedInputLanguages: GoogleTranslator.SUPPORTED_LANGUAGES,
        });
      }
      const results = await this.currentDetector.detect(text);
      //this gives you a list of detected languages and his confidence porcents

      const detectedLanguage = results[0]?.detectedLanguage;

      //if it is undefined we provide the default language
      return detectedLanguage === "und"
        ? GoogleTranslator.DEFAULT_SOURCE_LANGUAGE
        : detectedLanguage;
    } catch (error) {
      console.error("No he podido averiguar el idioma");
      return GoogleTranslator.DEFAULT_SOURCE_LANGUAGE;
    }
  }
}

const googleTranslator = new GoogleTranslator();
