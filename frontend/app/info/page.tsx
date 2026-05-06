import Link from "next/link";

const THREAT_TYPES = [
  {
    name: "Phishing (SMS / WhatsApp)",
    share: "45%",
    description:
      "Te envían un mensaje haciéndose pasar por tu banco con un link falso. Es el fraude más común en Chile.",
    example: '"Tu cuenta BCI fue bloqueada. Verifica en bci-cl-seguridad.net"',
  },
  {
    name: "Smishing",
    share: "Top 5 LATAM",
    description:
      "Phishing por SMS. Chile es uno de los países más afectados de América Latina.",
    example: '"[BancoEstado] Actividad inusual detectada. Confirma tus datos: bit.ly/3xFk..."',
  },
  {
    name: "Vishing",
    share: "Creciendo",
    description:
      "Llamadas telefónicas donde alguien se hace pasar por un ejecutivo de tu banco para pedirte datos.",
    example: '"Le habla el área de seguridad del Santander, necesitamos confirmar su RUT y clave"',
  },
  {
    name: "Suplantación de identidad",
    share: "Severo",
    description:
      "Usan tus datos filtrados para abrir créditos o cuentas a tu nombre.",
    example: "Correo notificando un crédito aprobado que tú nunca pediste.",
  },
];

const STEPS_IF_VICTIM = [
  { step: "1", action: "No hagas clic en ningún link del mensaje ni ingreses datos." },
  { step: "2", action: "Llama directamente al número oficial de tu banco (el del reverso de tu tarjeta)." },
  { step: "3", action: "Cambia tu contraseña desde la app oficial del banco." },
  { step: "4", action: "Denuncia en CSIRT Chile: csirt.gob.cl o llama al 1337." },
  { step: "5", action: "Denuncia en PDI Cibercrimen: cibercrimen.pdichile.cl" },
  { step: "6", action: "Reporta el número/email al banco directamente para que lo bloqueen." },
];

export default function InfoPage() {
  return (
    <main className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-2xl mx-auto space-y-10">
        <header>
          <Link href="/" className="text-sm text-blue-600 hover:underline">
            ← Volver al detector
          </Link>
          <h1 className="text-2xl font-bold text-gray-900 mt-3">¿Qué es el phishing bancario?</h1>
          <p className="text-sm text-gray-500 mt-1">
            En Chile ocurren más de 800.000 intentos de fraude digital al año. El 70% de las víctimas no denuncia.
          </p>
        </header>

        <section>
          <h2 className="text-base font-semibold text-gray-800 mb-4">Tipos de estafa más comunes</h2>
          <div className="space-y-3">
            {THREAT_TYPES.map((t) => (
              <div key={t.name} className="bg-white rounded-xl border border-gray-200 p-4">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-semibold text-gray-800">{t.name}</span>
                  <span className="text-xs font-medium bg-red-100 text-red-700 px-2 py-0.5 rounded-full">
                    {t.share} de fraudes
                  </span>
                </div>
                <p className="text-sm text-gray-600 mb-2">{t.description}</p>
                <div className="bg-gray-50 rounded-lg px-3 py-2 text-xs text-gray-500 italic">
                  Ejemplo: {t.example}
                </div>
              </div>
            ))}
          </div>
        </section>

        <section>
          <h2 className="text-base font-semibold text-gray-800 mb-4">¿Caíste en una estafa? Haz esto ahora</h2>
          <div className="space-y-2">
            {STEPS_IF_VICTIM.map((s) => (
              <div key={s.step} className="flex gap-3 items-start">
                <span className="shrink-0 w-6 h-6 rounded-full bg-blue-100 text-blue-700 text-xs font-bold flex items-center justify-center mt-0.5">
                  {s.step}
                </span>
                <p className="text-sm text-gray-700">{s.action}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="text-base font-semibold text-gray-800 mb-3">Marco legal en Chile</h2>
          <div className="space-y-3 text-sm text-gray-600">
            <div>
              <span className="font-medium text-gray-800">Ley 21.459 — Delitos Informáticos</span>
              <p className="mt-0.5">
                Vigente desde junio 2022. El phishing, la suplantación de identidad digital y el fraude informático son delitos penales en Chile.
              </p>
            </div>
            <div>
              <span className="font-medium text-gray-800">Ley 21.663 — ANCI (Ciberseguridad)</span>
              <p className="mt-0.5">
                Los bancos y fintec están obligados a reportar incidentes al CSIRT Nacional. Si tu banco tardó en informarte de una brecha, puede haber infringido esta ley.
              </p>
            </div>
          </div>
        </section>

        <section>
          <h2 className="text-base font-semibold text-gray-800 mb-3">Dónde denunciar</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              { name: "CSIRT Chile", url: "https://csirt.gob.cl", desc: "Reporte de incidentes cibernéticos" },
              { name: "PDI Cibercrimen", url: "https://cibercrimen.pdichile.cl", desc: "Denuncia policial digital" },
              { name: "CMF Alertas", url: "https://www.cmfchile.cl/portal/principal/613/w3-propertyvalue-43545.html", desc: "Entidades no autorizadas" },
            ].map((link) => (
              <a
                key={link.name}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="block bg-white rounded-xl border border-gray-200 p-4 hover:border-blue-300 transition-colors"
              >
                <p className="text-sm font-semibold text-blue-600">{link.name} ↗</p>
                <p className="text-xs text-gray-500 mt-1">{link.desc}</p>
              </a>
            ))}
          </div>
        </section>

        <footer className="text-center text-xs text-gray-400 pb-4">
          ImpactLab · Información basada en datos CSIRT Chile, CMF y Ley 21.459
        </footer>
      </div>
    </main>
  );
}
