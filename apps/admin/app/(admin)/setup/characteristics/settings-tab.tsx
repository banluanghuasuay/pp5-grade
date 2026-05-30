"use client";

import { Button } from "@pp5/ui";
import { ArrowDown, ArrowUp, Database, Pencil, Plus, X } from "lucide-react";
import { useState, useTransition } from "react";
import Swal from "sweetalert2";
import {
  createCharacteristic,
  deactivateCharacteristic,
  moveCharacteristic,
  seedObecCharacteristics,
  updateCharacteristicName,
} from "./actions";

export type Characteristic = {
  id: string;
  name: string;
  sort_order: number;
  source: string | null;
};

/**
 * Tab 1 — ตั้งค่าคุณลักษณะ.
 *
 * Manages the global `characteristics` table:
 *  - List active rows in sort_order
 *  - Add new row (inline form)
 *  - Inline edit name (click → input)
 *  - Move up/down via ↑↓ buttons (simpler than drag&drop for v1)
 *  - Soft-delete (sets is_active=false; evaluations preserved)
 *  - "โหลดค่า สพฐ." restores the 8 default items (idempotent)
 */
export function CharacteristicsSettings({
  items,
}: {
  items: Characteristic[];
}) {
  return (
    <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-200 bg-zinc-50 px-4 py-3">
        <div>
          <h3 className="text-sm font-semibold text-zinc-900">
            หัวข้อคุณลักษณะอันพึงประสงค์
          </h3>
          <p className="mt-0.5 text-xs text-zinc-500">
            ค่าเริ่มต้น {items.length} ข้อ · แก้ไข/เพิ่ม/ลบ/จัดเรียงได้ ·
            ใช้กับทุกห้องในระบบ
          </p>
        </div>
        <div className="flex gap-2">
          <SeedButton />
          <AddInline />
        </div>
      </div>

      {items.length === 0 ? (
        <div className="p-12 text-center text-sm text-zinc-500">
          ยังไม่มีหัวข้อ — กด <strong>"โหลดค่า สพฐ."</strong>{" "}
          เพื่อเริ่มต้นด้วย 8 ข้อมาตรฐาน
        </div>
      ) : (
        <ul className="divide-y divide-zinc-100">
          {items.map((c, i) => (
            <Row
              key={c.id}
              item={c}
              isFirst={i === 0}
              isLast={i === items.length - 1}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

// ===================================================================
// Inline add form — submit creates row, then reverts to a "+ เพิ่มข้อ" link
// ===================================================================

function AddInline() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [isPending, startTransition] = useTransition();

  const handleSave = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    const fd = new FormData();
    fd.set("name", trimmed);
    startTransition(async () => {
      try {
        await createCharacteristic(fd);
        setName("");
        setOpen(false);
      } catch (err) {
        alert(`เพิ่มไม่สำเร็จ: ${err instanceof Error ? err.message : String(err)}`);
      }
    });
  };

  if (!open) {
    return (
      <Button
        type="button"
        variant="primary"
        size="sm"
        onClick={() => setOpen(true)}
      >
        <Plus className="size-4" aria-hidden />
        เพิ่มข้อ
      </Button>
    );
  }

  return (
    <div className="flex items-center gap-1.5">
      <input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        autoFocus
        placeholder="ชื่อหัวข้อ..."
        disabled={isPending}
        onKeyDown={(e) => {
          if (e.key === "Enter") handleSave();
          if (e.key === "Escape") {
            setName("");
            setOpen(false);
          }
        }}
        className="rounded-md border border-zinc-300 px-2.5 py-1.5 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
      />
      <Button
        type="button"
        size="sm"
        onClick={handleSave}
        pending={isPending}
      >
        {isPending ? "..." : "บันทึก"}
      </Button>
      <button
        type="button"
        onClick={() => {
          setName("");
          setOpen(false);
        }}
        className="rounded-md px-2 py-1 text-xs text-zinc-500 hover:text-zinc-700"
      >
        ยกเลิก
      </button>
    </div>
  );
}

// ===================================================================
// Seed button — restores the 8 obec defaults (with confirm)
// ===================================================================

function SeedButton() {
  const [isPending, startTransition] = useTransition();

  const handleClick = async () => {
    const result = await Swal.fire({
      title: "โหลดค่า สพฐ. 8 ข้อ",
      html: `<p class="text-sm text-zinc-600">เพิ่ม 8 หัวข้อมาตรฐานของ สพฐ. เข้าระบบ</p>
<p class="mt-2 text-xs text-zinc-500">ถ้าหัวข้อชื่อเดียวกันมีอยู่แล้ว ระบบจะข้าม · ของที่ถูกลบจะถูกเปิดใช้งานกลับ</p>`,
      icon: "info",
      showCancelButton: true,
      confirmButtonText: "โหลดเลย",
      cancelButtonText: "ยกเลิก",
      confirmButtonColor: "#0284c7",
      cancelButtonColor: "#71717a",
      reverseButtons: true,
    });
    if (!result.isConfirmed) return;
    startTransition(async () => {
      try {
        await seedObecCharacteristics();
      } catch (err) {
        alert(
          `โหลดไม่สำเร็จ: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    });
  };

  return (
    <Button
      type="button"
      variant="secondary"
      size="sm"
      onClick={handleClick}
      pending={isPending}
    >
      <Database className="size-4" aria-hidden />
      โหลดค่า สพฐ.
    </Button>
  );
}

// ===================================================================
// Single row — number + name (inline-editable) + source badge + actions
// ===================================================================

function Row({
  item,
  isFirst,
  isLast,
}: {
  item: Characteristic;
  isFirst: boolean;
  isLast: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(item.name);
  const [isPending, startTransition] = useTransition();

  const handleSaveEdit = () => {
    const trimmed = draft.trim();
    if (!trimmed || trimmed === item.name) {
      setEditing(false);
      setDraft(item.name);
      return;
    }
    const fd = new FormData();
    fd.set("id", item.id);
    fd.set("name", trimmed);
    startTransition(async () => {
      try {
        await updateCharacteristicName(fd);
        setEditing(false);
      } catch (err) {
        alert(`แก้ไม่สำเร็จ: ${err instanceof Error ? err.message : String(err)}`);
      }
    });
  };

  const handleMove = (direction: "up" | "down") => {
    const fd = new FormData();
    fd.set("id", item.id);
    fd.set("direction", direction);
    startTransition(async () => {
      try {
        await moveCharacteristic(fd);
      } catch (err) {
        alert(`ย้ายไม่สำเร็จ: ${err instanceof Error ? err.message : String(err)}`);
      }
    });
  };

  const handleDelete = async () => {
    const result = await Swal.fire({
      title: `ลบหัวข้อ "${item.name}" ?`,
      html: `<p class="text-sm text-zinc-600">หัวข้อจะถูกซ่อนจากระบบ (soft delete) · ผลการประเมินเก่ายังอยู่ในฐานข้อมูล</p>`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "ลบ",
      cancelButtonText: "ยกเลิก",
      confirmButtonColor: "#dc2626",
      cancelButtonColor: "#71717a",
      reverseButtons: true,
    });
    if (!result.isConfirmed) return;
    const fd = new FormData();
    fd.set("id", item.id);
    startTransition(async () => {
      try {
        await deactivateCharacteristic(fd);
      } catch (err) {
        alert(`ลบไม่สำเร็จ: ${err instanceof Error ? err.message : String(err)}`);
      }
    });
  };

  return (
    <li className="flex items-center gap-3 px-4 py-2.5 hover:bg-zinc-50">
      {/* Move handles */}
      <div className="flex flex-col gap-0.5">
        <button
          type="button"
          onClick={() => handleMove("up")}
          disabled={isFirst || isPending}
          className="rounded p-0.5 text-zinc-400 hover:bg-zinc-200 hover:text-zinc-700 disabled:opacity-30"
          aria-label="ย้ายขึ้น"
        >
          <ArrowUp className="size-3" />
        </button>
        <button
          type="button"
          onClick={() => handleMove("down")}
          disabled={isLast || isPending}
          className="rounded p-0.5 text-zinc-400 hover:bg-zinc-200 hover:text-zinc-700 disabled:opacity-30"
          aria-label="ย้ายลง"
        >
          <ArrowDown className="size-3" />
        </button>
      </div>

      {/* Sort number */}
      <span className="w-6 text-center text-sm tabular-nums text-zinc-500">
        {item.sort_order}.
      </span>

      {/* Name (inline-editable) */}
      <div className="flex-1">
        {editing ? (
          <input
            type="text"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            autoFocus
            disabled={isPending}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSaveEdit();
              if (e.key === "Escape") {
                setEditing(false);
                setDraft(item.name);
              }
            }}
            onBlur={handleSaveEdit}
            className="w-full rounded-md border border-zinc-300 px-2.5 py-1.5 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          />
        ) : (
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="inline-flex items-center gap-2 text-left text-sm text-zinc-900 hover:text-primary-700"
            title="คลิกเพื่อแก้ไข"
          >
            {item.name}
            <Pencil
              className="size-3 text-zinc-300 transition group-hover:text-zinc-500"
              aria-hidden
            />
          </button>
        )}
      </div>

      {/* Source badge */}
      {item.source === "obec" ? (
        <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-700 ring-1 ring-blue-200">
          <span className="size-1.5 rounded-full bg-blue-500" />
          สพฐ.
        </span>
      ) : (
        <span className="inline-flex items-center gap-1 rounded-full bg-zinc-50 px-2.5 py-0.5 text-xs font-medium text-zinc-600 ring-1 ring-zinc-200">
          โรงเรียน
        </span>
      )}

      {/* Delete */}
      <button
        type="button"
        onClick={handleDelete}
        disabled={isPending}
        className="rounded p-1 text-zinc-400 hover:bg-rose-50 hover:text-rose-600 disabled:opacity-30"
        aria-label="ลบ"
        title="ลบ (soft delete)"
      >
        <X className="size-4" />
      </button>
    </li>
  );
}
