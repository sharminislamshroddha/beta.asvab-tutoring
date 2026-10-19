import { Suspense } from "react";
import BuyMoreSessionsClient from "./BuyMoreSessionsClient";

export default function BuyMoreSessionsPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <BuyMoreSessionsClient />
    </Suspense>
  );
}
