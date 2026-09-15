import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useLocation } from "wouter";
import { ArrowLeft, HelpCircle, FileText } from "lucide-react";

// Terms & Privacy — always displayed in Spanish (per product decision).
const TERMS_ES = `Break Buddy — Términos de Servicio y Política de Privacidad
Última actualización: 15-Sept-2026
________________________________________
1. Quiénes somos
Break Buddy es un servicio ofrecido por Facilest Apps, con contacto en facilest.apps@gmail.com. Estos términos aplican a cualquier persona que use la aplicación, ya sea en modo individual o como parte de un equipo pago.
2. Qué datos recolectamos
Recolectamos solamente lo necesario para que la aplicación funcione:
•	Nombre: el que elijas al crear tu perfil.
•	Correo electrónico (opcional): solo si lo cargás vos mismo, para poder recuperar el acceso a tu cuenta si perdés la sesión.
•	Datos de uso de la app: registros de tus descansos (hidratación, caminatas, descanso visual) y estadísticas derivadas (rachas, tiempos), usados para mostrarte tu progreso y, si estás en un equipo, el ranking semanal con tus compañeros.
•	Datos de pago: si contratás un plan Equipo o Empresa, el pago se procesa íntegramente por Mercado Pago o Lemon Squeezy — Break Buddy nunca recibe ni almacena números de tarjeta. Solo guardamos el estado de la suscripción (activa, pausada, cancelada) y un identificador de esa suscripción para poder vincularla con tu equipo.
•	Datos técnicos básicos: dirección IP (de forma anónima/hasheada) y navegador, usados únicamente para estadísticas internas de uso y para evitar abuso del servicio.
No recolectamos datos sensibles (salud, biometría, ubicación precisa, etc.), ni vendemos información a terceros con fines publicitarios.
3. Con quién compartimos información
Solo compartimos datos con los proveedores estrictamente necesarios para operar el servicio:
•	Mercado Pago y Lemon Squeezy: procesan los pagos de las suscripciones. Cada uno tiene su propia política de privacidad, que aplica a los datos de pago que les proporciones directamente en sus formularios de checkout.
•	Proveedores de infraestructura (hosting y base de datos): almacenan los datos técnicamente, bajo contrato de confidencialidad, sin acceso propio a su contenido para fines distintos de operar el servicio.
No compartimos tu información con terceros para fines de publicidad o marketing.
4. Cookies y almacenamiento local
Break Buddy usa el almacenamiento local del navegador (localStorage) para recordar tu sesión y tus preferencias de configuración (intervalo de descansos, tipos de pausa activados, idioma). No usamos cookies de rastreo de terceros ni de publicidad.
5. Cuánto tiempo conservamos los datos
Conservamos tu información mientras tu cuenta esté activa. Si querés eliminar tu cuenta y tus datos, escribinos a info.breakbuddy@gmail.com y lo procesamos en un plazo razonable, salvo que la ley nos exija conservar cierta información (por ejemplo, registros de facturación).
6. Tus derechos
De acuerdo a la Ley 25.326 de Argentina, tenés derecho a acceder, rectificar, actualizar o eliminar tus datos personales. Podés ejercer estos derechos escribiendo a info.breakbuddy@gmail.com. La Agencia de Acceso a la Información Pública, en su carácter de Órgano de Control de la Ley 25.326, tiene la atribución de atender denuncias y reclamos que interpongan quienes resulten afectados en sus derechos.
7. Menores de edad
Break Buddy no está dirigido a menores de 18 años. Si sos padre/madre/tutor y creés que un menor a tu cargo nos proporcionó datos personales, contactanos para eliminarlos.
8. Planes pagos, renovación y cancelación
•	Los planes Equipo y Empresa son suscripciones mensuales que se renuevan automáticamente hasta que se cancelen.
•	Podés cancelar en cualquier momento desde el panel de tu proveedor de pago (Mercado Pago o Lemon Squeezy, según cuál hayas usado) o escribiéndonos a info.breakbuddy@gmail.com.
•	Si un pago falla, tu equipo tiene una ventana de 24 horas de gracia antes de que el acceso se pause.
9. Reembolsos
•	Pagos con Mercado Pago: los reembolsos se evalúan caso por caso, escribiendo a info.breakbuddy@gmail.com.
•	Pagos con Lemon Squeezy: Lemon Squeezy actúa como Merchant of Record (el vendedor legal de la transacción), y su propia política de reembolsos aplica a estas compras — podés gestionarlas directamente con ellos o a través nuestro.
10. Cambios a este documento
Podemos actualizar estos términos ocasionalmente. Si hacemos cambios importantes, te avisaremos por correo (si tenés uno cargado) o mediante un aviso visible en la aplicación.
11. Contacto
Para cualquier consulta sobre estos términos o tus datos personales, escribinos a info.breakbuddy@gmail.com`;

