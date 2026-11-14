import React from "react";
import ReactDOM from "react-dom/client";
import "@fontsource/dm-sans/400.css";
import "@fontsource/dm-sans/500.css";
import "@fontsource/dm-sans/600.css";
import "@fontsource/dm-sans/700.css";
import { App } from "./App";
import { Simulation } from "./simulation/Simulation";
import "./styles.css";
import "./simulation/simulation.css";

function Root() {
  const [hash, setHash] = React.useState(location.hash);
  React.useEffect(() => {
    const update = () => setHash(location.hash);
    addEventListener("hashchange", update);
    return () => removeEventListener("hashchange", update);
  }, []);
  return hash === "#practice" ? <App /> : <Simulation />;
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>,
);
