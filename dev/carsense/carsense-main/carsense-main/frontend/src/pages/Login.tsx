// frontend/src/pages/Login.tsx
import { useState } from "react";
import { login, register } from "../api/auth";

export default function Login({ onOk }: { onOk: () => void }) {
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  const doLogin = async () => {
    setMsg("");
    setBusy(true);
    try {
      await login(email.trim(), pass);
      onOk();
    } catch (e: any) {
      setMsg(e?.message || "Error al iniciar sesión");
    } finally {
      setBusy(false);
    }
  };

  const doRegister = async () => {
    setMsg("");
    try {
      await register(email.trim(), pass);
    } catch (e: any) {
      setMsg(e?.message || "El registro no está disponible");
    }
  };

  return (
    <div className="login-bg">
      {/* blobs decorativos */}
      <div className="blob b1" />
      <div className="blob b2" />
      <div className="blob b3" />

      <div className="login-card">
        <div className="login-header">
          <div className="logo-circle">🚗</div>
          <div>
            <div className="login-brand">Your logo</div>
            <h1 className="login-title">Login</h1>
          </div>
        </div>

        <label className="login-label">Email</label>
        <input
          className="login-input"
          placeholder="username@gmail.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
        />

        <label className="login-label">Password</label>
        <input
          className="login-input"
          type="password"
          placeholder="Password"
          value={pass}
          onChange={(e) => setPass(e.target.value)}
          autoComplete="current-password"
        />

        <div className="login-row">
          <button type="button" className="link">Forgot password?</button>
        </div>

        <button
          className="btn btn-primary"
          onClick={doLogin}
          disabled={busy || !email || !pass}
        >
          {busy ? "Signing in…" : "Sign in"}
        </button>

        <div className="sep">
          <span>or continue with</span>
        </div>

        <div className="socials">
          <button className="btn btn-social" title="Google">G</button>
          <button className="btn btn-social" title="Apple"></button>
        </div>

        {msg && <div className="login-error">{msg}</div>}

        <div className="login-foot">
          Don’t have an account?{" "}
          <button type="button" className="link" onClick={doRegister}>
            Register for free
          </button>
        </div>
      </div>
    </div>
  );
}
