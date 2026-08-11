import { Component } from "react";

const errorStyles = `
  .app-error {
    min-height: 100vh;
    display: grid;
    place-items: center;
    padding: 24px;
    background:
      radial-gradient(circle at 50% 22%, rgba(34, 211, 238, .12), transparent 30%),
      linear-gradient(145deg, #07192b, #020812 64%);
    color: #edf7fb;
    font-family: Inter, ui-sans-serif, system-ui, sans-serif;
  }
  .app-error__panel {
    width: min(100%, 680px);
    padding: clamp(32px, 7vw, 68px);
    border: 1px solid rgba(126, 211, 255, .18);
    background: rgba(4, 14, 25, .9);
    box-shadow: 0 32px 80px rgba(0, 0, 0, .38);
    text-align: center;
  }
  .app-error__logo {
    width: 104px;
    height: 104px;
    object-fit: contain;
  }
  .app-error__label {
    display: block;
    margin-top: 22px;
    color: #22d3ee;
    font-size: 11px;
    font-weight: 800;
    letter-spacing: .2em;
  }
  .app-error h1 {
    margin: 13px 0 0;
    font-size: clamp(34px, 7vw, 58px);
    line-height: .96;
    text-transform: uppercase;
  }
  .app-error p {
    max-width: 48ch;
    margin: 20px auto 0;
    color: #91a6b2;
    line-height: 1.7;
  }
  .app-error button {
    min-height: 48px;
    margin-top: 28px;
    padding: 0 24px;
    border: 0;
    background: #22d3ee;
    color: #02101a;
    font: inherit;
    font-size: 13px;
    font-weight: 800;
    letter-spacing: .08em;
    text-transform: uppercase;
    cursor: pointer;
  }
  .app-error button:focus-visible {
    outline: 3px solid #fff;
    outline-offset: 4px;
  }
`;

export class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError:false };
  }

  static getDerivedStateFromError() {
    return { hasError:true };
  }

  componentDidCatch(error, info) {
    console.error("[app-error]", error, info);
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <>
        <style>{errorStyles}</style>
        <main className="app-error">
          <section className="app-error__panel" aria-labelledby="app-error-title">
            <img className="app-error__logo" src="/logo-ui.png" alt="ALTAIR eSports logosu" width="104" height="104"/>
            <span className="app-error__label">ALTAIR · SİSTEM</span>
            <h1 id="app-error-title">Bir şeyler ters gitti.</h1>
            <p>Sayfa yüklenirken beklenmeyen bir sorun oluştu. Kayıtlı verileriniz etkilenmedi; sayfayı yenileyerek tekrar deneyebilirsiniz.</p>
            <button type="button" onClick={() => window.location.reload()}>Sayfayı yenile</button>
          </section>
        </main>
      </>
    );
  }
}
