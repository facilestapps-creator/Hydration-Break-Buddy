/**
 * MPCardForm — PCI-compliant card form using Mercado Pago Secure Fields.
 *
 * The card number, expiry date, and CVV are captured inside MP-hosted iframes
 * (Secure Fields). The raw card data never reaches our servers.  On submit,
 * MP.js returns a one-time card_token_id that we pass to our backend.
 */
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Loader2, Lock } from "lucide-react";
import { Button } from "./Button";
import { cn } from "@/lib/utils";

// ── MP SDK types (injected by the CDN script) ─────────────────────────────
declare global {
  interface Window {
    MercadoPago: new (
      publicKey: string,
      options?: { locale?: string }
    ) => MPInstance;
  }
}

interface MPInstance {
  fields: {
    create(
      type: "cardNumber" | "expirationDate" | "securityCode",
      options: { placeholder?: string; style?: Record<string, string> }
    ): MPField;
  };
}

interface MPField {
  mount(elementId: string): void;
  unmount(): void;
  createCardToken(params: {
    cardholderName: string;
    identificationType?: string;
    identificationNumber?: string;
  }): Promise<{ id: string }>;
}

// ── Component ─────────────────────────────────────────────────────────────

interface MPCardFormProps {
  publicKey: string;          // MP public key, fetched from /api/config
  plan: "team" | "company";
  onTokenize: (cardTokenId: string, payerEmail: string) => void;
  isLoading: boolean;         // true while parent's createPayment mutation is in flight
}

const MP_FIELD_STYLE: Record<string, string> = {
  fontFamily: "Inter, system-ui, sans-serif",
  fontSize: "15px",
  fontWeight: "700",
  color: "#111827",
  placeholderColor: "#9ca3af",
};

const SECURE_FIELD_BASE =
  "w-full h-[52px] px-4 rounded-2xl border-2 border-border bg-background flex items-center";

