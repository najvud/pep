const rooms = ["Reception", "Atlas", "Orion", "Delta", "Neva"];

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
const supportForm = document.getElementById("supportForm");
const supportResult = document.getElementById("supportResult");
const issueSelect = document.getElementById("issueSelect");
const quizOptions = Array.from(document.querySelectorAll(".quiz-option"));
const quizQuestion = document.getElementById("quizQuestion");
const quizScoreBadge = document.getElementById("quizScoreBadge");
const quizMark = document.getElementById("quizMark");
const quizResult = document.getElementById("quizResult");
const feedbackForm = document.getElementById("feedbackForm");
const feedbackScore = document.getElementById("feedbackScore");
const feedbackText = document.getElementById("feedbackText");
const feedbackResult = document.getElementById("feedbackResult");
const newsDate = document.getElementById("newsDate");
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
  if (roomSelect) {
    roomSelect.value = roomName;
  }
  if (drinkRoomSelect) {
    drinkRoomSelect.value = roomName;
  }
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

  const useCompactLayout = viewportWidth < 430 || viewportHeight < 900;
  appRoot.classList.toggle("compact-layout", useCompactLayout);
  if (useCompactLayout) {
    appRoot.style.transform = "scale(1)";
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
  orderPopup.setAttribute("aria-hidden", "true");
}

function showTimedPopup(title, message, minDurationMs = 3000, maxDurationMs = 4000) {
  if (!orderPopup || !orderPopupMessage || !orderPopupTitle) return;
  orderPopupTitle.textContent = title;
  orderPopupMessage.textContent = message;
  orderPopup.classList.add("open");
  orderPopup.setAttribute("aria-hidden", "false");

  clearTimeout(orderPopupTimeoutId);
  const spread = Math.max(0, maxDurationMs - minDurationMs + 1);
  const popupDuration = minDurationMs + Math.floor(Math.random() * spread);
  orderPopupTimeoutId = window.setTimeout(() => {
    closeOrderPopup();
  }, popupDuration);
}

function showOrderPopup(drink, room, recipient, waitMin, waitMax) {
  const message = `${drink} для ${recipient}, переговорка ${room}. Время ожидания: ${waitMin}-${waitMax} мин.`;
  showTimedPopup("Заказ принят", message);
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

function storeLog(type, payload) {
  const key = "reception_connect_events";
  const previous = JSON.parse(localStorage.getItem(key) || "[]");
  previous.push({
    type,
    payload,
    at: new Date().toISOString(),
  });
  localStorage.setItem(key, JSON.stringify(previous.slice(-50)));
}

function initTopSection() {
  const fromQuery = detectRoomFromQuery();
  if (fromQuery) {
    setRoom(fromQuery);
  } else {
    setRoom(state.selectedRoom);
  }

  const timeFormatter = new Intl.DateTimeFormat("ru-RU", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const renderNewsDateTime = () => {
    if (!newsDate) return;
    const now = new Date();
    const datePart = `${String(now.getDate()).padStart(2, "0")}.${String(
      now.getMonth() + 1,
    ).padStart(2, "0")}.${String(now.getFullYear()).slice(-2)}`;
    const localTime = timeFormatter.format(now);
    newsDate.textContent = `${datePart} ${localTime}`;
  };
  renderNewsDateTime();
  window.setInterval(renderNewsDateTime, 60000);
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

function initOrders() {
  drinkRoomSelect?.addEventListener("change", () => {
    setRoom(drinkRoomSelect.value);
  });

  const orderButtons = Array.from(document.querySelectorAll(".order-btn"));
  orderButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const drink = button.dataset.drink || "Напиток";
      const currentRoom = drinkRoomSelect?.value || roomSelect?.value || state.selectedRoom;
      const recipient = drinkRecipientInput?.value.trim() || "гостя";
      const waitMin = 5 + Math.floor(Math.random() * 3);
      const waitMax = waitMin + 2;

      showOrderPopup(drink, currentRoom, recipient, waitMin, waitMax);
      storeLog("drink_order", {
        drink,
        room: currentRoom,
        recipient,
        waitMin,
        waitMax,
      });
    });
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

function initSupportForm() {
  if (!supportForm || !roomSelect || !issueSelect || !supportResult) return;

  roomSelect.addEventListener("change", () => {
    setRoom(roomSelect.value);
  });

  supportForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const room = roomSelect.value;
    const issue = issueSelect.value;
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
    roomSelect.value = room;
    queueFitToViewport();
  });
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
    quizScoreBadge.textContent = `${current} из ${total}`;
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
      }
    } else {
      if (quizMark) {
        quizMark.textContent = "";
        quizMark.classList.remove("show");
      }
      if (quizResult) {
        quizResult.textContent = `Неверно. Правильный ответ: ${current.options[current.correctIndex]}`;
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
      }, 950);
      return;
    }

    updateQuizBadge();
    const percent = Math.round((quizState.correctCount / quizState.questions.length) * 100);
    if (quizResult) {
      quizResult.textContent = `Итог: ${quizState.correctCount} из ${quizState.questions.length}`;
    }
    showQuizFinalOverlay(percent);
    quizState.completionTimeoutId = window.setTimeout(() => {
      closeQuizFinalOverlay();
      restartQuiz();
    }, 3200);
  };

  quizOptions.forEach((option, idx) => {
    option.addEventListener("click", () => {
      handleAnswer(idx);
    });
  });

  quizFinalOverlay?.addEventListener("click", closeQuizFinalOverlay);

  restartQuiz();
}