export function HelpCenter() {
  const { t } = useTranslation();
  const [, navigate] = useLocation();
  const [tab, setTab] = useState<"faq" | "terms">("faq");

  return (
    <div className="min-h-[100dvh] w-full flex flex-col items-center justify-center p-4 bg-background relative overflow-hidden">
      <div className="w-full max-w-md bg-white p-6 md:p-8 rounded-[2rem] border-2 border-border shadow-sm z-10">
        <div className="flex items-center justify-between mb-5">
          <button
            type="button"
            onClick={() => navigate("/")}
            className="flex items-center gap-2 text-muted-foreground font-bold text-sm hover:text-foreground transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" /> {t("help.back")}
          </button>
        </div>

        <h1 className="text-2xl font-black text-foreground mb-6 flex items-center gap-2">
          <span className="w-10 h-10 bg-primary/20 text-primary rounded-full flex items-center justify-center">
            <HelpCircle className="w-5 h-5" />
          </span>
          {t("help.title")}
        </h1>

        {/* ── Tabs ── */}
        <div className="grid grid-cols-2 gap-1 p-1 rounded-2xl bg-muted mb-6">
          <button
            type="button"
            onClick={() => setTab("faq")}
            className={
              tab === "faq"
                ? "rounded-xl py-2.5 text-sm font-black text-primary bg-white shadow-sm transition-colors cursor-pointer"
                : "rounded-xl py-2.5 text-sm font-bold text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            }
          >
            {t("help.tabFaq")}
          </button>
          <button
            type="button"
            onClick={() => setTab("terms")}
            className={
              tab === "terms"
                ? "rounded-xl py-2.5 text-sm font-black text-secondary bg-white shadow-sm transition-colors cursor-pointer"
                : "rounded-xl py-2.5 text-sm font-bold text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            }
          >
            {t("help.tabTerms")}
          </button>
        </div>

        {/* ── FAQ ── */}
        {tab === "faq" && (
          <div className="flex flex-col gap-4">
            <p className="text-sm text-muted-foreground font-bold uppercase tracking-wide">{t("help.faqTitle")}</p>
            {[0, 1, 2, 3, 4].map((i) => (
              <div key={i} className="rounded-2xl border-2 border-border bg-background px-4 py-3">
                <p className="font-black text-foreground text-sm mb-1">{t(`help.faq.${i}.q`)}</p>
                <p className="text-muted-foreground font-medium text-sm leading-relaxed">{t(`help.faq.${i}.a`)}</p>
              </div>
            ))}
          </div>
        )}

        {/* ── Términos ── */}
        {tab === "terms" && (
          <div className="flex flex-col gap-3">
            <p className="text-xs text-muted-foreground font-medium rounded-xl bg-primary/5 border border-primary/20 px-3 py-2 leading-relaxed">
              {t("help.termsNote")}
            </p>
            <div className="flex items-center gap-2 text-sm font-black text-foreground">
              <FileText className="w-4 h-4 text-primary" />
              {t("help.tabTerms")}
            </div>
            <div className="text-sm text-foreground font-medium leading-relaxed whitespace-pre-line">
              {TERMS_ES}
            </div>
          </div>
        )}
      </div>

      <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] bg-primary/10 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[70%] h-[70%] bg-secondary/10 rounded-full blur-[100px] pointer-events-none" />
    </div>
  );
}

export default HelpCenter;