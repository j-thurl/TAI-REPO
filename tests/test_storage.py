from pathlib import Path

from classdesk.storage import ClassDeskStore


def test_add_class_and_item(tmp_path: Path) -> None:
    db = tmp_path / "data.json"
    store = ClassDeskStore(db)

    assert store.add_class("Math 101") is True
    assert store.add_class("Math 101") is False

    item = store.add_item(
        class_name="Math 101",
        item_type="assignment",
        title="Homework 1",
        file_path="/notes/hw1.pdf",
        due_date="2026-02-20",
        notes="Chapter 1-3",
    )

    assert item.class_name == "Math 101"
    assert len(store.list_items("Math 101")) == 1
    assert store.search_items("chapter")


def test_invalid_class_for_item(tmp_path: Path) -> None:
    store = ClassDeskStore(tmp_path / "data.json")

    try:
        store.add_item(
            class_name="Unknown",
            item_type="notes",
            title="Week 1",
            file_path="/tmp/week1.md",
        )
        raised = False
    except ValueError:
        raised = True

    assert raised is True
