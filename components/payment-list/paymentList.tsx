"use client";

import { useEffect, useState } from "react";
import Image from "next/image";

type PaymentMethod = {
  id: string;
  payment_method: string;
  photo: string;
  status: string;
  ord: string;
};

export default function PaymentMethodSection() {
  const [methods, setMethods] = useState<PaymentMethod[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchMethods() {
      try {
        const response = await fetch(process.env.NEXT_PUBLIC_PHP_API_URL!, {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({
            action: "get-payment-method-list",
          }),
        });

        const data = await response.json();

        if (data?.isSuccess && Array.isArray(data.data)) {
          const sorted = data.data.sort(
            (a: PaymentMethod, b: PaymentMethod) =>
              Number(a.ord) - Number(b.ord),
          );
          setMethods(sorted);
        }
      } catch (err) {
        console.error("Error:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchMethods();
  }, []);

  return (
    <section className="container py-5">
      <h2 className="text-center fw-bold mb-5" style={{ letterSpacing: "1px" }}>
        HOW TO SEND PAYMENT
      </h2>

      <div className="row align-items-center justify-content-center">
        {/* LEFT SIDE LIST */}
        <div className="col-12 col-md-5">
          {loading ? (
            <p className="text-center">Loading...</p>
          ) : (
            <div>
              {methods.map((item) => (
                <div
                  key={item.id}
                  className="d-flex align-items-center mb-4 payment-row"
                >
                  <div className="payment-icon-box me-3">
                    <Image
                      src={item.photo}
                      width={45}
                      height={45}
                      alt={item.payment_method}
                      className="img-fluid"
                      unoptimized
                    />
                  </div>

                  <span className="fw-semibold fs-5">
                    {item.payment_method}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* RIGHT SIDE IMAGE */}
        {/*  <div className="col-12 col-md-5 text-center mt-4 mt-md-0">
          <Image
            src="/images/how-to-send-payment-new.webp"
            alt="Payment Methods Illustration"
            width={400}
            height={450}
            className="img-fluid"
          />
        </div> */}
      </div>
    </section>
  );
}
