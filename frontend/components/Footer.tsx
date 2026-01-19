export default function Footer() {
  return (
    <footer
      style={{
        marginTop: 40,
        padding: 16,
        fontSize: 12,
        color: "#888",
        textAlign: "center",
        borderTop: "1px solid #eee",
      }}
    >
      <div>Emotion AI</div>
      <div style={{ marginTop: 8 }}>
        <a href="/privacy">개인정보처리방침</a> ·{" "}
        <a href="/terms">이용약관</a>
      </div>
      <div style={{ marginTop: 8 }}>문의: injoo.mun@jkax.co.kr</div>
    </footer>
  );
}
