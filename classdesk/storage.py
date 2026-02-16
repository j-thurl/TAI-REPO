from __future__ import annotations

from dataclasses import dataclass, asdict
from datetime import datetime
import json
from pathlib import Path
from typing import Literal
from uuid import uuid4


ItemType = Literal["recording", "notes", "document", "assignment"]


@dataclass
class ClassItem:
    id: str
    class_name: str
    item_type: ItemType
    title: str
    file_path: str
    due_date: str
    notes: str
    created_at: str


class ClassDeskStore:
    """Persistent JSON storage for classes and learning materials."""

    def __init__(self, db_path: str | Path = "classdesk_data.json") -> None:
        self.db_path = Path(db_path)
        self._data = {"classes": [], "items": []}
        self.load()

    def load(self) -> None:
        if self.db_path.exists():
            self._data = json.loads(self.db_path.read_text(encoding="utf-8"))
        else:
            self._save()

    def _save(self) -> None:
        self.db_path.write_text(json.dumps(self._data, indent=2), encoding="utf-8")

    @property
    def classes(self) -> list[str]:
        return sorted(self._data["classes"])

    def add_class(self, class_name: str) -> bool:
        clean_name = class_name.strip()
        if not clean_name or clean_name in self._data["classes"]:
            return False
        self._data["classes"].append(clean_name)
        self._save()
        return True

    def add_item(
        self,
        class_name: str,
        item_type: ItemType,
        title: str,
        file_path: str,
        due_date: str = "",
        notes: str = "",
    ) -> ClassItem:
        if class_name not in self._data["classes"]:
            raise ValueError(f"Unknown class '{class_name}'")
        if item_type not in {"recording", "notes", "document", "assignment"}:
            raise ValueError(f"Unsupported item type '{item_type}'")

        item = ClassItem(
            id=str(uuid4()),
            class_name=class_name,
            item_type=item_type,
            title=title.strip(),
            file_path=file_path.strip(),
            due_date=due_date.strip(),
            notes=notes.strip(),
            created_at=datetime.now().isoformat(timespec="seconds"),
        )
        self._data["items"].append(asdict(item))
        self._save()
        return item

    def list_items(self, class_name: str | None = None, item_type: str | None = None) -> list[ClassItem]:
        items = self._data["items"]
        if class_name:
            items = [i for i in items if i["class_name"] == class_name]
        if item_type:
            items = [i for i in items if i["item_type"] == item_type]
        return [ClassItem(**i) for i in sorted(items, key=lambda x: x["created_at"], reverse=True)]

    def search_items(self, query: str) -> list[ClassItem]:
        needle = query.strip().lower()
        if not needle:
            return self.list_items()
        return [
            i
            for i in self.list_items()
            if needle in i.title.lower()
            or needle in i.notes.lower()
            or needle in i.class_name.lower()
            or needle in i.file_path.lower()
        ]
