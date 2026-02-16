const rooms = ["Reception", "Atlas", "Orion", "Delta", "Neva"];
const DRINK_MENU_ITEMS = [
  { id: "espresso", name: "Эспрессо", icon: "☕" },
  { id: "cappuccino", name: "Капучино", icon: "☕" },
  { id: "green-tea", name: "Чай зеленый", icon: "🍵" },
  { id: "lemonade", name: "Лимонад цитрус", icon: "🍋" },
  { id: "americano", name: "Американо", icon: "☕" },
  { id: "latte", name: "Латте", icon: "🥛" },
  { id: "earl-grey", name: "Чай Earl Grey", icon: "🫖" },
  { id: "water", name: "Минеральная вода", icon: "💧" },
  { id: "orange-juice", name: "Апельсиновый сок", icon: "🍊" },
];

const state = {
  selectedRoom: "Reception",
};

const appRoot = document.querySelector(".app");
const logoReloadLink = document.getElementById("logoReloadLink");
const menuButtons = Array.from(document.querySelectorAll(".menu-btn"));
const panels = Array.from(document.querySelectorAll(".panel"));
const roomSelect = document.getElementById("roomSelect");
const drinkRoomSelect = document.getElementById("drinkRoomSelect");
const drinkRecipientInput = document.getElementById("drinkRecipient");
const drinkCatalog = document.getElementById("drinkCatalog");
const singleDrinkOrderBtn = document.getElementById("singleDrinkOrderBtn");
const companyOrderOpenBtn = document.getElementById("companyOrderOpenBtn");
const companyOrderModal = document.getElementById("companyOrderModal");
const companyOrderCloseBtn = document.getElementById("companyOrderCloseBtn");
const companyOrderForm = document.getElementById("companyOrderForm");
const companyOrderRoomSelect = document.getElementById("companyOrderRoomSelect");
const companyOrderCompanyInput = document.getElementById("companyOrderCompanyInput");
const companyOrderItems = document.getElementById("companyOrderItems");
const supportForm = document.getElementById("supportForm");
const supportResult = document.getElementById("supportResult");
const issueSelect = document.getElementById("issueSelect");
const quizOptions = Array.from(document.querySelectorAll(".quiz-option"));
const quizQuestion = document.getElementById("quizQuestion");
const quizScoreBadge = document.getElementById("quizScoreBadge");
const quizMark = document.getElementById("quizMark");
const quizResult = document.getElementById("quizResult");
const brochureLinks = Array.from(document.querySelectorAll("[data-brochure-title]"));
const globalDateTime = document.getElementById("globalDateTime");
const newsCards = Array.from(document.querySelectorAll("[data-news-card]"));
const newsOverlay = document.getElementById("newsOverlay");
const newsBackBtn = document.getElementById("newsBackBtn");
const newsOverlayImage = document.getElementById("newsOverlayImage");
const newsOverlayTag = document.getElementById("newsOverlayTag");
const newsOverlayTitle = document.getElementById("newsOverlayTitle");
const newsOverlayLead = document.getElementById("newsOverlayLead");
const newsOverlayBody = document.getElementById("newsOverlayBody");
const orderPopup = document.getElementById("orderPopup");
const orderPopupTitle = document.getElementById("orderPopupTitle");
const orderPopupMessage = document.getElementById("orderPopupMessage");
const quizFinalOverlay = document.getElementById("quizFinalOverlay");
const quizFinalText = document.getElementById("quizFinalText");
const toast = document.getElementById("toast");
const dinoCanvas = document.getElementById("dinoCanvas");
const scoreValue = document.getElementById("scoreValue");
const bestValue = document.getElementById("bestValue");
const gameMeta = document.getElementById("gameMeta");

let toastTimeoutId = 0;
let fitRafId = 0;
let lastViewportScale = 1;
let lastViewportOffset = 0;
let orderPopupTimeoutId = 0;
let activePanelName = "news";
let drinkRoomCustomSelectController = null;
let companyRoomCustomSelectController = null;
let supportCustomSelectControllers = [];
const newsImageClasses = ["news-image-1", "news-image-2", "news-image-3", "news-image-4"];
const LEGAL_QUIZ_QUESTIONS = [
  {
    question: "Можно ли отправлять проект договора в открытый мессенджер без шифрования?",
    options: [
      "Да, если это только внутренний чат",
      "Нет, нужен защищенный канал передачи",
      "Можно, если убрать подписи и реквизиты",
    ],
    correctIndex: 1,
  },
  {
    question: "Какой документ обычно подтверждает полномочия представителя подписывать договор?",
    options: ["Служебная записка", "Доверенность", "Презентация проекта"],
    correctIndex: 1,
  },
  {
    question: "Нужно ли получать согласие на обработку персональных данных в случаях, когда нет другого законного основания?",
    options: ["Да, нужно", "Нет, это необязательно", "Только если данные бумажные"],
    correctIndex: 0,
  },
  {
    question: "Что безопаснее при обмене конфиденциальными документами?",
    options: [
      "Публичный файлообменник без пароля",
      "Личная почта сотрудника",
      "Корпоративный защищенный контур с ограничением доступа",
    ],
    correctIndex: 2,
  },
  {
    question: "Можно ли изменять существенные условия договора только перепиской без допсоглашения, если форма требует письменного изменения?",
    options: ["Как правило, нет", "Да, всегда можно", "Да, если согласен менеджер"],
    correctIndex: 0,
  },
  {
    question: "Что делать при получении претензии от контрагента в первую очередь?",
    options: [
      "Игнорировать до следующего месяца",
      "Передать в юридическую функцию и зафиксировать сроки ответа",
      "Удалить спорную переписку",
    ],
    correctIndex: 1,
  },
  {
    question: "Допустимо ли использовать чужой логотип в презентации без разрешения правообладателя?",
    options: ["Да, если презентация внутренняя", "Нет, без прав это риск нарушения", "Да, если уменьшить размер"],
    correctIndex: 1,
  },
  {
    question: "Что обычно относится к коммерческой тайне компании?",
    options: ["Публичная реклама", "Внутренние финансовые модели и непубличные условия сделок", "Название компании"],
    correctIndex: 1,
  },
  {
    question: "Можно ли хранить клиентские договоры на личном облачном диске сотрудника?",
    options: ["Нет, только в корпоративной системе", "Да, если диск защищен паролем", "Да, если ненадолго"],
    correctIndex: 0,
  },
  {
    question: "Что важно проверить в договоре перед оплатой счета?",
    options: [
      "Совпадение реквизитов, основания платежа и условий оплаты",
      "Только красивое оформление",
      "Наличие логотипа контрагента",
    ],
    correctIndex: 0,
  },
  {
    question: "Как корректно оформлять передачу прав на результаты работ подрядчика?",
    options: [
      "Устной договоренностью в звонке",
      "Письменно в договоре/акте с четкими условиями",
      "Через сообщение в чате без вложений",
    ],
    correctIndex: 1,
  },
  {
    question: "Что из перечисленного снижает антимонопольные риски в переговорах с конкурентами?",
    options: [
      "Обсуждение будущих цен",
      "Обмен закрытой коммерческой информацией",
      "Избегание обсуждения чувствительных конкурентных параметров",
    ],
    correctIndex: 2,
  },
  {
    question: "При публикации фотографии сотрудника на внешнем ресурсе обычно нужно:",
    options: [
      "Письменное/зафиксированное согласие и соблюдение политики компании",
      "Ничего, если фото сделано в офисе",
      "Только устное одобрение коллеги",
    ],
    correctIndex: 0,
  },
  {
    question: "Что правильнее при обнаружении ошибки в уже подписанном документе?",
    options: ["Сделать исправление ручкой в одном экземпляре", "Оформить корректирующий документ/допсоглашение", "Оставить как есть"],
    correctIndex: 1,
  },
  {
    question: "Какой подход корректен к срокам хранения юридически значимых документов?",
    options: [
      "Хранить по установленным срокам и внутренней политике",
      "Удалять сразу после оплаты",
      "Оставлять только скриншоты",
    ],
    correctIndex: 0,
  },
];

const quizState = {
  questions: [],
  currentIndex: 0,
  correctCount: 0,
  locked: false,
  completionTimeoutId: 0,
};

const newsPrototypePool = [
  {
    tag: "Внутренние процессы",
    title: "Новая схема бронирования переговорок",
    lead: "Запуск единого окна бронирования для ресепшена и этажных администраторов.",
    body:
      "Команда офиса тестирует быстрый сценарий: бронирование, заказ напитков и техподдержка в одном потоке. В прототипе предусмотрен сокращенный путь для повторных встреч и обновление статуса комнаты в реальном времени.",
  },
  {
    tag: "Инфраструктура",
    title: "Обновление мультимедийных панелей",
    lead: "В четырех переговорках установлены новые экраны с автоматическим определением источника сигнала.",
    body:
      "Техническая команда завершила первый этап обновления AV-инфраструктуры. Следующий шаг: добавить автоматическую диагностику проблем со звуком и быстрый вызов инженера прямо из меню QR.",
  },
  {
    tag: "Корпоративная жизнь",
    title: "Пятничный формат коротких демо",
    lead: "Каждая команда получает 5 минут на презентацию фич и 2 минуты на вопросы.",
    body:
      "Формат направлен на быстрый обмен контекстом между юристами, продуктом и операционными командами. После выступлений участники могут сразу перейти к обсуждению в соседних переговорках через единую систему бронирования.",
  },
  {
    tag: "Сервис",
    title: "Единый стандарт гостевого опыта",
    lead: "Для гостей внедряется единый сценарий: QR на входе, приветствие и быстрый выбор сервиса.",
    body:
      "Цель изменений — сократить время от входа до начала встречи. Весь путь теперь помещается в одно мобильное меню: новости компании, напитки, техподдержка и развлекательный режим во время ожидания.",
  },
];

function normalizeRoom(value) {
  return value.trim().toLowerCase().replace(/[_-]+/g, " ");
}

function detectRoomFromQuery() {
  const params = new URLSearchParams(window.location.search);
  const raw = params.get("room");
  if (!raw) return null;
  const normalized = normalizeRoom(raw);
  return rooms.find((room) => normalizeRoom(room) === normalized) || null;
}

function setRoom(roomName) {
  state.selectedRoom = roomName;
}

function queueFitToViewport() {
  if (fitRafId) {
    cancelAnimationFrame(fitRafId);
  }
  fitRafId = requestAnimationFrame(() => {
    fitRafId = 0;
    fitAppToViewport();
  });
}

