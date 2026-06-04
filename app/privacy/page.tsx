import Link from "next/link";
import { getLocale } from "@/lib/i18n/server";

export const metadata = { title: "Privacy Policy — MealMate AI" };

const CONTENT = {
  vi: {
    title: "Chính sách bảo mật",
    updated: "Cập nhật: 06/2026",
    back: "Về trang chủ",
    sections: [
      {
        h: "Thông tin chúng tôi thu thập",
        p: "Email, tên hiển thị, ảnh đại diện, khẩu vị, nguyên liệu bạn xác nhận, các món đã xem / lưu / đánh giá, lịch sử quét và thông tin giao dịch (số tiền + nội dung chuyển khoản).",
      },
      {
        h: "Ảnh tủ lạnh KHÔNG được lưu",
        p: "Ảnh bạn chụp để nhận diện nguyên liệu chỉ được xử lý tức thời rồi bỏ đi — chúng tôi không lưu trữ. Chỉ ảnh món bạn CHỦ ĐỘNG chia sẻ lên Cộng đồng và ảnh đại diện của bạn mới được lưu.",
      },
      {
        h: "Bên thứ ba",
        p: "Chúng tôi dùng: OpenAI (nhận diện nguyên liệu & gợi ý món), Supabase (cơ sở dữ liệu / đăng nhập / lưu trữ), Pexels & YouTube (ảnh minh hoạ món), Cloudflare Turnstile (chống bot), Upstash (giới hạn truy cập) và MoMo (thanh toán).",
      },
      {
        h: "Mục đích sử dụng",
        p: "Để gợi ý món, cá nhân hoá trải nghiệm, xử lý thanh toán và cải thiện sản phẩm. Chúng tôi KHÔNG bán dữ liệu của bạn.",
      },
      {
        h: "Xoá dữ liệu",
        p: "Bạn có thể xoá tài khoản bất cứ lúc nào trong Cài đặt → Tài khoản. Toàn bộ dữ liệu liên quan sẽ bị xoá vĩnh viễn.",
      },
      {
        h: "Liên hệ",
        p: "Mọi thắc mắc về quyền riêng tư, vui lòng liên hệ: hotro@mealmateai.vn.",
      },
    ],
  },
  en: {
    title: "Privacy Policy",
    updated: "Updated: 06/2026",
    back: "Back to home",
    sections: [
      {
        h: "What we collect",
        p: "Your email, display name, avatar, taste preferences, the ingredients you confirm, the dishes you view / save / rate, your scan history, and payment records (transfer amount + note).",
      },
      {
        h: "Fridge photos are NOT stored",
        p: "Photos you take for ingredient recognition are processed in the moment and discarded — we do not store them. Only the dish photos you explicitly share to the Community and your avatar are stored.",
      },
      {
        h: "Third parties",
        p: "We use: OpenAI (ingredient recognition & dish suggestions), Supabase (database / auth / storage), Pexels & YouTube (illustrative dish photos), Cloudflare Turnstile (bot protection), Upstash (rate limiting), and MoMo (payments).",
      },
      {
        h: "How we use it",
        p: "To suggest dishes, personalize your experience, process payments and improve the product. We do NOT sell your data.",
      },
      {
        h: "Deleting your data",
        p: "You can delete your account at any time under Settings → Account. All associated data is permanently removed.",
      },
      {
        h: "Contact",
        p: "For any privacy questions, contact: hotro@mealmateai.vn.",
      },
    ],
  },
};

export default async function PrivacyPage() {
  const locale = await getLocale();
  const c = CONTENT[locale];

  return (
    <div className="min-h-screen bg-[#fcfaf6]">
      <main className="mx-auto w-full max-w-2xl p-6 lg:p-10">
        <Link href="/" className="text-sm font-medium text-muted-foreground transition hover:text-foreground">
          ← {c.back}
        </Link>
        <h1 className="mt-4 text-2xl font-bold tracking-tight">{c.title}</h1>
        <p className="mt-1 text-xs text-muted-foreground">{c.updated}</p>
        <div className="mt-6 flex flex-col gap-5">
          {c.sections.map((s) => (
            <section key={s.h} className="flex flex-col gap-1.5">
              <h2 className="font-semibold">{s.h}</h2>
              <p className="text-sm leading-relaxed text-muted-foreground">{s.p}</p>
            </section>
          ))}
        </div>
      </main>
    </div>
  );
}
