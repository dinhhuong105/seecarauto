"use client";

import { useState } from "react";
import { Button, Modal, Toast, Tooltip } from "@seecarauto/ui";

/**
 * M00 demo of the shared UI primitives required by UI_UX_STANDARDS.md:
 * add/edit opens a modal, success/failure uses a toast, icon-only buttons
 * have a keyboard-accessible tooltip. Real admin screens arrive in M05–M06.
 */
export function UiDemo() {
  const [modalOpen, setModalOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  return (
    <section
      aria-labelledby="ui-demo"
      className="mt-8 rounded-xl border border-slate-200 p-4"
    >
      <h2 id="ui-demo" className="text-lg font-semibold text-slate-900">
        Demo UI dùng chung (M00)
      </h2>
      <p className="mt-1 text-sm text-slate-600">
        Thêm/sửa mở popup, thông báo dạng toast, icon có tooltip dùng được bằng
        bàn phím.
      </p>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <Button onClick={() => setModalOpen(true)}>Thêm mới (mở modal)</Button>
        <Button
          variant="secondary"
          onClick={() => setToast("Đã lưu thử thành công (demo M00).")}
        >
          Lưu thử (hiện toast)
        </Button>
        <Tooltip label="Xem chi tiết">
          <button
            type="button"
            aria-label="Xem chi tiết"
            className="rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          >
            👁
          </button>
        </Tooltip>
      </div>

      {toast ? (
        <div className="mt-4 max-w-md">
          <Toast kind="success" message={toast} onClose={() => setToast(null)} />
        </div>
      ) : null}

      <Modal
        open={modalOpen}
        title="Thêm mới (demo M00)"
        description="Đây là modal mẫu. Form thật với validation sẽ có ở M05–M06."
        onClose={() => setModalOpen(false)}
      >
        <p className="text-sm text-slate-600">
          Nhấn phím Esc hoặc nút Đóng để đóng modal. Focus được đưa vào modal
          khi mở.
        </p>
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setModalOpen(false)}>
            Hủy
          </Button>
          <Button
            onClick={() => {
              setModalOpen(false);
              setToast("Đã thêm thử thành công (demo M00).");
            }}
          >
            Lưu
          </Button>
        </div>
      </Modal>
    </section>
  );
}
