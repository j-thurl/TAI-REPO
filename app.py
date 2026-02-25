from __future__ import annotations

import tkinter as tk
from pathlib import Path
from tkinter import filedialog, messagebox, ttk

from classdesk.storage import ClassDeskStore


class ClassDeskApp:
    def __init__(self, root: tk.Tk) -> None:
        self.root = root
        self.root.title("ClassDesk - Class Materials Manager")
        self.root.geometry("1200x700")

        self.store = ClassDeskStore()

        self.class_var = tk.StringVar()
        self.item_type_var = tk.StringVar(value="recording")
        self.search_var = tk.StringVar()

        self._build_layout()
        self._refresh_class_options()
        self._refresh_table()

    def _build_layout(self) -> None:
        top = ttk.Frame(self.root, padding=12)
        top.pack(fill="x")

        ttk.Label(top, text="New Class").grid(row=0, column=0, sticky="w")
        self.new_class_entry = ttk.Entry(top, width=24)
        self.new_class_entry.grid(row=0, column=1, padx=6)
        ttk.Button(top, text="Add Class", command=self.add_class).grid(row=0, column=2, padx=4)

        ttk.Label(top, text="Search").grid(row=0, column=3, padx=(20, 0), sticky="w")
        search_entry = ttk.Entry(top, width=30, textvariable=self.search_var)
        search_entry.grid(row=0, column=4, padx=6)
        search_entry.bind("<KeyRelease>", lambda _: self._refresh_table())

        ttk.Button(top, text="Refresh", command=self._refresh_table).grid(row=0, column=5, padx=4)

        entry = ttk.LabelFrame(self.root, text="Add Material", padding=12)
        entry.pack(fill="x", padx=12, pady=8)

        ttk.Label(entry, text="Class").grid(row=0, column=0, sticky="w")
        self.class_combo = ttk.Combobox(entry, textvariable=self.class_var, state="readonly", width=24)
        self.class_combo.grid(row=0, column=1, padx=6)

        ttk.Label(entry, text="Type").grid(row=0, column=2, sticky="w")
        ttk.Combobox(
            entry,
            textvariable=self.item_type_var,
            state="readonly",
            values=["recording", "notes", "document", "assignment"],
            width=14,
        ).grid(row=0, column=3, padx=6)

        ttk.Label(entry, text="Title").grid(row=1, column=0, sticky="w", pady=(10, 0))
        self.title_entry = ttk.Entry(entry, width=40)
        self.title_entry.grid(row=1, column=1, columnspan=2, sticky="we", pady=(10, 0), padx=6)

        ttk.Label(entry, text="Due Date").grid(row=1, column=3, sticky="w", pady=(10, 0))
        self.due_entry = ttk.Entry(entry, width=16)
        self.due_entry.grid(row=1, column=4, padx=6, pady=(10, 0), sticky="w")

        ttk.Label(entry, text="File").grid(row=2, column=0, sticky="w", pady=(10, 0))
        self.path_entry = ttk.Entry(entry, width=70)
        self.path_entry.grid(row=2, column=1, columnspan=3, sticky="we", pady=(10, 0), padx=6)
        ttk.Button(entry, text="Browse", command=self.pick_file).grid(row=2, column=4, pady=(10, 0))

        ttk.Label(entry, text="Notes").grid(row=3, column=0, sticky="nw", pady=(10, 0))
        self.notes_text = tk.Text(entry, width=80, height=4)
        self.notes_text.grid(row=3, column=1, columnspan=4, sticky="we", pady=(10, 0), padx=6)

        ttk.Button(entry, text="Save Material", command=self.add_item).grid(row=4, column=4, sticky="e", pady=(12, 0))

        table_wrap = ttk.LabelFrame(self.root, text="Library", padding=12)
        table_wrap.pack(fill="both", expand=True, padx=12, pady=8)

        columns = ("class", "type", "title", "due", "file", "created")
        self.table = ttk.Treeview(table_wrap, columns=columns, show="headings")
        self.table.heading("class", text="Class")
        self.table.heading("type", text="Type")
        self.table.heading("title", text="Title")
        self.table.heading("due", text="Due")
        self.table.heading("file", text="File Path")
        self.table.heading("created", text="Added")
        self.table.column("class", width=130)
        self.table.column("type", width=100)
        self.table.column("title", width=200)
        self.table.column("due", width=100)
        self.table.column("file", width=460)
        self.table.column("created", width=140)
        self.table.pack(fill="both", expand=True)

    def _refresh_class_options(self) -> None:
        classes = self.store.classes
        self.class_combo["values"] = classes
        if classes and (not self.class_var.get() or self.class_var.get() not in classes):
            self.class_var.set(classes[0])

    def add_class(self) -> None:
        class_name = self.new_class_entry.get().strip()
        if not class_name:
            messagebox.showwarning("Missing class", "Enter a class name first.")
            return
        if not self.store.add_class(class_name):
            messagebox.showinfo("Exists", "Class already exists or invalid name.")
            return

        self.new_class_entry.delete(0, tk.END)
        self._refresh_class_options()
        self._refresh_table()

    def pick_file(self) -> None:
        path = filedialog.askopenfilename(title="Choose material")
        if path:
            self.path_entry.delete(0, tk.END)
            self.path_entry.insert(0, path)
            if not self.title_entry.get().strip():
                self.title_entry.insert(0, Path(path).name)

    def add_item(self) -> None:
        selected_class = self.class_var.get()
        title = self.title_entry.get().strip()
        path = self.path_entry.get().strip()

        if not selected_class:
            messagebox.showwarning("Missing class", "Create and choose a class before saving material.")
            return
        if not title or not path:
            messagebox.showwarning("Missing details", "Title and file path are required.")
            return

        self.store.add_item(
            class_name=selected_class,
            item_type=self.item_type_var.get(),
            title=title,
            file_path=path,
            due_date=self.due_entry.get().strip(),
            notes=self.notes_text.get("1.0", tk.END).strip(),
        )

        self.title_entry.delete(0, tk.END)
        self.path_entry.delete(0, tk.END)
        self.due_entry.delete(0, tk.END)
        self.notes_text.delete("1.0", tk.END)
        self._refresh_table()

    def _refresh_table(self) -> None:
        for row in self.table.get_children():
            self.table.delete(row)

        query = self.search_var.get().strip()
        items = self.store.search_items(query) if query else self.store.list_items()
        for item in items:
            self.table.insert(
                "",
                tk.END,
                values=(
                    item.class_name,
                    item.item_type,
                    item.title,
                    item.due_date,
                    item.file_path,
                    item.created_at,
                ),
            )


if __name__ == "__main__":
    root = tk.Tk()
    app = ClassDeskApp(root)
    root.mainloop()
