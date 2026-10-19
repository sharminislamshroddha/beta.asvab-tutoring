import React, { Suspense } from "react";
import SubscribeAgainClient from "./SubscribeAgainClient";

export default function SubscribeAgainPage() {
  return (
    <Suspense
      fallback={
        <div style={{ maxWidth: 960, margin: "0 auto", padding: 16 }}>
          Loading…
        </div>
      }
    >
      <SubscribeAgainClient />
    </Suspense>
  );
}