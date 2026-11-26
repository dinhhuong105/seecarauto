import { UiDemo } from "@/components/UiDemo";
import { CONTACT_PHONE, SITE_NAME } from "@seecarauto/shared";

/**
 * M00 placeholder admin dashboard. Real modules (products, orders,
 * fitment, dynamic RBAC) arrive in M05–M06.
 */
export default function AdminHome() {
  const modules = [
    { name: "Sản phẩm", status: "Chưa có — M03" },
    { name: "Đơn hàng", status: "Chưa có — M05" },
    { name: "Tương thích xe (Fitment)", status: "Chưa có — M04" },
    { name: "Phân quyền động RBAC", status: "Chưa có — M06" },
    { name: "CMS + AI SEO", status: "Chưa có — M07" },
  ];

  return (
    <main className="mx-auto min-h-screen max-w-5xl px-4 py-12">
      <header>
        <p className="text-sm font-semibold uppercase tracking-wide text-blue-700">
          SeeCar Auto — Admin
        </p>
        <h1 className="mt-2 text-3xl font-bold text-slate-900">
          Trang quản trị {SITE_NAME}
        </h1>
        <p className="mt-3 max-w-2xl text-slate-600">
          Khung nền M00 đã dựng xong. Các module quản trị sẽ được xây ở các
          milestone tiếp theo. Liên hệ: SĐT/Zalo {CONTACT_PHONE}.
        </p>
      </header>

      <section aria-labelledby="modules" className="mt-8">
        <h2 id="modules" className="text-xl font-semibold text-slate-900">
          Module quản trị
        </h2>
        <ul className="mt-4 grid gap-3 sm:grid-cols-2">
          {modules.map((mod) => (
            <li
              key={mod.name}
              className="rounded-xl border border-slate-200 p-4 shadow-sm"
            >
              <p className="font-medium text-slate-900">{mod.name}</p>
              <p className="mt-1 text-sm text-slate-500">{mod.status}</p>
            </li>
          ))}
        </ul>
      </section>

      <UiDemo />
    </main>
  );
}
