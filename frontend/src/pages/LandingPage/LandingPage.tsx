import React, { useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import "./LandingPage.scss";

const LandingPage: React.FC = () => {
  const bgVantaRef = useRef<HTMLDivElement | null>(null); // full-screen subtle background

  useEffect(() => {
    // Initialize Vanta animated background when the script is available
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const anyWindow = window as any;
    let bgEffect: any;

    const init = () => {
      // Initialize subtle full-screen background if available
      if (bgVantaRef.current && anyWindow?.VANTA?.NET) {
        const css = getComputedStyle(document.documentElement);
        const primary = css.getPropertyValue("--color-primary").trim() || "#6366f1";
        bgEffect = anyWindow.VANTA.NET({
          el: bgVantaRef.current,
          mouseControls: true,
          touchControls: true,
          gyroControls: false,
          minHeight: 200.0,
          minWidth: 200.0,
          scale: 1.0,
          scaleMobile: 1.0,
          color: primary,
          backgroundColor: css.getPropertyValue("--color-background").trim() || "#f4f4f6",
          points: 7.0,
          maxDistance: 18.0,
          spacing: 16.0,
        });
      }
      return true;
    };

    // Try immediately, then retry shortly if scripts not yet available
    let inited = init();
    const retryId = inited
      ? 0
      : window.setTimeout(() => {
          inited = init();
        }, 500);

    const onLoad = () => {
      if (!inited) init();
    };
    window.addEventListener("load", onLoad);

    return () => {
      if (retryId) window.clearTimeout(retryId);
      window.removeEventListener("load", onLoad);
      if (bgEffect && typeof bgEffect.destroy === "function") bgEffect.destroy();
    };
  }, []);

  return (
    <div className="landing-root">
      <div className="vanta-bg-full" ref={bgVantaRef} />
      <div className="hero-rect" />
      <div className="landing-content container">
        <h1>Welcome to KvizHub</h1>
        <p>
          The ultimate platform to test your knowledge and climb the leaderboard!
        </p>
        <div className="actions">
          <Link to="/login" className="btn btn-primary">
            Login
          </Link>
          <Link to="/register" className="btn btn-secondary">
            Register
          </Link>
        </div>
      </div>
    </div>
  );
};

export default LandingPage;