function fitAppToViewport() {
  if (!appRoot) return;
  const viewportHeight = window.visualViewport?.height || window.innerHeight;
  const viewportWidth = window.visualViewport?.width || window.innerWidth;
  if (!viewportHeight) return;

  const unlockDinoLayout = activePanelName === "dino" && viewportHeight > 844;
  appRoot.classList.toggle("dino-unlocked", unlockDinoLayout);

  const forceNoScaleLayout = activePanelName === "drinks" || unlockDinoLayout;
  const useCompactLayout = activePanelName === "drinks" || viewportWidth <= 430 || viewportHeight < 900;
  appRoot.classList.toggle("compact-layout", useCompactLayout);
  if (forceNoScaleLayout || useCompactLayout) {
    appRoot.style.transform = "none";
    appRoot.style.marginTop = "0px";
    lastViewportScale = 1;
    lastViewportOffset = 0;
    return;
  }

  const prevTransform = appRoot.style.transform;
  const prevMarginTop = appRoot.style.marginTop;
  if (prevTransform !== "scale(1)") {
    appRoot.style.transform = "scale(1)";
  }
  if (prevMarginTop !== "0px") {
    appRoot.style.marginTop = "0px";
  }

  const contentHeight = appRoot.scrollHeight;
  const scale = Math.min(1, viewportHeight / Math.max(1, contentHeight));
  const scaleChanged = Math.abs(scale - lastViewportScale) > 0.001;
  if (scaleChanged) {
    appRoot.style.transform = `scale(${scale})`;
    lastViewportScale = scale;
  } else if (prevTransform !== `scale(${scale})`) {
    appRoot.style.transform = `scale(${scale})`;
  }

  const topOffset = Math.max(0, (viewportHeight - contentHeight * scale) / 2);
  const offsetChanged = Math.abs(topOffset - lastViewportOffset) > 0.5;
  if (offsetChanged) {
    appRoot.style.marginTop = `${topOffset}px`;
    lastViewportOffset = topOffset;
  } else if (prevMarginTop !== `${topOffset}px`) {
    appRoot.style.marginTop = `${topOffset}px`;
  }
}

function setActivePanel(panelName) {
  activePanelName = panelName;
  appRoot?.classList.toggle("drinks-mode", panelName === "drinks");
  menuButtons.forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.target === panelName);
  });
  panels.forEach((panel) => {
    panel.classList.toggle("hidden", panel.dataset.panel !== panelName);
  });
  if (panelName !== "news") {
    closeNewsOverlay();
  }
  if (panelName !== "quiz") {
    closeQuizFinalOverlay();
  }
  queueFitToViewport();
}

function showToast(message) {
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(toastTimeoutId);
  toastTimeoutId = window.setTimeout(() => {
    toast.classList.remove("show");
  }, 2200);
}

function closeOrderPopup() {
  if (!orderPopup) return;
  orderPopup.classList.remove("open");
  orderPopup.classList.remove("success-mode");
  orderPopup.setAttribute("aria-hidden", "true");
}

function showTimedPopup(title, message, minDurationMs = 3000, maxDurationMs = 4000, options = {}) {
  if (!orderPopup || !orderPopupMessage || !orderPopupTitle) return;
  const successMode = Boolean(options.success);
  orderPopupTitle.textContent = title;
  orderPopupMessage.textContent = message;
  orderPopup.classList.toggle("success-mode", successMode);
  orderPopup.classList.add("open");
  orderPopup.setAttribute("aria-hidden", "false");

  clearTimeout(orderPopupTimeoutId);
  const spread = Math.max(0, maxDurationMs - minDurationMs + 1);
  const popupDuration = minDurationMs + Math.floor(Math.random() * spread);
  orderPopupTimeoutId = window.setTimeout(() => {
    closeOrderPopup();
  }, popupDuration);
}

function toGenitiveWord(rawWord, preferredGender = "") {
  const word = String(rawWord || "").trim();
  if (!word) return word;
  const lower = word.toLowerCase();

  const keepAsIs = ["\u043e\u0433\u043b\u044b", "\u043a\u044b\u0437\u044b"];
  if (keepAsIs.some((ending) => lower.endsWith(ending))) {
    return word;
  }

  const applySameCase = (next) => {
    if (word === word.toUpperCase()) return next.toUpperCase();
    if (word[0] === word[0].toUpperCase()) {
      return next.charAt(0).toUpperCase() + next.slice(1);
    }
    return next;
  };

  const replaceLast = (count, nextTail) => applySameCase(lower.slice(0, -count) + nextTail);

  if (lower.endsWith("\u0438\u044f")) return replaceLast(2, "\u0438\u0438");
  if (lower.endsWith("\u044c\u044f")) return replaceLast(2, "\u044c\u0438");
  if (lower.endsWith("\u044f")) return replaceLast(1, "\u0438");
  if (lower.endsWith("\u0430")) {
    const beforeA = lower.slice(-2, -1);
    const softSet = ["\u0433", "\u043a", "\u0445", "\u0436", "\u0447", "\u0448", "\u0449", "\u0446"];
    return replaceLast(1, softSet.includes(beforeA) ? "\u0438" : "\u044b");
  }
  if (lower.endsWith("\u0439")) return replaceLast(1, "\u044f");
  if (lower.endsWith("\u044c")) return replaceLast(1, preferredGender === "female" ? "\u0438" : "\u044f");

  if (/[\u0431\u0432\u0433\u0434\u0436\u0437\u043a\u043b\u043c\u043d\u043f\u0440\u0441\u0442\u0444\u0445\u0446\u0447\u0448\u0449]$/i.test(lower)) {
    return applySameCase(`${lower}\u0430`);
  }

  return word;
}

function toRecipientGenitive(recipientRaw) {
  const raw = String(recipientRaw || "").trim();
  if (!raw) return "\u0433\u043e\u0441\u0442\u044f";

  const parts = raw.split(/\s+/);
  let detectedGender = "";
  if (parts.length >= 2) {
    const second = parts[1].toLowerCase();
    if (
      second.endsWith("\u0432\u0438\u0447") ||
      second.endsWith("\u0438\u0447") ||
      second.endsWith("\u043e\u0433\u043b\u044b")
    ) {
      detectedGender = "male";
    }
    if (
      second.endsWith("\u0432\u043d\u0430") ||
      second.endsWith("\u0438\u0447\u043d\u0430") ||
      second.endsWith("\u043a\u044b\u0437\u044b")
    ) {
      detectedGender = "female";
    }
  }

  return parts
    .map((part) => {
      const chunks = part.split("-");
      return chunks.map((chunk) => toGenitiveWord(chunk, detectedGender)).join("-");
    })
    .join(" ");
}

function showOrderPopup(items, room, recipient, waitMin, waitMax) {
  const normalizedItems = Array.isArray(items) ? items : [];
  const recipientGenitive = toRecipientGenitive(recipient);
  const itemsLines = normalizedItems
    .map((item) => `- ${item.name}, ${Math.max(1, Number(item.quantity) || 1)}`)
    .join("\n");

  const message =
    `\u0417\u0430\u043a\u0430\u0437 \u0434\u043b\u044f ${recipientGenitive}\n` +
    `\u041f\u0435\u0440\u0435\u0433\u043e\u0432\u043e\u0440\u043a\u0430: ${room}\n` +
    `\u0412\u0430\u043c \u043f\u0440\u0438\u043d\u0435\u0441\u0443\u0442:\n${itemsLines}\n` +
    "\u0421\u043f\u0430\u0441\u0438\u0431\u043e \u0437\u0430 \u0437\u0430\u043a\u0430\u0437! \u041e\u0436\u0438\u0434\u0430\u0439\u0442\u0435.";

  showTimedPopup("\u0417\u0430\u043a\u0430\u0437 \u043f\u0440\u0438\u043d\u044f\u0442", message, 7000, 7000, { success: true });
}

function showSupportPopup() {
  showTimedPopup("Заявка принята", "Тех. специалист выдвинулся к вам!");
}

function closeQuizFinalOverlay() {
  if (!quizFinalOverlay) return;
  quizFinalOverlay.classList.remove("open");
  quizFinalOverlay.setAttribute("aria-hidden", "true");
}

function showQuizFinalOverlay(percent) {
  if (!quizFinalOverlay || !quizFinalText) return;
  quizFinalText.textContent = `Поздравляем, вы юрист на ${percent}%`;
  quizFinalOverlay.classList.add("open");
  quizFinalOverlay.setAttribute("aria-hidden", "false");
}

function readLocalStorageNumber(key, fallback = 0) {
  try {
    const raw = localStorage.getItem(key);
    const parsed = Number(raw);
    if (!Number.isFinite(parsed)) return fallback;
    return parsed;
  } catch (error) {
    return fallback;
  }
}

function writeLocalStorage(key, value) {
  try {
    localStorage.setItem(key, value);
  } catch (error) {
    // Ignore storage errors: UI flows must keep working.
  }
}

function storeLog(type, payload) {
  const key = "reception_connect_events";
  try {
    const raw = localStorage.getItem(key);
    const parsed = raw ? JSON.parse(raw) : [];
    const previous = Array.isArray(parsed) ? parsed : [];
    previous.push({
      type,
      payload,
      at: new Date().toISOString(),
    });
    writeLocalStorage(key, JSON.stringify(previous.slice(-50)));
  } catch (error) {
    // Silent fallback: logging must never block main user flows.
  }
}

function initTopSection() {
  const fromQuery = detectRoomFromQuery();
  if (fromQuery) {
    setRoom(fromQuery);
  } else {
    setRoom(state.selectedRoom);
  }

  if (!globalDateTime) return;

  const monthNames = [
    "января",
    "февраля",
    "марта",
    "апреля",
    "мая",
    "июня",
    "июля",
    "августа",
    "сентября",
    "октября",
    "ноября",
    "декабря",
  ];

  const datePrefixNode = document.createTextNode("");
  const timeWrap = document.createElement("span");
  timeWrap.className = "hero-time";
  const hourNode = document.createElement("span");
  hourNode.className = "hero-time-hour";
  const colonNode = document.createElement("span");
  colonNode.className = "hero-time-colon";
  colonNode.textContent = ":";
  const minuteNode = document.createElement("span");
  minuteNode.className = "hero-time-minute";
  timeWrap.append(hourNode, colonNode, minuteNode);
  globalDateTime.replaceChildren(datePrefixNode, document.createTextNode(" "), timeWrap);

  const renderGlobalDateTime = () => {
    const now = new Date();
    const day = now.getDate();
    const month = monthNames[now.getMonth()] || "";
    const year = now.getFullYear();
    const hours = String(now.getHours()).padStart(2, "0");
    const minutes = String(now.getMinutes()).padStart(2, "0");
    datePrefixNode.nodeValue = `Сегодня ${day} ${month} ${year}`;
    hourNode.textContent = hours;
    minuteNode.textContent = minutes;
  };
  renderGlobalDateTime();
  window.setInterval(renderGlobalDateTime, 60000);
}

function initLogoReloadLink() {
  if (!logoReloadLink) return;

  logoReloadLink.addEventListener("click", (event) => {
    event.preventDefault();
    const currentUrl = new URL(window.location.href);
    currentUrl.searchParams.set("_r", String(Date.now()));
    window.location.href = currentUrl.toString();
  });
}

function initNavigation() {
  menuButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const target = button.dataset.target;
      if (target) {
        setActivePanel(target);
      }
    });
  });

  setActivePanel("news");
}

