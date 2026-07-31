import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import ErrorBoundary from "./ErrorBoundary.jsx";
import { applyDocument } from "./i18n.js";
import "./styles.css";

/* <html lang> og flipa-titillinn stada a islensku i index.html. Vistad val
   getur verid annad, svo thad er sett ADUR en fyrsta render — annars vaeri
   lang-attributid logid thann tima sem lidur thar a milli.               */
applyDocument();

/* VILLUVORNIN ER UTAN StrictMode, ekki innan: hun a ad grípa lika thad sem
   brestur i sjalfri uppsetningunni. Sja src/ErrorBoundary.jsx um af hverju
   utgongu-hnappurinn (hreinsa vistad astand) er thad sem skiptir mali.   */
createRoot(document.getElementById("root")).render(
  <ErrorBoundary>
    <React.StrictMode><App /></React.StrictMode>
  </ErrorBoundary>
);
