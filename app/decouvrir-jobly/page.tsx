import Link from "next/link";

export default function DecouvrirJoblyPage() {
  return (
    <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 24, background: "#f8fafc" }}>
      <section style={{ maxWidth: 720, width: "100%", background: "#fff", borderRadius: 24, padding: 40, boxShadow: "0 18px 60px rgba(15,23,42,.10)" }}>
        <div style={{ fontSize: 14, fontWeight: 700, letterSpacing: ".08em", color: "#22448B", textTransform: "uppercase" }}>Jobly</div>
        <h1 style={{ margin: "10px 0 12px", fontSize: 36, color: "#0f172a" }}>Cette candidature a été préparée avec Jobly.</h1>
        <p style={{ margin: 0, fontSize: 18, lineHeight: 1.6, color: "#475569" }}>
          Jobly est le Career OS qui aide les talents à préparer, personnaliser et suivre leurs candidatures tout en gardant la décision finale entre leurs mains.
        </p>
        <div style={{ marginTop: 28, display: "flex", gap: 12, flexWrap: "wrap" }}>
          <Link href="/" style={{ display: "inline-block", padding: "13px 20px", borderRadius: 12, background: "#22448B", color: "#fff", textDecoration: "none", fontWeight: 700 }}>
            Découvrir Jobly →
          </Link>
        </div>
      </section>
    </main>
  );
}