export function MPCardForm({ publicKey, plan, onTokenize, isLoading }: MPCardFormProps) {
  const { t } = useTranslation();
  const [sdkState, setSdkState] = useState<"waiting" | "loading" | "ready" | "error">(
    publicKey ? "loading" : "waiting"
  );
  const [email, setEmail] = useState("");
  const [cardholderName, setCardholderName] = useState("");
  const [dniNumber, setDniNumber] = useState("");
  const [formError, setFormError] = useState("");
  const [tokenizing, setTokenizing] = useState(false);

  const cardFieldRef = useRef<MPField | null>(null);
  const expiryFieldRef = useRef<MPField | null>(null);
  const cvcFieldRef = useRef<MPField | null>(null);

  // ── Load MP.js and mount Secure Fields ──────────────────────────────────
  useEffect(() => {
    if (!publicKey) {
      setSdkState("waiting");
      return;
    }
    setSdkState("loading");

    const SCRIPT_ID = "mercadopago-sdk-v2";

    const initFields = () => {
      try {
        const mp = new window.MercadoPago(publicKey, { locale: "es-AR" });

        const cardNumber = mp.fields.create("cardNumber", {
          placeholder: t("onboarding.payment.cardNumberPlaceholder"),
          style: MP_FIELD_STYLE,
        });
        const expiration = mp.fields.create("expirationDate", {
          placeholder: "MM/YY",
          style: MP_FIELD_STYLE,
        });
        const cvc = mp.fields.create("securityCode", {
          placeholder: "CVV",
          style: MP_FIELD_STYLE,
        });

        cardNumber.mount("mp-card-number");
        expiration.mount("mp-expiration-date");
        cvc.mount("mp-security-code");

        cardFieldRef.current = cardNumber;
        expiryFieldRef.current = expiration;
        cvcFieldRef.current = cvc;

        setSdkState("ready");
      } catch (err) {
        console.error("[MPCardForm] SDK init error:", err);
        setSdkState("error");
      }
    };

    if (typeof window.MercadoPago !== "undefined") {
      // SDK already loaded (component re-mounted after prior visit)
      initFields();
      return;
    }

    if (document.getElementById(SCRIPT_ID)) {
      // Script tag injected by a previous mount but not yet evaluated
      document.getElementById(SCRIPT_ID)!.addEventListener("load", initFields, { once: true });
      document.getElementById(SCRIPT_ID)!.addEventListener("error", () => setSdkState("error"), { once: true });
      return;
    }

    const script = document.createElement("script");
    script.id = SCRIPT_ID;
    script.src = "https://sdk.mercadopago.com/js/v2";
    script.onload = initFields;
    script.onerror = () => setSdkState("error");
    document.head.appendChild(script);

    return () => {
      cardFieldRef.current?.unmount();
      expiryFieldRef.current?.unmount();
      cvcFieldRef.current?.unmount();
      cardFieldRef.current = null;
      expiryFieldRef.current = null;
      cvcFieldRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [publicKey]);

  // ── Form submit ──────────────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cardFieldRef.current || sdkState !== "ready" || isLoading || tokenizing) return;
    setFormError("");

    if (!email.trim() || !email.includes("@")) {
      setFormError(t("onboarding.payment.emailError"));
      return;
    }
    if (!cardholderName.trim()) {
      setFormError(t("onboarding.payment.nameError"));
      return;
    }

    setTokenizing(true);
    try {
      const token = await cardFieldRef.current.createCardToken({
        cardholderName: cardholderName.trim().toUpperCase(),
        ...(dniNumber.trim()
          ? { identificationType: "DNI", identificationNumber: dniNumber.trim() }
          : {}),
      });
      onTokenize(token.id, email.trim());
    } catch (err: unknown) {
      console.error("[MPCardForm] createCardToken failed:", err);
      const raw = err instanceof Error ? err.message : String(err);
      // MP returns structured error messages — extract something readable
      setFormError(t("onboarding.payment.tokenError") + (raw ? ` (${raw})` : ""));
    } finally {
      setTokenizing(false);
    }
  };

  const accent = plan === "company"
    ? "focus:border-secondary focus:ring-secondary/20"
    : "focus:border-primary focus:ring-primary/20";

  const isPrimary = plan !== "company";

  if (sdkState === "error") {
    return (
      <p className="text-destructive text-sm font-bold text-center py-4">
        {t("onboarding.payment.sdkError")}
      </p>
    );
  }

  const showLoading = sdkState === "waiting" || sdkState === "loading";

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {showLoading && (
        <div className="flex items-center justify-center gap-2 py-6 text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span className="text-sm font-medium">{t("onboarding.payment.sdkLoading")}</span>
        </div>
      )}

      <div className={cn(
        "flex flex-col gap-4 transition-opacity duration-200",
        showLoading ? "opacity-0 pointer-events-none select-none" : "opacity-100"
      )}>
        {/* Email */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-black text-muted-foreground uppercase tracking-wide">
            {t("onboarding.payment.email")}
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="tu@email.com"
            className={cn(
              "w-full px-4 py-3.5 rounded-2xl border-2 border-border bg-background",
              "text-foreground font-bold focus:outline-none focus:ring-4 transition-all",
              accent
            )}
            autoComplete="email"
          />
        </div>

        {/* Cardholder name */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-black text-muted-foreground uppercase tracking-wide">
            {t("onboarding.payment.cardName")}
          </label>
          <input
            type="text"
            value={cardholderName}
            onChange={(e) => setCardholderName(e.target.value)}
            placeholder="NOMBRE APELLIDO"
            className={cn(
              "w-full px-4 py-3.5 rounded-2xl border-2 border-border bg-background",
              "text-foreground font-bold focus:outline-none focus:ring-4 transition-all uppercase",
              accent
            )}
            autoComplete="cc-name"
          />
        </div>

        {/* Card number — MP Secure Field */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-black text-muted-foreground uppercase tracking-wide">
            {t("onboarding.payment.cardNumber")}
          </label>
          <div id="mp-card-number" className={SECURE_FIELD_BASE} />
        </div>

        {/* Expiry + CVV — MP Secure Fields */}
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-black text-muted-foreground uppercase tracking-wide">
              {t("onboarding.payment.expiry")}
            </label>
            <div id="mp-expiration-date" className={SECURE_FIELD_BASE} />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-black text-muted-foreground uppercase tracking-wide">
              CVV
            </label>
            <div id="mp-security-code" className={SECURE_FIELD_BASE} />
          </div>
        </div>

        {/* DNI — required by MP for card tokenization in Argentina */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-black text-muted-foreground uppercase tracking-wide">
            DNI
          </label>
          <input
            type="text"
            inputMode="numeric"
            value={dniNumber}
            onChange={(e) => setDniNumber(e.target.value.replace(/\D/g, ""))}
            placeholder="12345678"
            maxLength={9}
            className={cn(
              "w-full px-4 py-3.5 rounded-2xl border-2 border-border bg-background",
              "text-foreground font-bold focus:outline-none focus:ring-4 transition-all",
              accent
            )}
          />
        </div>
      </div>

      {formError && (
        <p className="text-destructive text-sm font-bold text-center">{formError}</p>
      )}

      <Button
        type="submit"
        variant={isPrimary ? "primary" : "secondary"}
        size="lg"
        className="w-full mt-1"
        disabled={showLoading || isLoading || tokenizing}
      >
        {(isLoading || tokenizing) ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            {t("onboarding.payment.loading")}
          </>
        ) : (
          t("onboarding.payment.button")
        )}
      </Button>

      {/* Security badge */}
      <div className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground font-medium">
        <Lock className="w-3 h-3 shrink-0" />
        {t("onboarding.payment.secureNote")}
      </div>
    </form>
  );
}
