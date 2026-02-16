# ClassDesk

ClassDesk is a desktop app for managing class content in one place. You can track:

- Class recordings
- Notes
- Documents
- Assignments

Each material item is connected to a class and stored in a local JSON database (`classdesk_data.json`).

## Features

- Create and manage multiple classes
- Save materials by type (`recording`, `notes`, `document`, `assignment`)
- Attach local file paths for quick reference
- Optional due date and notes per item
- Search across class name, title, notes, and path

## Run

```bash
python app.py
```

No external dependencies are required (uses Python standard library + Tkinter).
