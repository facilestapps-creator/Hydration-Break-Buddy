import { Router, type IRouter } from "express";
import { sendEmail } from "../lib/mailer";
import { feedbackLimiter } from "../lib/rate-limiters";

const router: IRouter = Router();

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

router.post("/feedback", feedbackLimiter, async (req, res) => {
  const { message } = req.body as { message?: string };

  if (!message || !message.trim()) {
    res.status(400).json({ error: "message is required" });
    return;
  }

  try {
    await sendEmail({
      to: "info.breakbuddy@gmail.com",
      subject: "Nuevo feedback de usuario",
      text: message.trim(),
      html: `<p style="font-family:sans-serif;font-size:14px;color:#333;">${escapeHtml(message.trim()).replace(/\n/g, "<br>")}</p>`,
    });

    res.status(200).json({ ok: true });
  } catch (err) {
    console.error("[feedback] Error sending email:", err);
    res.status(500).json({ error: "Failed to send feedback" });
  }
});

export default router;
