import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import ErrorBoundary from "./ErrorBoundary.jsx";
import "./styles.css";

/* Flipa-titillinn er settur ADUR en fyrsta render. Hann stod adur i
   index.html a islensku og var leidrettur af `applyDocument()` ur
   tungumalalaginu; thad lag er farid, svo hann stendur her.            */
document.title = "Fantasy planner";

/* VILLUVORNIN ER UTAN StrictMode, ekki innan: hun a ad grípa lika thad sem
   brestur i sjalfri uppsetningunni. Sja src/ErrorBoundary.jsx um af hverju
   utgongu-hnappurinn (hreinsa vistad astand) er thad sem skiptir mali.   */
createRoot(document.getElementById("root")).render(
  <ErrorBoundary>
    <React.StrictMode><App /></React.StrictMode>
  </ErrorBoundary>
);
