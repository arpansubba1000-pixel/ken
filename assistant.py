import os

from assistant_core import Assistant

def main() -> int:
    speak = os.environ.get("SPEAK", "0") == "1"
    assistant = Assistant(enable_speech=speak)
    assistant.run()
    return 0

if __name__ == "__main__":
    raise SystemExit(main())
