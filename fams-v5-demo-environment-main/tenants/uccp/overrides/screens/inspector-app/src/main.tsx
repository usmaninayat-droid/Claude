
  import { createRoot } from "react-dom/client";
  import App from "./inspector-v5/App";
  import { InspectorStoreProvider } from "./inspector-v5/data/store";
  import "./styles/index.css";

  createRoot(document.getElementById("root")!).render(
    <InspectorStoreProvider>
      <App />
    </InspectorStoreProvider>
  );
