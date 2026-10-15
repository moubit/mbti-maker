import React, { Component, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import Player from "./Player.jsx";
import Editor from "./Editor.jsx";
import { fingerprint, parseConfig } from "./core.mjs";
import template from "../template.json";
import "./styles.css";

class ErrorBoundary extends Component {
  state = { error: null };
  static getDerivedStateFromError(error) {
    return { error };
  }
  render() {
    return this.state.error ? (
      <main className="fatal-error">
        <h1>暂时无法打开这个测试</h1>
        <p>{this.state.error.message}</p>
        <p>请重新打开原始 HTML，或检查配置文件。</p>
        <button className="button primary" onClick={() => location.reload()}>
          重新加载
        </button>
      </main>
    ) : (
      this.props.children
    );
  }
}
function App() {
  const [published] = useState(() =>
    parseConfig(
      document.getElementById("project-config")?.textContent ||
        JSON.stringify(template),
    ),
  );
  const [route, setRoute] = useState(() =>
    published.settings.showEditor && location.hash === "#/editor"
      ? "editor"
      : "site",
  );
  const [locationHint, setLocationHint] = useState({
    section: "site",
    id: null,
  });
  const [trial, setTrial] = useState(null);
  useEffect(() => {
    document.title = published.site.title;
    const change = () =>
      setRoute(
        published.settings.showEditor && location.hash === "#/editor"
          ? "editor"
          : "site",
      );
    window.addEventListener("hashchange", change);
    return () => window.removeEventListener("hashchange", change);
  }, [published]);
  const openEditor = (section = "site", id = null) => {
    setLocationHint({ section, id });
    setRoute("editor");
    location.hash = "/editor";
  };
  if (route === "editor")
    return (
      <Editor
        published={published}
        initialSection={locationHint.section}
        initialId={locationHint.id}
        onExit={() => {
          setTrial(null);
          setRoute("site");
          location.hash = "/";
        }}
        onTrial={(config) => {
          setTrial(config);
          setRoute("trial");
          location.hash = "/try";
        }}
      />
    );
  return (
    <Player
      key={
        trial && route !== "editor"
          ? `trial-${fingerprint(trial)}`
          : fingerprint(published)
      }
      config={trial || published}
      onEdit={published.settings.showEditor ? openEditor : undefined}
      onBack={trial ? () => openEditor() : undefined}
    />
  );
}

createRoot(document.getElementById("root")).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>,
);
