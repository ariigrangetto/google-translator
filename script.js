import { $ } from "./dom.js";
class GoogleTranslator {
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
    this.inputText = $("#inputText");
    this.outputText = $("#outputText");

    this.sourceLanguage = $("#sourceLanguage");
    this.targetLanguage = $("#targetLanguage");

    this.swapLanguagesClick = $("#swapLanguages");

    this.micButton = $("#micButton");
    this.copyButton = $("#copyButton");
    this.speakerButton = $("#speakerButton");

    //initial configuration
    this.targetLanguage.value = GoogleTranslator.DEFAULT_TARGET_LANGUAGE;

    //checking api IA support
    this.checkAPISupport();
  }

  checkAPISupport() {
    this.hasNativeTranslator = "Translator" in window;
    this.hasNativeDetector = "LanguageDetector" in window;

    //it needs to have availibility for both
    if (!this.hasNativeDetector || !this.hasNativeTranslator) {
      console.warn(
        "APIs nativas de traduccion y detección NO soportadas en tu navegador."
      );
    } else {
      console.log("APIs nativas de IA disponibles");
    }
  }

  setupEventListeners() {
    this.inputText.addEventListener("input", () => {
      this.debounceTranslate();
      //TODO:
      //calcular el length del texto
    });

    this.sourceLanguage.addEventListener("change", () => this.translate());
    this.targetLanguage.addEventListener("change", () => this.translate());

    this.swapLanguagesClick.addEventListener("click", () =>
      this.swapLanguages()
    );

    this.micButton.addEventListener("click", () =>
      this.startVoiceRecognition()
    );

    this.speakerButton.addEventListener("click", () => {
      this.speakRecognition();
    });
  }

  debounceTranslate() {
    clearTimeout(this.translationTimeout);
    this.translationTimeout = setTimeout(() => {
      this.translate();
    }, 500);
  }

  //detecting languange in cause of auto
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
      const detectedLanguage = await this.detectLanguage(text);
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

  getFullLanguageCode(languageCode) {
    return (
      GoogleTranslator.FULL_LANGUAGES_CODES[languageCode] ??
      GoogleTranslator.DEFAULT_SOURCE_LANGUAGE
    );
  }

  async startVoiceRecognition() {
    //using app "SpeechRecognition"
    //it can look like this to "webkitSpeechRecognition"
    const hasNativeRecognitionSupport =
      "SpeechRecognition" in window || "webkitSpeechRecognition" in window;
    if (!hasNativeRecognitionSupport) return;

    const SpeechRecognition =
      window.SpeechRecognition ?? window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();

    recognition.continuous = false;
    recognition.interimResults = false;

    const language =
      this.sourceLanguage.value === "auto"
        ? await this.detectLanguage(this.inputText.value)
        : this.sourceLanguage.value;

    recognition.lang = this.getFullLanguageCode(language);

    recognition.onstart = () => {
      this.micButton.style.backgroundColor = "var(--google-red)";
      this.micButton.style.color = "white";
    };

    recognition.onend = () => {
      this.micButton.style.backgroundColor = "";
      this.micButton.style.color = "";
    };

    recognition.onresult = (event) => {
      console.log(event.results);

      const [{ transcript }] = event.results[0];
      this.inputText.value = transcript;
      this.translate();
    };

    recognition.onerror = (event) => {
      console.error("Error de reconocimiento de voz: ", event.error);
    };

    recognition.start();
  }

  speakRecognition() {
    console.log("working");
    const hasNativeSuportSynthesis = "SpeechSynthesis" in window;
    if (!hasNativeSuportSynthesis) return;

    const text = this.outputText.textContent;
    if (!text) return;

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = this.getFullLanguageCode(this.targetLanguage.value);
    utterance.rate = 0.9;

    utterance.onstart = () => {
      this.speakerButton.style.backgroundColor = "var(--google-green)";
      this.speakerButton.style.color = "white";
    };

    utterance.onend = () => {
      this.speakerButton.style.backgroundColor = "";
      this.speakerButton.style.color = "";
    };

    window.speechSynthesis.speak(utterance);
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