function initDrinkRoomCustomSelect() {
  if (!drinkRoomSelect) return;
  drinkRoomCustomSelectController?.destroy?.();
  drinkRoomCustomSelectController = null;

  const host = drinkRoomSelect.parentElement;
  if (!host) return;

  const shell = document.createElement("div");
  shell.className = "drinks-custom-select";

  const trigger = document.createElement("button");
  trigger.type = "button";
  trigger.className = "drinks-custom-select-trigger";
  trigger.setAttribute("aria-haspopup", "listbox");
  trigger.setAttribute("aria-expanded", "false");

  const menu = document.createElement("div");
  menu.className = "drinks-custom-select-menu";
  menu.setAttribute("role", "listbox");

  const optionButtons = [];
  Array.from(drinkRoomSelect.options).forEach((option, optionIndex) => {
    if (option.hidden) return;
    const optionButton = document.createElement("button");
    optionButton.type = "button";
    optionButton.className = "drinks-custom-select-option";
    optionButton.dataset.value = option.value || "";
    optionButton.dataset.optionIndex = String(optionIndex);
    optionButton.textContent = option.textContent || "";
    optionButton.disabled = Boolean(option.disabled);
    if (option.disabled) {
      optionButton.classList.add("is-disabled");
    }
    menu.append(optionButton);
    optionButtons.push(optionButton);
  });

  const syncFromSelect = () => {
    const selectedIndex = Math.max(0, drinkRoomSelect.selectedIndex);
    const selectedOption = drinkRoomSelect.options[selectedIndex];
    const hasValue = Boolean((drinkRoomSelect.value || "").trim());

    trigger.textContent = selectedOption?.textContent || "";
    shell.classList.toggle("is-placeholder", !hasValue);
    optionButtons.forEach((btn) => {
      const optionIndex = Number.parseInt(btn.dataset.optionIndex || "-1", 10);
      btn.classList.toggle("is-current", optionIndex === selectedIndex);
    });
  };

  const close = () => {
    shell.classList.remove("open");
    trigger.setAttribute("aria-expanded", "false");
  };

  const open = () => {
    shell.classList.add("open");
    trigger.setAttribute("aria-expanded", "true");
  };

  const toggle = () => {
    if (shell.classList.contains("open")) {
      close();
    } else {
      open();
    }
  };

  const handleTriggerClick = () => {
    toggle();
  };

  const handleMenuClick = (event) => {
    const targetButton = event.target.closest(".drinks-custom-select-option");
    if (!targetButton || targetButton.disabled) return;
    const nextValue = targetButton.dataset.value || "";
    drinkRoomSelect.value = nextValue;
    drinkRoomSelect.dispatchEvent(new Event("change", { bubbles: true }));
    syncFromSelect();
    close();
  };

  const handleSelectChange = () => {
    syncFromSelect();
  };

  const handleOutsideClick = (event) => {
    if (!shell.contains(event.target)) {
      close();
    }
  };

  const handleEscape = (event) => {
    if (event.key === "Escape") {
      close();
    }
  };

  drinkRoomSelect.classList.add("drinks-native-select");
  drinkRoomSelect.setAttribute("aria-hidden", "true");
  drinkRoomSelect.tabIndex = -1;

  shell.append(trigger, menu);
  drinkRoomSelect.insertAdjacentElement("afterend", shell);

  trigger.addEventListener("click", handleTriggerClick);
  menu.addEventListener("click", handleMenuClick);
  drinkRoomSelect.addEventListener("change", handleSelectChange);
  document.addEventListener("pointerdown", handleOutsideClick);
  window.addEventListener("keydown", handleEscape);

  syncFromSelect();

  drinkRoomCustomSelectController = {
    close,
    destroy: () => {
      trigger.removeEventListener("click", handleTriggerClick);
      menu.removeEventListener("click", handleMenuClick);
      drinkRoomSelect.removeEventListener("change", handleSelectChange);
      document.removeEventListener("pointerdown", handleOutsideClick);
      window.removeEventListener("keydown", handleEscape);
      shell.remove();
      drinkRoomSelect.classList.remove("drinks-native-select");
      drinkRoomSelect.removeAttribute("aria-hidden");
      drinkRoomSelect.tabIndex = 0;
    },
  };
}

function initOrders() {
  if (!drinkRoomSelect || !drinkRecipientInput || !drinkCatalog || !singleDrinkOrderBtn) {
    return;
  }

  initDrinkRoomCustomSelect();

  const quantitiesByDrink = new Map(DRINK_MENU_ITEMS.map((item) => [item.id, 0]));
  const qtyValueByDrink = new Map();

  const clampQty = (nextValue) => {
    const parsed = Number.parseInt(String(nextValue || 0), 10);
    if (!Number.isFinite(parsed)) return 0;
    return Math.max(0, Math.min(9, parsed));
  };

  const selectedItems = () =>
    DRINK_MENU_ITEMS.map((item) => ({
      id: item.id,
      name: item.name,
      quantity: clampQty(quantitiesByDrink.get(item.id) || 0),
    })).filter((item) => item.quantity > 0);

  const hasSelectedRoom = () => Boolean((drinkRoomSelect.value || "").trim());
  const hasRecipient = () => Boolean(drinkRecipientInput.value.trim());

  const updateOrderButtonState = () => {
    singleDrinkOrderBtn.disabled = !(hasSelectedRoom() && hasRecipient() && selectedItems().length);
  };

  const updateCardQty = (drinkId, nextQty) => {
    const clamped = clampQty(nextQty);
    quantitiesByDrink.set(drinkId, clamped);
    const qtyNode = qtyValueByDrink.get(drinkId);
    if (qtyNode) {
      qtyNode.textContent = String(clamped);
    }
    updateOrderButtonState();
  };

  const renderDrinkCards = () => {
    drinkCatalog.innerHTML = "";
    qtyValueByDrink.clear();

    DRINK_MENU_ITEMS.forEach((item) => {
      const card = document.createElement("article");
      card.className = "drink-card";
      card.dataset.drinkId = item.id;

      const media = document.createElement("div");
      media.className = "drink-card-media";
      media.setAttribute("aria-hidden", "true");
      media.textContent = item.icon;

      const title = document.createElement("h3");
      title.className = "drink-card-name";
      title.textContent = item.name;

      const stepper = document.createElement("div");
      stepper.className = "drink-card-stepper drink-stepper";
      stepper.setAttribute("role", "group");
      stepper.setAttribute("aria-label", `Количество: ${item.name}`);

      const minusBtn = document.createElement("button");
      minusBtn.type = "button";
      minusBtn.className = "qty-btn";
      minusBtn.textContent = "-";
      minusBtn.setAttribute("aria-label", `Уменьшить количество: ${item.name}`);

      const qtyValue = document.createElement("span");
      qtyValue.className = "drink-qty-value drink-card-qty-value";
      qtyValue.setAttribute("aria-live", "polite");
      qtyValue.textContent = "0";

      const plusBtn = document.createElement("button");
      plusBtn.type = "button";
      plusBtn.className = "qty-btn";
      plusBtn.textContent = "+";
      plusBtn.setAttribute("aria-label", `Увеличить количество: ${item.name}`);

      minusBtn.addEventListener("click", () => {
        const current = clampQty(quantitiesByDrink.get(item.id) || 0);
        updateCardQty(item.id, current - 1);
      });
      plusBtn.addEventListener("click", () => {
        const current = clampQty(quantitiesByDrink.get(item.id) || 0);
        updateCardQty(item.id, current + 1);
      });

      stepper.append(minusBtn, qtyValue, plusBtn);
      card.append(media, title, stepper);
      drinkCatalog.append(card);
      qtyValueByDrink.set(item.id, qtyValue);
    });
  };

  renderDrinkCards();
  updateOrderButtonState();

  drinkRoomSelect.addEventListener("change", () => {
    const selectedRoom = (drinkRoomSelect.value || "").trim();
    if (selectedRoom) {
      setRoom(selectedRoom);
    }
    updateOrderButtonState();
  });
  drinkRecipientInput.addEventListener("input", updateOrderButtonState);

  singleDrinkOrderBtn.addEventListener("click", () => {
    const currentRoom = (drinkRoomSelect.value || "").trim();
    const recipient = drinkRecipientInput.value.trim();
    const items = selectedItems();

    if (!currentRoom) {
      showTimedPopup("Выберите переговорку", "Укажите переговорку для заказа.", 1800, 2200);
      return;
    }

    if (!items.length) {
      showTimedPopup("Добавьте напитки", "Выберите хотя бы одну позицию и укажите количество.", 1800, 2200);
      return;
    }

    if (!recipient) {
      showTimedPopup("Укажите получателя", "Заполните поле «Для кого, Имя Отчество».", 1800, 2200);
      drinkRecipientInput.focus();
      return;
    }

    setRoom(currentRoom);
    const waitMin = 5 + Math.floor(Math.random() * 3);
    const waitMax = waitMin + 2;
    const portionsTotal = items.reduce((total, item) => total + item.quantity, 0);

    showOrderPopup(items, currentRoom, recipient, waitMin, waitMax);
    storeLog("drink_order", {
      items,
      portionsTotal,
      room: currentRoom,
      recipient,
      waitMin,
      waitMax,
    });

    drinkRecipientInput.value = "";
    // For each new order force room re-selection from placeholder.
    drinkRoomSelect.value = "";
    drinkRoomSelect.dispatchEvent(new Event("change", { bubbles: true }));
    updateOrderButtonState();
  });
}

