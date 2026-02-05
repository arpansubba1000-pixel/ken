from __future__ import annotations

import json
import os
import re
import threading
import time
import webbrowser
from dataclasses import dataclass
from datetime import datetime, timedelta
from pathlib import Path
from typing import Callable, Dict, Iterable, Optional

ReminderCallback = Callable[[str], None]


@dataclass
class Command:
    name: str
    description: str
    handler: Callable[[str], str]


class Assistant:
    def __init__(self, enable_speech: bool = False) -> None:
        self.enable_speech = enable_speech
        self.commands: Dict[str, Command] = {}
        self.data_dir = Path(os.environ.get("USERPROFILE", ".")) / ".ken_assistant"
        self.data_dir.mkdir(parents=True, exist_ok=True)
        self.notes_path = self.data_dir / "notes.json"
        self.reminders_path = self.data_dir / "reminders.json"
        self._register_default_commands()

    def run(self) -> None:
        self._say("Hello! I'm Ken, your personal assistant. Type 'help' for commands.")
        while True:
            try:
                user_input = input("> ").strip()
            except (EOFError, KeyboardInterrupt):
                self._say("Goodbye!")
                break

            if not user_input:
                continue

            if user_input.lower() in {"exit", "quit"}:
                self._say("Goodbye!")
                break

            response = self._dispatch(user_input)
            if response:
                self._say(response)

    def _register_default_commands(self) -> None:
        self.register("hello", "Say hello", self._handle_hello)
        self.register("time", "Show the current time", self._handle_time)
        self.register("date", "Show the current date", self._handle_date)
        self.register("open", "Open a website", self._handle_open)
        self.register("search", "Search the web", self._handle_search)
        self.register("note", "Save a quick note", self._handle_note)
        self.register("remind", "Set a reminder", self._handle_remind)
        self.register("help", "List available commands", self._handle_help)

    def register(self, name: str, description: str, handler: Callable[[str], str]) -> None:
        self.commands[name] = Command(name=name, description=description, handler=handler)

    def _dispatch(self, user_input: str) -> str:
        lowered = user_input.lower()
        for command in self.commands.values():
            if lowered == command.name or lowered.startswith(f"{command.name} "):
                return command.handler(user_input)
        return "Sorry, I didn't understand that. Type 'help' to see commands."

    def _handle_hello(self, _: str) -> str:
        return "Hi there! How can I help you today?"

    def _handle_time(self, _: str) -> str:
        return datetime.now().strftime("It's %I:%M %p.")

    def _handle_date(self, _: str) -> str:
        return datetime.now().strftime("Today is %A, %B %d, %Y.")

    def _handle_open(self, user_input: str) -> str:
        target = user_input.partition(" ")[2].strip()
        if not target:
            return "Tell me which website to open. Example: open youtube.com"
        if not re.match(r"https?://", target):
            target = f"https://{target}"
        webbrowser.open(target)
        return f"Opening {target}"

    def _handle_search(self, user_input: str) -> str:
        query = user_input.partition(" ")[2].strip()
        if not query:
            return "Tell me what to search for. Example: search weather in seattle"
        url = "https://www.bing.com/search?q=" + re.sub(r"\s+", "+", query)
        webbrowser.open(url)
        return f"Searching the web for '{query}'."

    def _handle_note(self, user_input: str) -> str:
        note = user_input.partition(" ")[2].strip()
        if not note:
            return "Tell me the note to save. Example: note buy milk"
        notes = self._load_json(self.notes_path, default=[])
        notes.append({"note": note, "timestamp": datetime.now().isoformat()})
        self._save_json(self.notes_path, notes)
        return "Note saved."

    def _handle_remind(self, user_input: str) -> str:
        reminder = user_input.partition(" ")[2].strip()
        if not reminder:
            return "Try: remind me in 10 minutes to stretch"

        match = re.search(r"in\s+(\d+)\s+(second|seconds|minute|minutes|hour|hours)\s+to\s+(.+)", reminder, re.IGNORECASE)
        if not match:
            return "Format: remind me in 10 minutes to stretch"

        amount = int(match.group(1))
        unit = match.group(2).lower()
        message = match.group(3).strip()
        delta = self._to_timedelta(amount, unit)
        trigger_time = datetime.now() + delta

        self._schedule_reminder(delta, message)
        self._store_reminder(message, trigger_time)
        return f"Reminder set for {trigger_time.strftime('%I:%M %p')}."

    def _handle_help(self, _: str) -> str:
        lines = ["Here are the things I can do:"]
        for command in self.commands.values():
            lines.append(f"- {command.name}: {command.description}")
        lines.append("Type 'exit' to quit.")
        return "\n".join(lines)

    def _say(self, message: str) -> None:
        print(message)
        if self.enable_speech:
            self._speak_windows(message)

    def _speak_windows(self, message: str) -> None:
        if os.name != "nt":
            return
        escaped = message.replace("'", "''")
        script = (
            "Add-Type -AssemblyName System.Speech; "
            "$speak = New-Object System.Speech.Synthesis.SpeechSynthesizer; "
            f"$speak.Speak('{escaped}')"
        )
        os.system(f"powershell -Command \"{script}\"")

    def _schedule_reminder(self, delta: timedelta, message: str) -> None:
        def notify() -> None:
            self._say(f"Reminder: {message}")

        timer = threading.Timer(delta.total_seconds(), notify)
        timer.daemon = True
        timer.start()

    def _store_reminder(self, message: str, trigger_time: datetime) -> None:
        reminders = self._load_json(self.reminders_path, default=[])
        reminders.append(
            {
                "message": message,
                "trigger_time": trigger_time.isoformat(),
                "created_at": datetime.now().isoformat(),
            }
        )
        self._save_json(self.reminders_path, reminders)

    @staticmethod
    def _to_timedelta(amount: int, unit: str) -> timedelta:
        if "second" in unit:
            return timedelta(seconds=amount)
        if "minute" in unit:
            return timedelta(minutes=amount)
        return timedelta(hours=amount)

    @staticmethod
    def _load_json(path: Path, default: Iterable) -> list:
        if not path.exists():
            return list(default)
        try:
            return json.loads(path.read_text(encoding="utf-8"))
        except json.JSONDecodeError:
            return list(default)

    @staticmethod
    def _save_json(path: Path, payload: list) -> None:
        path.write_text(json.dumps(payload, indent=2), encoding="utf-8")
