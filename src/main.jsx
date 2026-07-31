import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import { applyDocument } from "./i18n.js";
import "./styles.css";

/* <html lang> og flipa-titillinn stada a islensku i index.html. Vistad val
   getur verid annad, svo thad er sett ADUR en fyrsta render — annars vaeri
   lang-attributid logid thann tima sem lidur thar a milli.               */
applyDocument();

createRoot(document.getElementById("root")).render(<React.StrictMode><App /></React.StrictMode>);
