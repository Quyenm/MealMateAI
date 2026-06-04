import Link from "next/link";
import { getLocale } from "@/lib/i18n/server";

export const metadata = { title: "Terms of Service — MealMate AI" };

const CONTENT = {
  vi: {
    title: "Điều khoản sử dụng",
    updated: "Cập nhật: 06/2026",
    back: "Về trang chủ",
    sections: [
      {
        h: "Dịch vụ",
        p: "MealMate AI là ứng dụng gợi ý món ăn từ ảnh nguyên liệu. Bạn dùng dịch vụ đồng nghĩa với việc đồng ý các điều khoản này.",
      },
      {
        h: "Tài khoản",
        p: "Bạn chịu trách nhiệm về tài khoản và hoạt động của mình. Mỗi người dùng một tài khoản. Vui lòng giữ mật khẩu an toàn.",
      },
      {
        h: "Gợi ý mang tính tham khảo",
        p: "Các gợi ý món và ước lượng dinh dưỡng do AI tạo ra, KHÔNG phải tư vấn y tế hay dinh dưỡng chuyên môn. Bạn tự kiểm tra nguyên liệu gây dị ứng và độ phù hợp trước khi nấu/ăn.",
      },
      {
        h: "Nội dung cộng đồng",
        p: "Khi đăng ảnh lên Cộng đồng, bạn cam kết nội dung là của bạn và không vi phạm pháp luật. Chúng tôi có quyền ẩn/xoá nội dung vi phạm.",
      },
      {
        h: "Gói trả phí & thanh toán",
        p: "Các gói VIP/SVIP/Family được kích hoạt sau khi chúng tôi xác nhận chuyển khoản qua MoMo. Mỗi gói có hạn mức quét/ngày riêng. Hoàn tiền: liên hệ hỗ trợ trong 7 ngày nếu có sai sót.",
      },
      {
        h: "Giới hạn trách nhiệm",
        p: "Dịch vụ được cung cấp 'như hiện có'. Chúng tôi không chịu trách nhiệm cho thiệt hại phát sinh từ việc sử dụng gợi ý của ứng dụng.",
      },
      {
        h: "Thay đổi điều khoản & liên hệ",
        p: "Điều khoản có thể được cập nhật. Mọi thắc mắc: hotro@mealmateai.vn. Áp dụng theo pháp luật Việt Nam.",
      },
    ],
  },
  en: {
    title: "Terms of Service",
    updated: "Updated: 06/2026",
    back: "Back to home",
    sections: [
      {
        h: "The service",
        p: "MealMate AI suggests dishes from a photo of your ingredients. By using the service you agree to these terms.",
      },
      {
        h: "Your account",
        p: "You are responsible for your account and its activity. One account per person. Keep your password safe.",
      },
      {
        h: "Suggestions are guidance only",
        p: "Dish suggestions and nutrition estimates are AI-generated and are NOT professional medical or dietary advice. Always check ingredients for allergens and suitability before cooking/eating.",
      },
      {
        h: "Community content",
        p: "When posting to the Community you confirm the content is yours and lawful. We may hide or remove content that violates these terms.",
      },
      {
        h: "Paid plans & payment",
        p: "VIP/SVIP/Family plans are activated after we verify your MoMo transfer. Each plan has its own daily scan limit. Refunds: contact support within 7 days if something went wrong.",
      },
      {
        h: "Limitation of liability",
        p: "The service is provided 'as is'. We are not liable for damages arising from your use of the app's suggestions.",
      },
      {
        h: "Changes & contact",
        p: "These terms may be updated. Questions: hotro@mealmateai.vn. Governed by the laws of Vietnam.",
      },
    ],
  },
};

export default async function TermsPage() {
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