function initCompanyOrderRoomCustomSelect() {
  if (!companyOrderRoomSelect) return;
  companyRoomCustomSelectController?.destroy?.();
  companyRoomCustomSelectController = null;

  const host = companyOrderRoomSelect.parentElement;
  if (!host) return;

  const shell = document.createElement("div");
  shell.className = "company-room-custom-select";

  const trigger = document.createElement("button");
  trigger.type = "button";
  trigger.className = "company-room-custom-select-trigger";
  trigger.setAttribute("aria-haspopup", "listbox");
  trigger.setAttribute("aria-expanded", "false");

  const menu = document.createElement("div");
  menu.className = "company-room-custom-select-menu";
  menu.setAttribute("role", "listbox");

  const optionButtons = [];
  Array.from(companyOrderRoomSelect.options).forEach((option, optionIndex) => {
    if (option.hidden) return;
    const optionButton = document.createElement("button");
    optionButton.type = "button";
    optionButton.className = "company-room-custom-select-option";
    optionButton.dataset.value = option.value || "";
    optionButton.dataset.optionIndex = String(optionIndex);
    optionButton.textContent = option.textContent || "";
    optionButton.disabled = Boolean(option.disabled);
    if (option.disabled) {
      optionButton.classList.add("is-disabled");
    }
    menu.append(optionButton);
    optionButtons.push(optionButton);
  });

  const syncFromSelect = () => {
    const selectedIndex = Math.max(0, companyOrderRoomSelect.selectedIndex);
    const selectedOption = companyOrderRoomSelect.options[selectedIndex];
    const hasValue = Boolean((companyOrderRoomSelect.value || "").trim());

    trigger.textContent = selectedOption?.textContent || "";
    shell.classList.toggle("is-placeholder", !hasValue);
    optionButtons.forEach((btn) => {
      const optionIndex = Number.parseInt(btn.dataset.optionIndex || "-1", 10);
      btn.classList.toggle("is-current", optionIndex === selectedIndex);
    });
  };

  const close = () => {
    shell.classList.remove("open");
    trigger.setAttribute("aria-expanded", "false");
  };

  const open = () => {
    shell.classList.add("open");
    trigger.setAttribute("aria-expanded", "true");
  };

  const toggle = () => {
    if (shell.classList.contains("open")) {
      close();
    } else {
      open();
    }
  };

  const handleTriggerClick = () => {
    toggle();
  };

  const handleMenuClick = (event) => {
    const targetButton = event.target.closest(".company-room-custom-select-option");
    if (!targetButton || targetButton.disabled) return;
    const nextValue = targetButton.dataset.value || "";
    companyOrderRoomSelect.value = nextValue;
    companyOrderRoomSelect.dispatchEvent(new Event("change", { bubbles: true }));
    syncFromSelect();
    close();
  };

  const handleSelectChange = () => {
    syncFromSelect();
  };

  const handleOutsideClick = (event) => {
    if (!shell.contains(event.target)) {
      close();
    }
  };

  const handleEscape = (event) => {
    if (event.key === "Escape") {
      close();
    }
  };

  companyOrderRoomSelect.classList.add("company-room-native-select");
  companyOrderRoomSelect.setAttribute("aria-hidden", "true");
  companyOrderRoomSelect.tabIndex = -1;

  shell.append(trigger, menu);
  companyOrderRoomSelect.insertAdjacentElement("afterend", shell);

  trigger.addEventListener("click", handleTriggerClick);
  menu.addEventListener("click", handleMenuClick);
  companyOrderRoomSelect.addEventListener("change", handleSelectChange);
  document.addEventListener("pointerdown", handleOutsideClick);
  window.addEventListener("keydown", handleEscape);

  syncFromSelect();

  companyRoomCustomSelectController = {
    close,
    destroy: () => {
      trigger.removeEventListener("click", handleTriggerClick);
      menu.removeEventListener("click", handleMenuClick);
      companyOrderRoomSelect.removeEventListener("change", handleSelectChange);
      document.removeEventListener("pointerdown", handleOutsideClick);
      window.removeEventListener("keydown", handleEscape);
      shell.remove();
      companyOrderRoomSelect.classList.remove("company-room-native-select");
      companyOrderRoomSelect.removeAttribute("aria-hidden");
      companyOrderRoomSelect.tabIndex = 0;
    },
  };
}

function initCompanyOrderModal() {
  if (
    !companyOrderOpenBtn ||
    !companyOrderModal ||
    !companyOrderCloseBtn ||
    !companyOrderForm ||
    !companyOrderRoomSelect ||
    !companyOrderCompanyInput ||
    !companyOrderItems
  ) {
    return;
  }

  const companyOrderSubmitBtn = companyOrderForm.querySelector("button[type='submit']");
  if (!companyOrderSubmitBtn) {
    return;
  }

  const drinkNames = DRINK_MENU_ITEMS.map((item) => item.name.trim()).filter(Boolean);

  const uniqueDrinkNames = Array.from(new Set(drinkNames));

  const clampQty = (rawValue) => {
    const parsed = Number.parseInt(String(rawValue || "0"), 10);
    if (!Number.isFinite(parsed)) return 0;
    return Math.max(0, Math.min(99, parsed));
  };

  const hasSelectedCompanyRoom = () => {
    const roomValue = (companyOrderRoomSelect.value || "").trim();
    const roomOption = companyOrderRoomSelect.options[companyOrderRoomSelect.selectedIndex] || null;
    return Boolean(roomValue) && !roomOption?.disabled;
  };

  const hasCompanyItems = () =>
    Array.from(companyOrderItems.querySelectorAll(".company-order-qty-input")).some(
      (input) => clampQty(input.value) > 0,
    );

  const updateCompanyOrderSubmitState = () => {
    const hasCompanyName = Boolean(companyOrderCompanyInput.value.trim());
    companyOrderSubmitBtn.disabled = !(hasSelectedCompanyRoom() && hasCompanyName && hasCompanyItems());
  };

  const syncRoomOptions = () => {
    companyOrderRoomSelect.innerHTML = "";
    let hasPlaceholder = false;

    if (drinkRoomSelect?.options.length) {
      Array.from(drinkRoomSelect.options).forEach((option) => {
        const copiedOption = document.createElement("option");
        copiedOption.value = option.value;
        copiedOption.textContent = option.textContent || option.value;
        copiedOption.disabled = Boolean(option.disabled);
        copiedOption.hidden = Boolean(option.hidden);
        if (copiedOption.value === "") {
          hasPlaceholder = true;
        }
        companyOrderRoomSelect.append(copiedOption);
      });

      if (!hasPlaceholder) {
        const placeholderOption = document.createElement("option");
        placeholderOption.value = "";
        placeholderOption.textContent = "Выберите переговорку";
        placeholderOption.disabled = true;
        placeholderOption.hidden = true;
        companyOrderRoomSelect.prepend(placeholderOption);
      }

      companyOrderRoomSelect.value = "";
      return;
    }

    const placeholderOption = document.createElement("option");
    placeholderOption.value = "";
    placeholderOption.textContent = "Выберите переговорку";
    placeholderOption.disabled = true;
    placeholderOption.hidden = true;
    companyOrderRoomSelect.append(placeholderOption);

    rooms.forEach((room) => {
      const option = document.createElement("option");
      option.value = room;
      option.textContent = room;
      companyOrderRoomSelect.append(option);
    });
    companyOrderRoomSelect.value = "";
  };

  const renderOrderRows = () => {
    companyOrderItems.innerHTML = "";
    uniqueDrinkNames.forEach((name, index) => {
      const row = document.createElement("div");
      row.className = "company-order-row";

      const title = document.createElement("span");
      title.className = "company-order-name";
      title.textContent = name;

      const qtyInput = document.createElement("input");
      qtyInput.className = "company-order-qty-input";
      qtyInput.type = "number";
      qtyInput.inputMode = "numeric";
      qtyInput.min = "0";
      qtyInput.max = "99";
      qtyInput.step = "1";
      qtyInput.value = "0";
      qtyInput.setAttribute("aria-label", `Количество: ${name}`);
      qtyInput.dataset.drinkName = name;
      qtyInput.addEventListener("focus", () => {
        if ((qtyInput.value || "").trim() === "0") {
          qtyInput.value = "";
          updateCompanyOrderSubmitState();
        }
      });
      qtyInput.addEventListener("input", () => {
        const raw = String(qtyInput.value || "");
        const digitsOnly = raw.replace(/\D+/g, "");
        if (!digitsOnly) {
          qtyInput.value = "";
          updateCompanyOrderSubmitState();
          return;
        }
        const normalized = Math.min(99, Number.parseInt(digitsOnly, 10) || 0);
        qtyInput.value = String(normalized);
        updateCompanyOrderSubmitState();
      });
      qtyInput.addEventListener("change", () => {
        qtyInput.value = String(clampQty(qtyInput.value));
        updateCompanyOrderSubmitState();
      });
      qtyInput.addEventListener("blur", () => {
        qtyInput.value = String(clampQty(qtyInput.value));
        updateCompanyOrderSubmitState();
      });

      row.append(title, qtyInput);
      companyOrderItems.append(row);

      if (index === 0) {
        qtyInput.setAttribute("data-first-company-order-input", "true");
      }
    });
  };

  const openCompanyOrderModal = () => {
    syncRoomOptions();
    renderOrderRows();
    initCompanyOrderRoomCustomSelect();
    companyOrderCompanyInput.value = "";
    updateCompanyOrderSubmitState();
    companyOrderModal.classList.add("open");
    companyOrderModal.setAttribute("aria-hidden", "false");
  };

  const closeCompanyOrderModal = () => {
    companyRoomCustomSelectController?.close?.();
    companyOrderModal.classList.remove("open");
    companyOrderModal.setAttribute("aria-hidden", "true");
  };

  companyOrderOpenBtn.addEventListener("click", openCompanyOrderModal);
  companyOrderCloseBtn.addEventListener("click", closeCompanyOrderModal);
  companyOrderRoomSelect.addEventListener("change", updateCompanyOrderSubmitState);
  companyOrderCompanyInput.addEventListener("input", updateCompanyOrderSubmitState);

  companyOrderModal.addEventListener("click", (event) => {
    if (event.target === companyOrderModal) {
      closeCompanyOrderModal();
    }
  });

  window.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && companyOrderModal.classList.contains("open")) {
      closeCompanyOrderModal();
    }
  });

  companyOrderForm.addEventListener("submit", (event) => {
    event.preventDefault();

    const currentRoom = (companyOrderRoomSelect.value || "").trim();
    if (!currentRoom) {
      showTimedPopup("Выберите переговорку", "Укажите переговорку для заказа на компанию.", 1800, 2200);
      return;
    }

    const companyName = companyOrderCompanyInput.value.trim();
    if (!companyName) {
      showTimedPopup(
        "Укажите компанию",
        "Заполните поле «Компания», чтобы оформить заказ.",
        2200,
        2600,
      );
      companyOrderCompanyInput.focus();
      return;
    }

    const orderInputs = Array.from(companyOrderItems.querySelectorAll(".company-order-qty-input"));
    const items = orderInputs
      .map((input) => ({
        drink: input.dataset.drinkName || "Напиток",
        quantity: clampQty(input.value),
      }))
      .filter((item) => item.quantity > 0);

    if (!items.length) {
      showTimedPopup(
        "Добавьте напитки",
        "Укажите количество хотя бы для одного напитка.",
        1800,
        2200,
      );
      return;
    }
    setRoom(currentRoom);

    const waitMin = 7 + Math.floor(Math.random() * 3);
    const waitMax = waitMin + 3;
    const portionsTotal = items.reduce((total, item) => total + item.quantity, 0);
    const itemsLines = items.map((item) => `- ${item.drink}, ${item.quantity}`).join("\n");

    showTimedPopup(
      "\u0417\u0430\u043a\u0430\u0437 \u043d\u0430 \u043a\u043e\u043c\u043f\u0430\u043d\u0438\u044e \u043f\u0440\u0438\u043d\u044f\u0442",
      `\u0417\u0430\u043a\u0430\u0437 \u0434\u043b\u044f ${companyName}\n` +
        `\u041f\u0435\u0440\u0435\u0433\u043e\u0432\u043e\u0440\u043a\u0430: ${currentRoom}\n` +
        `\u0412\u0430\u043c \u043f\u0440\u0438\u043d\u0435\u0441\u0443\u0442:\n${itemsLines}\n` +
        "\u0421\u043f\u0430\u0441\u0438\u0431\u043e \u0437\u0430 \u0437\u0430\u043a\u0430\u0437! \u041e\u0436\u0438\u0434\u0430\u0439\u0442\u0435.",
      7000,
      7000,
      { success: true },
    );

    storeLog("company_drink_order", {
      companyName,
      room: currentRoom,
      items,
      portionsTotal,
      waitMin,
      waitMax,
    });

    companyOrderCompanyInput.value = "";
    companyOrderRoomSelect.value = "";
    companyOrderRoomSelect.dispatchEvent(new Event("change", { bubbles: true }));
    updateCompanyOrderSubmitState();
    closeCompanyOrderModal();
  });
}

function initOrderPopup() {
  if (!orderPopup) return;
  orderPopup.addEventListener("click", (event) => {
    if (event.target === orderPopup) {
      closeOrderPopup();
    }
  });
}