function initFeedback() {
  if (!feedbackForm) return;

  feedbackForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const score = feedbackScore?.value || "";
    const comment = feedbackText?.value.trim() || "";

    if (feedbackResult) {
      feedbackResult.textContent = "Спасибо! Ваш отзыв отправлен.";
    }
    showToast("Спасибо за отзыв о Пепеляев");

    storeLog("pepeliaev_feedback", {
      score,
      comment,
    });

    feedbackForm.reset();
    queueFitToViewport();
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
  const game = {
    running: false,
    status: "idle",
    score: 0,
    best: Number(localStorage.getItem("dino_best") || 0),
    speed: 2.1,
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
  const baseSpeed = 2.1;
  const maxSpeedGain = 1.1;
  const fixedStepMs = 1000 / 60;
  const maxDeltaMs = 250;
  const maxSimulationMsPerFrame = 500;
  let lastFrameAt = 0;
  let accumulatorMs = 0;
  const bgGradient = ctx.createLinearGradient(0, 0, 0, dinoCanvas.height);
  bgGradient.addColorStop(0, "#fbfcff");
  bgGradient.addColorStop(1, "#edf0ff");

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
    render();
  });
  professorSprite.src = "./assets/professor.png";

  game.dino.y = game.groundY - game.dino.h;

  function onGround() {
    return game.dino.y >= game.groundY - game.dino.h - 0.5;
  }

  function reset() {
    game.running = true;
    game.status = "running";
    game.score = 0;
    game.speed = baseSpeed;
    game.spawnTimer = 0;
    game.spawnInterval = 132;
    game.obstacles = [];
    game.dino.y = game.groundY - game.dino.h;
    game.dino.vy = 0;
    lastFrameAt = 0;
    accumulatorMs = 0;
    if (gameMeta) {
      gameMeta.textContent = "Игра запущена. Нажимайте на экран для прыжка.";
    }
    updateStats();
  }

  function spawnObstacle() {
    const width = 10 + Math.random() * 12;
    const height = 14 + Math.random() * 20;
    game.obstacles.push({
      x: dinoCanvas.width + 4,
      y: game.groundY - height,
      w: width,
      h: height,
    });
    game.spawnInterval = 118 + Math.floor(Math.random() * 86);
    game.spawnTimer = 0;
  }

  function collides(a, b) {
    return (
      a.x < b.x + b.w &&
      a.x + a.w > b.x &&
      a.y < b.y + b.h &&
      a.y + a.h > b.y
    );
  }

  function endGame() {
    game.running = false;
    game.status = "gameover";
    cancelAnimationFrame(game.rafId);
    lastFrameAt = 0;
    accumulatorMs = 0;
    const scoreRounded = Math.floor(game.score);
    if (scoreRounded > game.best) {
      game.best = scoreRounded;
      localStorage.setItem("dino_best", String(game.best));
    }
    if (gameMeta) {
      gameMeta.textContent = `Игра окончена. Счет: ${scoreRounded}. Рекорд: ${game.best}.`;
    }
    updateStats();
    render();
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

    const body = {
      x: game.dino.x + 11,
      y: game.dino.y + 8,
      w: game.dino.w - 20,
      h: game.dino.h - 12,
    };

    for (const obstacle of game.obstacles) {
      obstacle.x -= game.speed;
      if (collides(body, obstacle)) {
        endGame();
        return;
      }
    }
    game.obstacles = game.obstacles.filter((obstacle) => obstacle.x + obstacle.w > -10);

    game.score += 0.05;
    game.speed = baseSpeed + Math.min(maxSpeedGain, game.score / 420);
  }

  function render() {
    ctx.clearRect(0, 0, dinoCanvas.width, dinoCanvas.height);
    ctx.fillStyle = bgGradient;
    ctx.fillRect(0, 0, dinoCanvas.width, dinoCanvas.height);

    ctx.strokeStyle = "#951b81";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, game.groundY + 0.5);
    ctx.lineTo(dinoCanvas.width, game.groundY + 0.5);
    ctx.stroke();

    if (professorSpriteReady) {
      ctx.drawImage(
        professorSprite,
        game.dino.x,
        game.dino.y,
        game.dino.w,
        game.dino.h,
      );
    } else {
      ctx.fillStyle = "#272c3e";
      ctx.fillRect(game.dino.x, game.dino.y, game.dino.w, game.dino.h);
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(game.dino.x + 20, game.dino.y + 10, 5, 5);
    }

    ctx.fillStyle = "#b54ca2";
    game.obstacles.forEach((obstacle) => {
      ctx.fillRect(obstacle.x, obstacle.y, obstacle.w, obstacle.h);
    });

    if (!game.running) {
      ctx.fillStyle = "rgba(255,255,255,0.68)";
      ctx.fillRect(0, 0, dinoCanvas.width, dinoCanvas.height);
      ctx.fillStyle = "#272c3e";
      ctx.font = '700 20px "Montserrat"';
      ctx.textAlign = "center";
      const title =
        game.status === "gameover" ? "Игра закончилась" : "Нажмите для старта";
      ctx.fillText(title, dinoCanvas.width / 2, dinoCanvas.height / 2 - 3);
      if (game.status === "gameover") {
        ctx.font = '700 12px "Montserrat"';
        ctx.fillText(
          "Нажмите для новой попытки",
          dinoCanvas.width / 2,
          dinoCanvas.height / 2 + 18,
        );
      }
      ctx.textAlign = "start";
    }
  }

  function frame(timestamp) {
    if (!game.running) return;
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
    }
  }

  function start() {
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
  window.addEventListener("keydown", (event) => {
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
    gameMeta.textContent = `Рекорд: ${game.best}. Нажмите для старта.`;
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
  initSupportForm();
  initQuiz();
  initFeedback();
  initDinoGame();
  queueFitToViewport();

  window.addEventListener("resize", queueFitToViewport);
  window.visualViewport?.addEventListener("resize", queueFitToViewport);
}

init();
