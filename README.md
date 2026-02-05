# Ken Personal Assistant (Windows)

A lightweight, Windows-friendly personal assistant inspired by Alexa. It runs in a terminal, listens for typed commands, and can optionally speak responses using Windows' built-in SAPI voice (via PowerShell).

## Features

- Greeting + help commands
- Current time/date
- Open websites or search the web
- Quick notes (saved locally)
- Simple reminders (timer-based)
- Optional text-to-speech on Windows

## Requirements

- Python 3.10+
- Windows (for optional voice output). On other OSes, responses are printed only.

## Quick start

```powershell
python assistant.py
```

## Example commands

- `hello`
- `time` / `date`
- `open youtube.com`
- `search weather in seattle`
- `note buy milk`
- `remind me in 10 minutes to stretch`
- `help`
- `exit`

## Voice output

By default the assistant uses text output. On Windows, set `SPEAK=1` to enable voice output:

```powershell
$env:SPEAK=1
python assistant.py
```

## Data storage

Notes and reminder history are stored in:

```
%USERPROFILE%\.ken_assistant\
```

## License

MIT. See [LICENSE](LICENSE).