function initSupportCustomSelects() {
  if (!supportForm) return;
  const supportSelects = Array.from(supportForm.querySelectorAll("select"));
  if (!supportSelects.length) return;

  supportCustomSelectControllers.forEach((controller) => controller.destroy?.());
  supportCustomSelectControllers = [];

  const closeAll = () => {
    supportCustomSelectControllers.forEach((controller) => controller.close());
  };

  const buildController = (select) => {
    const label = select.closest("label");
    if (!label) return null;

    const shell = document.createElement("div");
    shell.className = "support-custom-select";

    const trigger = document.createElement("button");
    trigger.type = "button";
    trigger.className = "support-custom-select-trigger";
    trigger.setAttribute("aria-haspopup", "listbox");
    trigger.setAttribute("aria-expanded", "false");

    const menu = document.createElement("div");
    menu.className = "support-custom-select-menu";
    menu.setAttribute("role", "listbox");

    const optionButtons = [];
    Array.from(select.options).forEach((option, optionIndex) => {
      if (option.hidden) return;
      const optionButton = document.createElement("button");
      optionButton.type = "button";
      optionButton.className = "support-custom-select-option";
      optionButton.dataset.value = option.value || "";
      optionButton.dataset.optionIndex = String(optionIndex);
      optionButton.textContent = option.textContent || "";
      optionButton.disabled = Boolean(option.disabled);
      if (option.disabled) {
        optionButton.classList.add("is-disabled");
      }
      menu.append(optionButton);
      optionButtons.push(optionButton);
    });

    const syncFromSelect = () => {
      const selectedIndex = Math.max(0, select.selectedIndex);
      const selectedOption = select.options[selectedIndex];
      const selectedText = selectedOption?.textContent || "";
      const hasValue = Boolean((select.value || "").trim());

      trigger.textContent = selectedText;
      shell.classList.toggle("is-placeholder", !hasValue);
      shell.classList.remove("is-invalid");

      optionButtons.forEach((btn) => {
        const optionIndex = Number.parseInt(btn.dataset.optionIndex || "-1", 10);
        btn.classList.toggle("is-current", optionIndex === selectedIndex);
      });
    };

    const close = () => {
      shell.classList.remove("open");
      trigger.setAttribute("aria-expanded", "false");
    };

    const open = () => {
      closeAll();
      shell.classList.add("open");
      trigger.setAttribute("aria-expanded", "true");
    };

    const toggle = () => {
      if (shell.classList.contains("open")) {
        close();
      } else {
        open();
      }
    };

    const handleTriggerClick = () => {
      toggle();
    };

    const handleMenuClick = (event) => {
      const targetButton = event.target.closest(".support-custom-select-option");
      if (!targetButton || targetButton.disabled) return;
      const nextValue = targetButton.dataset.value || "";
      select.value = nextValue;
      select.dispatchEvent(new Event("change", { bubbles: true }));
      syncFromSelect();
      close();
    };

    const handleSelectChange = () => {
      syncFromSelect();
    };

    const handleInvalid = () => {
      shell.classList.add("is-invalid");
    };

    select.classList.add("support-native-select");
    select.setAttribute("aria-hidden", "true");
    select.tabIndex = -1;

    shell.append(trigger, menu);
    label.append(shell);

    trigger.addEventListener("click", handleTriggerClick);
    menu.addEventListener("click", handleMenuClick);
    select.addEventListener("change", handleSelectChange);
    select.addEventListener("invalid", handleInvalid);

    syncFromSelect();

    return {
      shell,
      close,
      sync: syncFromSelect,
      destroy: () => {
        trigger.removeEventListener("click", handleTriggerClick);
        menu.removeEventListener("click", handleMenuClick);
        select.removeEventListener("change", handleSelectChange);
        select.removeEventListener("invalid", handleInvalid);
        shell.remove();
        select.classList.remove("support-native-select");
        select.removeAttribute("aria-hidden");
        select.tabIndex = 0;
      },
    };
  };

  supportCustomSelectControllers = supportSelects
    .map((select) => buildController(select))
    .filter(Boolean);

  if (!supportCustomSelectControllers.length) return;

  const handleOutsideClick = (event) => {
    const insideAnyCustomSelect = supportCustomSelectControllers.some((controller) =>
      controller.shell.contains(event.target),
    );
    if (!insideAnyCustomSelect) {
      closeAll();
    }
  };

  const handleEscape = (event) => {
    if (event.key === "Escape") {
      closeAll();
    }
  };

  document.addEventListener("pointerdown", handleOutsideClick);
  window.addEventListener("keydown", handleEscape);
  supportForm.addEventListener("reset", () => {
    window.setTimeout(() => {
      supportCustomSelectControllers.forEach((controller) => controller.sync());
      closeAll();
    }, 0);
  });
}

function initSupportForm() {
  if (!supportForm || !roomSelect || !issueSelect || !supportResult) return;
  const supportSubmitBtn = supportForm.querySelector("button[type='submit']");
  if (!supportSubmitBtn) return;

  const getSupportValidity = () => {
    const room = (roomSelect.value || "").trim();
    const issue = (issueSelect.value || "").trim();
    const roomOption = roomSelect.options[roomSelect.selectedIndex] || null;
    const issueOption = issueSelect.options[issueSelect.selectedIndex] || null;
    const roomValid = Boolean(room) && !roomOption?.disabled;
    const issueValid = Boolean(issue) && !issueOption?.disabled;
    return { room, issue, roomValid, issueValid };
  };

  const updateSupportSubmitState = () => {
    const { roomValid, issueValid } = getSupportValidity();
    supportSubmitBtn.disabled = !(roomValid && issueValid);
  };

  roomSelect.addEventListener("change", () => {
    supportResult.textContent = "";
    const nextRoom = (roomSelect.value || "").trim();
    if (nextRoom) {
      setRoom(nextRoom);
    }
    updateSupportSubmitState();
  });

  issueSelect.addEventListener("change", () => {
    supportResult.textContent = "";
    updateSupportSubmitState();
  });

  supportForm.addEventListener("reset", () => {
    window.setTimeout(updateSupportSubmitState, 0);
  });

  supportForm.addEventListener("submit", (event) => {
    event.preventDefault();
    supportResult.textContent = "";
    const { room, issue, roomValid, issueValid } = getSupportValidity();

    if (!roomValid) {
      showTimedPopup("Выберите переговорку", "Укажите переговорку для вызова тех. специалиста.", 1800, 2200);
      return;
    }

    if (!issueValid) {
      showTimedPopup("Укажите проблему", "Выберите описание проблемы для заявки.", 1800, 2200);
      return;
    }

    const ticket = `TS-${Math.floor(10000 + Math.random() * 90000)}`;

    setRoom(room);
    supportResult.textContent = `Заявка ${ticket} отправлена: ${issue}`;
    showSupportPopup();

    storeLog("support_call", {
      ticket,
      room,
      issue,
      comment: "",
    });

    supportForm.reset();
    queueFitToViewport();
  });

  updateSupportSubmitState();
}

function initQuiz() {
  if (!quizOptions.length || !quizQuestion) return;

  const shuffleQuestions = (items) => {
    const arr = [...items];
    for (let i = arr.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  };

  const updateQuizBadge = () => {
    if (!quizScoreBadge) return;
    const total = quizState.questions.length || LEGAL_QUIZ_QUESTIONS.length;
    const current = Math.min(quizState.currentIndex + 1, total);
    quizScoreBadge.textContent = `${current}/${total}`;
  };

  const renderQuestion = () => {
    const current = quizState.questions[quizState.currentIndex];
    if (!current) return;

    quizQuestion.textContent = current.question;
    quizOptions.forEach((btn, idx) => {
      btn.textContent = current.options[idx];
      btn.disabled = false;
      btn.classList.remove("correct", "wrong");
    });

    updateQuizBadge();
    if (quizResult) {
      quizResult.textContent = "";
      quizResult.classList.remove("is-wrong-feedback");
    }
    if (quizMark) {
      quizMark.textContent = "";
      quizMark.classList.remove("show");
    }
    quizState.locked = false;
  };

  const restartQuiz = () => {
    clearTimeout(quizState.completionTimeoutId);
    quizState.questions = shuffleQuestions(LEGAL_QUIZ_QUESTIONS);
    quizState.currentIndex = 0;
    quizState.correctCount = 0;
    renderQuestion();
  };

  const handleAnswer = (selectedIndex) => {
    if (quizState.locked) return;

    quizState.locked = true;
    const current = quizState.questions[quizState.currentIndex];
    const isCorrect = selectedIndex === current.correctIndex;
    const answerReadDelay = isCorrect ? 950 : 4000;

    quizOptions.forEach((btn, idx) => {
      btn.disabled = true;
      if (idx === current.correctIndex) {
        btn.classList.add("correct");
      } else if (idx === selectedIndex && !isCorrect) {
        btn.classList.add("wrong");
      }
    });

    if (isCorrect) {
      quizState.correctCount += 1;
      if (quizMark) {
        quizMark.textContent = "✓";
        quizMark.classList.add("show");
      }
      if (quizResult) {
        quizResult.textContent = "Верно!";
        quizResult.classList.remove("is-wrong-feedback");
      }
    } else {
      if (quizMark) {
        quizMark.textContent = "";
        quizMark.classList.remove("show");
      }
      if (quizResult) {
        quizResult.textContent = `Неверно. Правильный ответ: ${current.options[current.correctIndex]}`;
        quizResult.classList.add("is-wrong-feedback");
      }
    }

    updateQuizBadge();

    storeLog("legal_quiz_answer", {
      question: current.question,
      selected: current.options[selectedIndex],
      correctAnswer: current.options[current.correctIndex],
      correct: isCorrect,
      index: quizState.currentIndex + 1,
    });

    const isLastQuestion = quizState.currentIndex >= quizState.questions.length - 1;
    if (!isLastQuestion) {
      window.setTimeout(() => {
        quizState.currentIndex += 1;
        renderQuestion();
      }, answerReadDelay);
      return;
    }

    window.setTimeout(() => {
      updateQuizBadge();
      const percent = Math.round((quizState.correctCount / quizState.questions.length) * 100);
      if (quizResult) {
        quizResult.textContent = `Итог: ${quizState.correctCount} из ${quizState.questions.length}`;
        quizResult.classList.remove("is-wrong-feedback");
      }
      showQuizFinalOverlay(percent);
      quizState.completionTimeoutId = window.setTimeout(() => {
        closeQuizFinalOverlay();
        restartQuiz();
      }, 3200);
    }, answerReadDelay);
  };

  quizOptions.forEach((option, idx) => {
    option.addEventListener("click", () => {
      handleAnswer(idx);
    });
  });

  quizFinalOverlay?.addEventListener("click", closeQuizFinalOverlay);

  restartQuiz();
}

function initBrochures() {
  if (!brochureLinks.length) return;

  const brochureThumbs = Array.from(document.querySelectorAll(".brochure-thumb"));
  if (brochureThumbs.length) {
    brochureThumbs.forEach((img, idx) => {
      img.decoding = "async";
      img.fetchPriority = idx < 4 ? "high" : "low";
      if (idx < 4) {
        img.loading = "eager";
      }
    });

    const warmupBrochureThumbs = () => {
      brochureThumbs.forEach((img) => {
        if (img.complete) return;
        const src = img.currentSrc || img.src;
        if (!src) return;
        const preloader = new Image();
        preloader.decoding = "async";
        preloader.src = src;
      });
    };

    const feedbackMenuBtn = menuButtons.find((btn) => btn.dataset.target === "feedback");
    feedbackMenuBtn?.addEventListener("click", warmupBrochureThumbs, { once: true });

    if ("requestIdleCallback" in window) {
      window.requestIdleCallback(warmupBrochureThumbs, { timeout: 1400 });
    } else {
      window.setTimeout(warmupBrochureThumbs, 600);
    }
  }

  brochureLinks.forEach((link) => {
    link.addEventListener("click", () => {
      const title = link.dataset.brochureTitle || "Брошюра";
      showToast("Открываем брошюру");
      storeLog("brochure_open", {
        title,
        url: link.href,
      });
    });
  });
}

function pickRandomNews() {
  const randomIndex = Math.floor(Math.random() * newsPrototypePool.length);
  return newsPrototypePool[randomIndex];
}

function openNewsOverlay() {
  if (!newsOverlay) return;
  const data = pickRandomNews();
  const imageClass = newsImageClasses[Math.floor(Math.random() * newsImageClasses.length)];

  newsImageClasses.forEach((name) => {
    newsOverlayImage?.classList.remove(name);
  });
  newsOverlayImage?.classList.add(imageClass);
  newsOverlayImage?.setAttribute("aria-label", `Иллюстрация: ${data.title}`);

  if (newsOverlayTag) newsOverlayTag.textContent = data.tag;
  if (newsOverlayTitle) newsOverlayTitle.textContent = data.title;
  if (newsOverlayLead) newsOverlayLead.textContent = data.lead;
  if (newsOverlayBody) newsOverlayBody.textContent = data.body;

  newsOverlay.classList.add("open");
  newsOverlay.setAttribute("aria-hidden", "false");
}

function closeNewsOverlay() {
  if (!newsOverlay) return;
  newsOverlay.classList.remove("open");
  newsOverlay.setAttribute("aria-hidden", "true");
}

function initNewsPrototype() {
  if (!newsCards.length || !newsOverlay) return;

  newsCards.forEach((card) => {
    card.addEventListener("click", openNewsOverlay);
    card.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        openNewsOverlay();
      }
    });
  });

  newsBackBtn?.addEventListener("click", closeNewsOverlay);

  newsOverlay.addEventListener("click", (event) => {
    if (event.target === newsOverlay) {
      closeNewsOverlay();
    }
  });

  window.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && newsOverlay.classList.contains("open")) {
      closeNewsOverlay();
    }
  });
}

