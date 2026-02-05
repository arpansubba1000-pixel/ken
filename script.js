const arena = document.getElementById("arena");
const satellite = document.getElementById("satellite");
const star = document.getElementById("star");
const scoreEl = document.getElementById("score");
const bestEl = document.getElementById("best");
const timeEl = document.getElementById("time");
const startButton = document.getElementById("start");
const resetButton = document.getElementById("reset");
const assistantForm = document.getElementById("assistant-form");
const assistantInput = document.getElementById("assistant-input");
const assistantLog = document.getElementById("assistant-log");
const assistantChips = document.querySelectorAll(".assistant__chip");

const state = {
  score: 0,
  best: Number(localStorage.getItem("orbit-best") ?? 0),
  time: 30,
  timerId: null,
  running: false,
  position: { x: 50, y: 50 },
};

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

const placeStar = () => {
  const rect = arena.getBoundingClientRect();
  const padding = 24;
  const maxX = rect.width - padding;
  const maxY = rect.height - padding;
  const x = clamp(Math.random() * maxX, padding, maxX);
  const y = clamp(Math.random() * maxY, padding, maxY);

  star.style.left = `${x}px`;
  star.style.top = `${y}px`;
};

const updateSatellite = (clientX, clientY) => {
  const rect = arena.getBoundingClientRect();
  const x = clamp(clientX - rect.left, 0, rect.width);
  const y = clamp(clientY - rect.top, 0, rect.height);

  state.position = { x, y };
  satellite.style.left = `${x}px`;
  satellite.style.top = `${y}px`;
};

const updateHud = () => {
  scoreEl.textContent = state.score;
  bestEl.textContent = state.best;
  timeEl.textContent = state.time;
};

const awardPoint = () => {
  if (!state.running) {
    return;
  }
  state.score += 1;
  state.time += 1;
  if (state.score > state.best) {
    state.best = state.score;
    localStorage.setItem("orbit-best", String(state.best));
  }
  updateHud();
  placeStar();
};

const distanceToStar = () => {
  const starRect = star.getBoundingClientRect();
  const arenaRect = arena.getBoundingClientRect();
  const starX = starRect.left - arenaRect.left + starRect.width / 2;
  const starY = starRect.top - arenaRect.top + starRect.height / 2;
  const dx = starX - state.position.x;
  const dy = starY - state.position.y;
  return Math.hypot(dx, dy);
};

const tick = () => {
  state.time -= 1;
  if (state.time <= 0) {
    stopGame();
    return;
  }
  updateHud();
};

const startGame = () => {
  if (state.running) {
    return;
  }
  state.running = true;
  state.score = 0;
  state.time = 30;
  updateHud();
  placeStar();
  startButton.textContent = "Running...";
  startButton.disabled = true;
  state.timerId = window.setInterval(tick, 1000);
};

const stopGame = () => {
  state.running = false;
  window.clearInterval(state.timerId);
  state.timerId = null;
  startButton.textContent = "Start run";
  startButton.disabled = false;
};

const resetBest = () => {
  state.best = 0;
  localStorage.removeItem("orbit-best");
  updateHud();
};

const assistantResponses = [
  {
    match: ["strategy", "tip", "score"],
    reply:
      "Stay near the center so you can reach new stars faster. Each catch gives you +1 second.",
  },
  {
    match: ["control", "move", "mouse", "touch"],
    reply:
      "Move your cursor or finger inside the arena to pilot the satellite. Glide over stars to collect them.",
  },
  {
    match: ["reset", "best", "high score"],
    reply: "Use the “Reset best” button to clear your top score.",
  },
  {
    match: ["timer", "time", "clock"],
    reply: "The timer counts down from 30. Every star you catch adds one second.",
  },
  {
    match: ["help", "commands"],
    reply:
      "Try “remind me in 10 seconds,” “add task practice aiming,” “list tasks,” or ask for strategy/controls.",
  },
];

const assistantState = {
  tasks: [],
};

const parseReminder = (text) => {
  const match = text.match(/remind me in (\\d+)\\s*(second|seconds|minute|minutes)/);
  if (!match) {
    return null;
  }
  const amount = Number(match[1]);
  const unit = match[2].startsWith("minute") ? 60000 : 1000;
  return amount * unit;
};

const parseTask = (text) => {
  const match = text.match(/add task (.+)/);
  return match ? match[1].trim() : null;
};

const handleTaskCommand = (text) => {
  if (text.includes("list tasks")) {
    if (assistantState.tasks.length === 0) {
      return "Your task list is empty. Add one with “add task ...”.";
    }
    return `Tasks: ${assistantState.tasks.join(", ")}.`;
  }
  if (text.includes("clear tasks")) {
    assistantState.tasks = [];
    return "Cleared your task list.";
  }
  const task = parseTask(text);
  if (task) {
    assistantState.tasks.push(task);
    return `Added task: ${task}.`;
  }
  return null;
};

const addAssistantMessage = (text, variant) => {
  const message = document.createElement("div");
  message.className = `assistant__message assistant__message--${variant}`;
  message.textContent = text;
  assistantLog.appendChild(message);
  assistantLog.scrollTop = assistantLog.scrollHeight;
};

const handleAssistantText = (prompt) => {
  if (!prompt) {
    return;
  }
  addAssistantMessage(prompt, "user");
  const lowerPrompt = prompt.toLowerCase();
  const taskReply = handleTaskCommand(lowerPrompt);
  if (taskReply) {
    addAssistantMessage(taskReply, "assistant");
    return;
  }
  const reminderDelay = parseReminder(lowerPrompt);
  if (reminderDelay) {
    addAssistantMessage("Got it! I will remind you soon.", "assistant");
    window.setTimeout(() => {
      addAssistantMessage("Reminder: time to check your game goals!", "assistant");
    }, reminderDelay);
    return;
  }
  const response =
    assistantResponses.find((entry) =>
      entry.match.some((keyword) => lowerPrompt.includes(keyword)),
    )?.reply ??
    "I can help with reminders, tasks, “strategy,” or “controls.” Try “help” for ideas.";
  addAssistantMessage(response, "assistant");
};

const handleAssistantPrompt = (event) => {
  event.preventDefault();
  const prompt = assistantInput.value.trim();
  if (!prompt) {
    return;
  }
  assistantInput.value = "";
  handleAssistantText(prompt);
};

arena.addEventListener("pointermove", (event) => {
  updateSatellite(event.clientX, event.clientY);
  if (state.running && distanceToStar() < 30) {
    awardPoint();
  }
});

star.addEventListener("click", awardPoint);
startButton.addEventListener("click", startGame);
resetButton.addEventListener("click", resetBest);
if (assistantForm) {
  assistantForm.addEventListener("submit", handleAssistantPrompt);
}
assistantChips.forEach((chip) => {
  chip.addEventListener("click", () => {
    const prompt = chip.dataset.prompt ?? "";
    handleAssistantText(prompt);
  });
});

updateHud();
placeStar();
