import Link from "next/link";
import { Button } from "@seecarauto/ui";
import {
  CONTACT_PHONE,
  PUBLIC_ROUTES,
  SITE_NAME,
  SITE_TAGLINE,
  productUrl,
} from "@seecarauto/shared";

/**
 * M00 placeholder homepage. Real catalogue / search / fitment pages arrive
 * in M03–M04. All links below already use the approved English URL scheme.
 */
export default function Home() {
  const exampleParts = [
    { name: "Bơm nước Aisin", slug: "water-pump-aisin" },
    { name: "Má phanh", slug: "brake-pad" },
    { name: "Lọc dầu động cơ", slug: "engine-oil-filter" },
  ];

  return (
    <main className="mx-auto min-h-screen max-w-5xl px-4 py-12">
      <header className="mb-10">
        <p className="text-sm font-semibold uppercase tracking-wide text-blue-700">
          SeeCar Auto
        </p>
        <h1 className="mt-2 text-3xl font-bold text-slate-900 sm:text-4xl">
          {SITE_TAGLINE}
        </h1>
        <p className="mt-3 max-w-2xl text-slate-600">
          Website bán phụ tùng ô tô cho {SITE_NAME}. Khung nền M00 đã dựng
          xong — danh mục sản phẩm, tra cứu theo xe và giỏ hàng sẽ được xây ở
          các milestone tiếp theo (M03–M05).
        </p>
        <p className="mt-3 text-sm text-slate-600">
          Liên hệ: SĐT/Zalo{" "}
          <a
            className="font-semibold text-blue-700 underline"
            href={`tel:${CONTACT_PHONE}`}
          >
            {CONTACT_PHONE}
          </a>
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link href={PUBLIC_ROUTES.parts}>
            <Button>Xem phụ tùng</Button>
          </Link>
          <Link href={PUBLIC_ROUTES.contact}>
            <Button variant="secondary">Liên hệ</Button>
          </Link>
        </div>
      </header>

      <section aria-labelledby="example-parts">
        <h2 id="example-parts" className="text-xl font-semibold text-slate-900">
          Ví dụ đường dẫn sản phẩm (tiếng Anh, chuẩn SEO)
        </h2>
        <ul className="mt-4 grid gap-3 sm:grid-cols-3">
          {exampleParts.map((part) => (
            <li
              key={part.slug}
              className="rounded-xl border border-slate-200 p-4 shadow-sm"
            >
              <p className="font-medium text-slate-900">{part.name}</p>
              <Link
                href={productUrl(part.slug)}
                className="mt-1 block break-all text-sm text-blue-700 underline"
              >
                {productUrl(part.slug)}
              </Link>
            </li>
          ))}
        </ul>
        <p className="mt-4 text-sm text-slate-500">
          Trạng thái: M00 Project Foundation — chưa có dữ liệu sản phẩm thật.
        </p>
      </section>
    </main>
  );
}