function initDinoGame() {
  if (!dinoCanvas) return;

  const ctx =
    dinoCanvas.getContext("2d", { alpha: false, desynchronized: true }) ||
    dinoCanvas.getContext("2d");
  if (!ctx) return;
  ctx.imageSmoothingEnabled = true;
  const professorSprite = new Image();
  let professorSpriteReady = false;
  let professorBodySprite = null;
  let professorHatSprite = null;
  const speedMultiplier = 2.55;
  const victoryScore = 5000;
  const victoryText =
    "\u041f\u043e\u0437\u0434\u0440\u0430\u0432\u043b\u044f\u0435\u043c, \u0432\u044b \u0443\u0431\u0435\u0436\u0430\u043b\u0438 \u043e\u0442 \u043e\u0442\u0432\u0435\u0442\u0441\u0442\u0432\u0435\u043d\u043d\u043e\u0441\u0442\u0438!";
  const scoreMilestones = [
    { score: 100, text: "\u041e\u0442 \u043a\u043e\u0433\u043e \u0432\u044b \u0431\u0435\u0436\u0438\u0442\u0435?" },
    { score: 200, text: "\u041e\u0433\u043e, \u0440\u0430\u0437\u043e\u0433\u043d\u0430\u043b\u0441\u044f!" },
    { score: 300, text: "\u0428\u0438\u043d\u044b \u0431\u0443\u0434\u0435\u043c \u043c\u0435\u043d\u044f\u0442\u044c?" },
    { score: 500, text: "\u0425\u0435-\u0445\u0435, \u0441\u043a\u043e\u0440\u043e \u043f\u0435\u043d\u0441\u0438\u044f!" },
    { score: 1000, text: "\u0410 \u0432\u044b \u043f\u0440\u0430\u0432\u0434\u0430 \u0447\u0442\u043e-\u0442\u043e \u043c\u043e\u0436\u0435\u0442\u0435" },
    { score: 2000, text: "\u041c\u043e\u0436\u0435\u0442, \u0445\u0432\u0430\u0442\u0438\u0442?" },
  ];
  const game = {
    running: false,
    status: "idle",
    score: 0,
    best: readLocalStorageNumber("dino_best", 0),
    speed: 2.1 * speedMultiplier,
    gravity: 0.42,
    jumpPower: -13.05,
    groundY: dinoCanvas.height - 20,
    spawnTimer: 0,
    spawnInterval: 145,
    obstacles: [],
    rafId: 0,
    dino: {
      x: 34,
      y: 0,
      w: 42,
      h: 58,
      vy: 0,
    },
  };
  const BASE_DINO_X = 34;
  const BASE_DINO_W = 43;
  const BASE_DINO_H = 58;
  const BASE_GAME_WIDTH = 360;
  const MIN_SPRITE_SCALE = 0.88;
  const MAX_SPRITE_SCALE = 1;
  const BASE_GROUND_OFFSET = 20;
  const BASE_GRAVITY = 0.42;
  const BASE_JUMP_POWER = -13.05;
  const HAT_BOUNCE_DURATION_MS = 1000;
  const HAT_BOUNCE_PX = 5;
  const HAT_SRC_X_RATIO = 0.07;
  const HAT_SRC_W_RATIO = 0.76;
  const HAT_SRC_H_RATIO = 0.18;
  const baseSpeed = 2.1 * speedMultiplier;
  const maxSpeedGain = 1.1 * speedMultiplier;
  const fixedStepMs = 1000 / 60;
  const maxDeltaMs = 250;
  const maxSimulationMsPerFrame = 180;
  const maxTextWrapCacheSize = 80;
  let lastFrameAt = 0;
  let accumulatorMs = 0;
  let milestoneIndex = 0;
  let bannerTimeoutId = 0;
  let activeBannerText = "";
  let spriteScale = 1;
  let professorAspect = BASE_DINO_W / BASE_DINO_H;
  let runCycle = 0;
  let hatBounceEndAt = 0;
  let bgGradient = null;
  let carpetGradient = null;
  let carpetGradientKey = "";
  const textWrapCache = new Map();
  const scalesSprite = createScalesSprite();

  function createScalesSprite() {
    const sprite = document.createElement("canvas");
    sprite.width = 172;
    sprite.height = 132;
    const sctx = sprite.getContext("2d");
    if (!sctx) return null;

    sctx.imageSmoothingEnabled = true;
    sctx.imageSmoothingQuality = "high";
    sctx.lineJoin = "round";
    sctx.lineCap = "round";
    const outline = "#1f1d25";
    const orange = "#ff9966";
    const bowl = "#f3b44f";
    const baseMain = "#9d93a3";
    const baseDark = "#7e7485";

    function roundRectPath(x, y, w, h, r) {
      const radius = Math.max(0, Math.min(r, w / 2, h / 2));
      sctx.beginPath();
      sctx.moveTo(x + radius, y);
      sctx.lineTo(x + w - radius, y);
      sctx.quadraticCurveTo(x + w, y, x + w, y + radius);
      sctx.lineTo(x + w, y + h - radius);
      sctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
      sctx.lineTo(x + radius, y + h);
      sctx.quadraticCurveTo(x, y + h, x, y + h - radius);
      sctx.lineTo(x, y + radius);
      sctx.quadraticCurveTo(x, y, x + radius, y);
      sctx.closePath();
    }

    sctx.fillStyle = "rgba(31,29,37,0.18)";
    sctx.beginPath();
    sctx.ellipse(86, 124, 56, 5.5, 0, 0, Math.PI * 2);
    sctx.fill();

    sctx.fillStyle = baseMain;
    sctx.strokeStyle = outline;
    sctx.lineWidth = 6;
    roundRectPath(45, 108, 82, 18, 5);
    sctx.fill();
    sctx.stroke();

    sctx.fillStyle = baseDark;
    roundRectPath(49, 112, 74, 10, 3);
    sctx.fill();

    sctx.fillStyle = baseMain;
    sctx.beginPath();
    sctx.arc(86, 104, 24, Math.PI, 0, false);
    sctx.closePath();
    sctx.fill();
    sctx.stroke();

    sctx.fillStyle = orange;
    sctx.strokeStyle = outline;
    sctx.lineWidth = 6;
    roundRectPath(79, 33, 14, 72, 4);
    sctx.fill();
    sctx.stroke();

    sctx.save();
    sctx.translate(86, 34);
    sctx.rotate(-0.25);
    sctx.fillStyle = orange;
    sctx.strokeStyle = outline;
    sctx.lineWidth = 6;
    roundRectPath(-64, -5, 128, 10, 5);
    sctx.fill();
    sctx.stroke();
    sctx.restore();

    sctx.fillStyle = orange;
    sctx.beginPath();
    sctx.arc(86, 34, 8, 0, Math.PI * 2);
    sctx.fill();
    sctx.stroke();

    const leftAnchor = { x: 26, y: 50 };
    const rightAnchor = { x: 145, y: 18 };
    const leftBowlY = 82;
    const rightBowlY = 73;
    const bowlRadius = 20;

    sctx.strokeStyle = outline;
    sctx.lineWidth = 3;
    sctx.beginPath();
    sctx.moveTo(leftAnchor.x, leftAnchor.y);
    sctx.lineTo(13, leftBowlY);
    sctx.moveTo(leftAnchor.x, leftAnchor.y);
    sctx.lineTo(39, leftBowlY);
    sctx.moveTo(rightAnchor.x, rightAnchor.y);
    sctx.lineTo(132, rightBowlY);
    sctx.moveTo(rightAnchor.x, rightAnchor.y);
    sctx.lineTo(158, rightBowlY);
    sctx.stroke();

    function drawBowl(cx, cy) {
      sctx.fillStyle = bowl;
      sctx.strokeStyle = outline;
      sctx.lineWidth = 5;
      sctx.beginPath();
      sctx.moveTo(cx - bowlRadius, cy);
      sctx.lineTo(cx + bowlRadius, cy);
      sctx.arc(cx, cy, bowlRadius, 0, Math.PI, false);
      sctx.closePath();
      sctx.fill();
      sctx.stroke();
    }

    drawBowl(26, leftBowlY);
    drawBowl(145, rightBowlY);

    return sprite;
  }

  function setBanner(text, autoClearMs = 0) {
    if (bannerTimeoutId) {
      clearTimeout(bannerTimeoutId);
      bannerTimeoutId = 0;
    }
    activeBannerText = text;
    if (text && autoClearMs > 0) {
      bannerTimeoutId = window.setTimeout(() => {
        bannerTimeoutId = 0;
        if (activeBannerText === text) {
          activeBannerText = "";
          if (!game.running) {
            render();
          }
        }
      }, autoClearMs);
    }
  }

  function getBgGradient() {
    if (bgGradient) return bgGradient;
    bgGradient = ctx.createLinearGradient(0, 0, 0, dinoCanvas.height);
    bgGradient.addColorStop(0, "#fbfcff");
    bgGradient.addColorStop(1, "#edf0ff");
    return bgGradient;
  }

  function getCarpetGradient(carpetTop, carpetBottom) {
    const key = `${carpetTop}|${carpetBottom}|${dinoCanvas.height}`;
    if (carpetGradient && carpetGradientKey === key) {
      return carpetGradient;
    }
    const gradient = ctx.createLinearGradient(0, carpetTop, 0, carpetBottom);
    gradient.addColorStop(0, "#8b0c2a");
    gradient.addColorStop(0.55, "#6d0820");
    gradient.addColorStop(1, "#4f0517");
    carpetGradient = gradient;
    carpetGradientKey = key;
    return gradient;
  }

  function buildProfessorLayers() {
    const srcW = professorSprite.naturalWidth || 0;
    const srcH = professorSprite.naturalHeight || 0;
    if (!srcW || !srcH) {
      professorBodySprite = null;
      professorHatSprite = null;
      return;
    }

    const srcHatX = Math.max(0, Math.floor(srcW * HAT_SRC_X_RATIO));
    const srcHatY = 0;
    const srcHatW = Math.max(1, Math.min(srcW - srcHatX, Math.floor(srcW * HAT_SRC_W_RATIO)));
    const srcHatH = Math.max(1, Math.floor(srcH * HAT_SRC_H_RATIO));

    const bodyCanvas = document.createElement("canvas");
    bodyCanvas.width = srcW;
    bodyCanvas.height = srcH;
    const bodyCtx = bodyCanvas.getContext("2d");
    if (bodyCtx) {
      bodyCtx.imageSmoothingEnabled = true;
      bodyCtx.imageSmoothingQuality = "high";
      bodyCtx.drawImage(professorSprite, 0, 0, srcW, srcH);
      bodyCtx.clearRect(srcHatX, srcHatY, srcHatW, srcHatH);
    }

    const hatCanvas = document.createElement("canvas");
    hatCanvas.width = srcW;
    hatCanvas.height = srcH;
    const hatCtx = hatCanvas.getContext("2d");
    if (hatCtx) {
      hatCtx.imageSmoothingEnabled = true;
      hatCtx.imageSmoothingQuality = "high";
      hatCtx.drawImage(
        professorSprite,
        srcHatX,
        srcHatY,
        srcHatW,
        srcHatH,
        srcHatX,
        srcHatY,
        srcHatW,
        srcHatH,
      );
    }

    professorBodySprite = bodyCanvas;
    professorHatSprite = hatCanvas;
  }

  function recalculateGameMetrics() {
    const wasOnGround = onGround();
    const widthScale = dinoCanvas.width / BASE_GAME_WIDTH;
    spriteScale = Math.max(MIN_SPRITE_SCALE, Math.min(MAX_SPRITE_SCALE, widthScale));

    game.dino.x = BASE_DINO_X * spriteScale;
    game.dino.h = BASE_DINO_H * spriteScale;
    game.dino.w = game.dino.h * professorAspect;
    game.gravity = BASE_GRAVITY * spriteScale;
    game.jumpPower = BASE_JUMP_POWER * spriteScale;
    game.groundY = dinoCanvas.height - BASE_GROUND_OFFSET * spriteScale;

    const groundTop = game.groundY - game.dino.h;
    if (!game.running || wasOnGround || game.dino.y > groundTop) {
      game.dino.y = groundTop;
      if (!game.running || wasOnGround) {
        game.dino.vy = 0;
      }
    }
  }

  function syncCanvasSize(force = false) {
    const nextWidth = Math.max(1, Math.round(dinoCanvas.clientWidth || 340));
    const nextHeight = Math.max(1, Math.round(dinoCanvas.clientHeight || 190));
    const hasChanged = dinoCanvas.width !== nextWidth || dinoCanvas.height !== nextHeight;
    if (!force && !hasChanged) return false;

    dinoCanvas.width = nextWidth;
    dinoCanvas.height = nextHeight;
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    bgGradient = null;
    carpetGradient = null;
    carpetGradientKey = "";
    textWrapCache.clear();
    recalculateGameMetrics();
    return true;
  }

  function updateStats() {
    if (scoreValue) {
      scoreValue.textContent = String(Math.floor(game.score));
    }
    if (bestValue) {
      bestValue.textContent = String(game.best);
    }
  }

  professorSprite.addEventListener("load", () => {
    professorSpriteReady = true;
    if (professorSprite.naturalWidth && professorSprite.naturalHeight) {
      professorAspect = professorSprite.naturalWidth / professorSprite.naturalHeight;
      buildProfessorLayers();
      recalculateGameMetrics();
    }
    render();
  });
  professorSprite.src = "./assets/professor.png";
  syncCanvasSize(true);

  function onGround() {
    return game.dino.y >= game.groundY - game.dino.h - 0.5;
  }

  function reset() {
    game.running = true;
    game.status = "running";
    game.score = 0;
    game.speed = baseSpeed * spriteScale;
    game.spawnTimer = 0;
    game.spawnInterval = 132;
    game.obstacles = [];
    game.dino.y = game.groundY - game.dino.h;
    game.dino.vy = 0;
    runCycle = 0;
    hatBounceEndAt = 0;
    lastFrameAt = 0;
    accumulatorMs = 0;
    milestoneIndex = 0;
    setBanner("");
    if (gameMeta) {
      gameMeta.textContent = "Игра запущена. Нажимайте на экран для прыжка.";
    }
    updateStats();
  }

  function spawnObstacle() {
    const baseScale = 0.8 + Math.random() * 0.2;
    const variantRoll = Math.random();
    let sizeBoost = 1;
    let veryLargeVariant = false;
    if (variantRoll < 0.1) {
      veryLargeVariant = true;
      sizeBoost = 1.38 + Math.random() * 0.2;
    } else if (variantRoll < 0.34) {
      sizeBoost = 1.18 + Math.random() * 0.16;
    }
    const scale = baseScale * sizeBoost;
    const width = (48 + Math.random() * 10) * scale * spriteScale;
    const height = (40 + Math.random() * 7) * scale * spriteScale;
    const hitboxOffsetX = veryLargeVariant ? width * 0.22 : width * 0.2;
    const hitboxOffsetY = veryLargeVariant ? height * 0.66 : height * 0.62;
    const hitboxW = veryLargeVariant ? width * 0.56 : width * 0.6;
    const hitboxH = veryLargeVariant ? height * 0.2 : height * 0.24;
    game.obstacles.push({
      x: dinoCanvas.width + 4,
      y: game.groundY - height,
      w: width,
      h: height,
      hitboxOffsetX,
      hitboxOffsetY,
      hitboxW,
      hitboxH,
    });
    game.spawnInterval = 118 + Math.floor(Math.random() * 86);
    game.spawnTimer = 0;
  }

  function endGame(reason = "crash") {
    game.running = false;
    game.status = reason === "victory" ? "victory" : "gameover";
    cancelAnimationFrame(game.rafId);
    lastFrameAt = 0;
    accumulatorMs = 0;
    const scoreRounded = Math.floor(game.score);
    if (scoreRounded > game.best) {
      game.best = scoreRounded;
      writeLocalStorage("dino_best", String(game.best));
    }
    if (reason === "victory") {
      if (gameMeta) {
        gameMeta.textContent = `${victoryText} Счет: ${scoreRounded}.`;
      }
    } else if (gameMeta) {
      gameMeta.textContent = `Вы споткнулись об закон. Это повод разобраться в нем лучше! Счет: ${scoreRounded}. Рекорд: ${game.best}.`;
    }
    updateStats();
    render();
  }

  function applyMilestoneMessages() {
    if (milestoneIndex >= scoreMilestones.length) return;
    const roundedScore = Math.floor(game.score);
    while (milestoneIndex < scoreMilestones.length && roundedScore >= scoreMilestones[milestoneIndex].score) {
      setBanner(scoreMilestones[milestoneIndex].text, 5000);
      milestoneIndex += 1;
    }
  }

  function update() {
    game.dino.vy += game.gravity;
    game.dino.y += game.dino.vy;
    if (game.dino.y > game.groundY - game.dino.h) {
      game.dino.y = game.groundY - game.dino.h;
      game.dino.vy = 0;
    }

    game.spawnTimer += 1;
    if (game.spawnTimer >= game.spawnInterval) {
      spawnObstacle();
    }

    const bodyInsetX = Math.round(11 * spriteScale);
    const bodyInsetY = Math.round(8 * spriteScale);
    const bodyX = game.dino.x + bodyInsetX;
    const bodyY = game.dino.y + bodyInsetY;
    const bodyW = Math.max(8, game.dino.w - Math.round(20 * spriteScale));
    const bodyH = Math.max(10, game.dino.h - Math.round(12 * spriteScale));
    const bodyRight = bodyX + bodyW;
    const bodyBottom = bodyY + bodyH;

    let writeIndex = 0;
    for (let idx = 0; idx < game.obstacles.length; idx += 1) {
      const obstacle = game.obstacles[idx];
      obstacle.x -= game.speed;
      const hitboxX = obstacle.x + obstacle.hitboxOffsetX;
      const hitboxY = obstacle.y + obstacle.hitboxOffsetY;
      const hitboxRight = hitboxX + obstacle.hitboxW;
      const hitboxBottom = hitboxY + obstacle.hitboxH;
      if (
        bodyX < hitboxRight &&
        bodyRight > hitboxX &&
        bodyY < hitboxBottom &&
        bodyBottom > hitboxY
      ) {
        endGame();
        return;
      }
      if (obstacle.x + obstacle.w > -10) {
        game.obstacles[writeIndex] = obstacle;
        writeIndex += 1;
      }
    }
    game.obstacles.length = writeIndex;

    game.score += 0.05;
    const scaledBaseSpeed = baseSpeed * spriteScale;
    const scaledMaxSpeedGain = maxSpeedGain * spriteScale;
    game.speed = scaledBaseSpeed + Math.min(scaledMaxSpeedGain, game.score / 420);
    if (onGround()) {
      runCycle += Math.max(0.05, game.speed * 0.075);
    } else {
      runCycle += 0.02;
    }
    applyMilestoneMessages();
    if (game.score >= victoryScore) {
      endGame("victory");
    }
  }

  function wrapCanvasText(text, maxWidth) {
    const words = text.split(" ");
    const lines = [];
    let line = "";
    for (const word of words) {
      const testLine = line ? `${line} ${word}` : word;
      if (ctx.measureText(testLine).width > maxWidth && line) {
        lines.push(line);
        line = word;
      } else {
        line = testLine;
      }
    }
    if (line) {
      lines.push(line);
    }
    return lines.length ? lines : [text];
  }

  function getWrappedCanvasText(text, maxWidth) {
    const normalizedText = String(text || "");
    const widthKey = Math.max(1, Math.round(maxWidth));
    const cacheKey = `${ctx.font}|${widthKey}|${normalizedText}`;
    const cached = textWrapCache.get(cacheKey);
    if (cached) {
      return cached;
    }
    const wrapped = wrapCanvasText(normalizedText, widthKey);
    if (textWrapCache.size >= maxTextWrapCacheSize) {
      textWrapCache.clear();
    }
    textWrapCache.set(cacheKey, wrapped);
    return wrapped;
  }

  function traceRoundedRect(pathCtx, x, y, w, h, radius) {
    const r = Math.max(0, Math.min(radius, w / 2, h / 2));
    pathCtx.beginPath();
    pathCtx.moveTo(x + r, y);
    pathCtx.lineTo(x + w - r, y);
    pathCtx.quadraticCurveTo(x + w, y, x + w, y + r);
    pathCtx.lineTo(x + w, y + h - r);
    pathCtx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    pathCtx.lineTo(x + r, y + h);
    pathCtx.quadraticCurveTo(x, y + h, x, y + h - r);
    pathCtx.lineTo(x, y + r);
    pathCtx.quadraticCurveTo(x, y, x + r, y);
    pathCtx.closePath();
  }

  function render() {
    ctx.clearRect(0, 0, dinoCanvas.width, dinoCanvas.height);
    ctx.fillStyle = getBgGradient();
    ctx.fillRect(0, 0, dinoCanvas.width, dinoCanvas.height);

    const carpetTop = Math.max(0, Math.floor(game.groundY));
    const carpetHeight = Math.max(12, Math.round(20 * spriteScale));
    const carpetBottom = Math.min(dinoCanvas.height, carpetTop + carpetHeight);
    ctx.fillStyle = getCarpetGradient(carpetTop, carpetBottom);
    ctx.fillRect(0, carpetTop, dinoCanvas.width, carpetBottom - carpetTop);

    ctx.fillStyle = "rgba(255, 225, 142, 0.96)";
    ctx.fillRect(0, carpetTop, dinoCanvas.width, 2);
    if (carpetBottom - carpetTop > 6) {
      ctx.fillRect(0, carpetBottom - 2, dinoCanvas.width, 2);
    }

    if (professorSpriteReady) {
      const runningOnGround = game.running && onGround();
      const drawX = game.dino.x;
      const drawY = game.dino.y - 2;
      const srcW = professorSprite.naturalWidth || 220;
      const srcH = professorSprite.naturalHeight || 297;
      let hasActiveHatBounce = false;
      if (game.running && hatBounceEndAt > 0) {
        const now = performance.now();
        if (now >= hatBounceEndAt) {
          hatBounceEndAt = 0;
        } else {
          hasActiveHatBounce = true;
        }
      }

      if (hasActiveHatBounce && professorBodySprite && professorHatSprite) {
        const hatLift = -Math.max(3, HAT_BOUNCE_PX * spriteScale);
        ctx.drawImage(professorBodySprite, drawX, drawY, game.dino.w, game.dino.h);
        ctx.drawImage(professorHatSprite, drawX, drawY + hatLift, game.dino.w, game.dino.h);
      } else {
        ctx.drawImage(professorSprite, drawX, drawY, game.dino.w, game.dino.h);
      }

      if (runningOnGround) {
        const legStartRatio = 0.8;
        const srcLegY = Math.floor(srcH * legStartRatio);
        const srcLegH = Math.max(1, srcH - srcLegY);
        const destLegY = drawY + game.dino.h * legStartRatio;
        const destLegH = Math.max(1, game.dino.h - game.dino.h * legStartRatio);
        const halfSrcW = Math.floor(srcW / 2);
        const halfDestW = game.dino.w / 2;
        const legShift = Math.sin(runCycle) * Math.max(0.6, game.dino.w * 0.035);

        ctx.save();
        ctx.beginPath();
        ctx.rect(drawX, destLegY, halfDestW, destLegH);
        ctx.clip();
        ctx.drawImage(
          professorSprite,
          0,
          srcLegY,
          halfSrcW,
          srcLegH,
          drawX + legShift,
          destLegY,
          halfDestW,
          destLegH,
        );
        ctx.restore();

        ctx.save();
        ctx.beginPath();
        ctx.rect(drawX + halfDestW, destLegY, game.dino.w - halfDestW, destLegH);
        ctx.clip();
        ctx.drawImage(
          professorSprite,
          halfSrcW,
          srcLegY,
          srcW - halfSrcW,
          srcLegH,
          drawX + halfDestW - legShift,
          destLegY,
          game.dino.w - halfDestW,
          destLegH,
        );
        ctx.restore();
      }
    } else {
      ctx.fillStyle = "#272c3e";
      ctx.fillRect(game.dino.x, game.dino.y - 2, game.dino.w, game.dino.h);
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(game.dino.x + 20, game.dino.y + 8, 5, 5);
    }

    game.obstacles.forEach((obstacle) => {
      if (scalesSprite) {
        ctx.save();
        traceRoundedRect(ctx, obstacle.x, obstacle.y, obstacle.w, obstacle.h, Math.min(6, obstacle.w * 0.18));
        ctx.clip();
        ctx.drawImage(scalesSprite, obstacle.x, obstacle.y, obstacle.w, obstacle.h);
        ctx.restore();
      } else {
        ctx.fillStyle = "#272c3e";
        ctx.fillRect(obstacle.x, obstacle.y, obstacle.w, obstacle.h);
      }
    });

    if (game.running && activeBannerText) {
      ctx.save();
      ctx.font = '700 19px "Montserrat"';
      const maxWidth = dinoCanvas.width - 28;
      const lines = getWrappedCanvasText(activeBannerText, maxWidth);
      const lineHeight = 20;
      const verticalPad = 6;
      const boxHeight = lines.length * lineHeight + verticalPad * 2;
      const bannerBaseY = Math.round(dinoCanvas.height / 2 - dinoCanvas.height * 0.25);
      const boxY = Math.max(8, Math.round(bannerBaseY - boxHeight / 2));

      ctx.fillStyle = "#951b81";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      const startY = boxY + verticalPad + lineHeight / 2;
      lines.forEach((textLine, index) => {
        ctx.fillText(textLine, dinoCanvas.width / 2, startY + index * lineHeight);
      });
      ctx.restore();
    }

    if (!game.running) {
      ctx.fillStyle = "rgba(255,255,255,0.68)";
      ctx.fillRect(0, 0, dinoCanvas.width, dinoCanvas.height);
      ctx.fillStyle = "#272c3e";
      const centerX = Math.round(dinoCanvas.width / 2);
      const centerY = Math.round(dinoCanvas.height / 2);
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";

      if (game.status === "victory") {
        ctx.font = '700 15px "Montserrat"';
        const maxWidth = dinoCanvas.width - 26;
        const lines = getWrappedCanvasText(victoryText, maxWidth);
        const lineHeight = 18;
        const startY = Math.round(centerY - ((lines.length - 1) * lineHeight) / 2 - 8);
        lines.forEach((textLine, index) => {
          ctx.fillText(textLine, centerX, startY + index * lineHeight);
        });
      } else if (game.status === "gameover") {
        const gameOverBaseY = Math.round(centerY - dinoCanvas.height * 0.25);
        ctx.font = '700 20px "Montserrat"';
        ctx.fillText("Вы споткнулись об закон", centerX, gameOverBaseY);
        ctx.font = '700 14px "Montserrat"';
        ctx.fillText("Это повод разобраться в нем лучше!", centerX, gameOverBaseY + 24);
      } else {
        ctx.font = '700 17px "Montserrat"';
        const idleText = "Кажется, пора идти на слушание";
        const idleLines = getWrappedCanvasText(idleText, dinoCanvas.width - 28);
        const idleLineHeight = 20;
        const idleStartY = Math.round(
          centerY - dinoCanvas.height * 0.25 - ((idleLines.length - 1) * idleLineHeight) / 2,
        );
        idleLines.forEach((textLine, index) => {
          ctx.fillText(textLine, centerX, idleStartY + index * idleLineHeight);
        });
      }

      ctx.textAlign = "start";
      ctx.textBaseline = "alphabetic";
    }
  }

  function frame(timestamp) {
    if (!game.running) return;
    if (document.hidden || activePanelName !== "dino") {
      lastFrameAt = timestamp;
      accumulatorMs = 0;
      game.rafId = requestAnimationFrame(frame);
      return;
    }
    if (!lastFrameAt) {
      lastFrameAt = timestamp;
    }
    const rawDeltaMs = Math.max(0, timestamp - lastFrameAt);
    const deltaMs = Math.min(maxDeltaMs, rawDeltaMs);
    lastFrameAt = timestamp;
    accumulatorMs += deltaMs;

    let simulatedMs = 0;
    while (accumulatorMs >= fixedStepMs && game.running) {
      update();
      accumulatorMs -= fixedStepMs;
      simulatedMs += fixedStepMs;
      if (simulatedMs >= maxSimulationMsPerFrame) {
        accumulatorMs = 0;
        break;
      }
    }

    updateStats();
    render();
    if (game.running) {
      game.rafId = requestAnimationFrame(frame);
    }
  }

  function jump() {
    if (!game.running) return;
    if (onGround()) {
      game.dino.vy = game.jumpPower;
      hatBounceEndAt = performance.now() + HAT_BOUNCE_DURATION_MS;
    }
  }

  function start() {
    syncCanvasSize();
    reset();
    cancelAnimationFrame(game.rafId);
    game.rafId = requestAnimationFrame(frame);
  }

  dinoCanvas.addEventListener("pointerdown", () => {
    if (!game.running) {
      start();
      return;
    }
    jump();
  });
  const handleGameResize = () => {
    if (syncCanvasSize()) {
      render();
    }
  };
  window.addEventListener("resize", handleGameResize);
  window.visualViewport?.addEventListener("resize", handleGameResize);
  window.addEventListener("keydown", (event) => {
    const target = event.target;
    const isEditableTarget =
      target instanceof HTMLInputElement ||
      target instanceof HTMLTextAreaElement ||
      target instanceof HTMLSelectElement ||
      (target instanceof HTMLElement && target.isContentEditable);
    if (isEditableTarget) {
      return;
    }

    if (event.code === "Space" || event.code === "ArrowUp") {
      event.preventDefault();
      if (!game.running) {
        start();
      } else {
        jump();
      }
    }
  });
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      lastFrameAt = 0;
      accumulatorMs = 0;
    }
  });

  if (gameMeta) {
    gameMeta.textContent = `Рекорд: ${game.best}. Кажется, пора идти на слушание.`;
  }
  updateStats();
  render();
}

function init() {
  initTopSection();
  initLogoReloadLink();
  initNavigation();
  initNewsPrototype();
  initOrderPopup();
  initOrders();
  initCompanyOrderModal();
  initSupportCustomSelects();
  initSupportForm();
  initQuiz();
  initBrochures();
  initDinoGame();
  queueFitToViewport();

  window.addEventListener("resize", queueFitToViewport);
  window.visualViewport?.addEventListener("resize", queueFitToViewport);
}

init();

