import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ourMobileAppsMetadata } from "@/lib/page-metadata";

export const metadata: Metadata = ourMobileAppsMetadata();

/** Revalidate cached app listings periodically (ISR). */
export const revalidate = 3600;

interface AppInfo {
  app_id: string;
  logo_img: string;
  app_name: string;
  app_description: string;
  app_store_url: string;
  google_play_url: string;
}

function getPhpApiUrl(): string | undefined {
  return process.env.PHP_API_URL || process.env.NEXT_PUBLIC_PHP_API_URL;
}

async function fetchApps(): Promise<AppInfo[]> {
  const apiUrl = getPhpApiUrl();
  if (!apiUrl) {
    console.error("Our Mobile Apps: PHP API URL is not configured");
    return [];
  }

  try {
    const response = await fetch(apiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ action: "get-our-app-info" }),
      next: { revalidate },
    });

    if (!response.ok) {
      console.error("Our Mobile Apps: API returned", response.status);
      return [];
    }

    const result = await response.json();
    if (result?.isSuccess && Array.isArray(result.data)) {
      return result.data as AppInfo[];
    }
  } catch (error) {
    console.error("Failed to fetch apps:", error);
  }

  return [];
}

export default async function OurAppsPage() {
  const apps = await fetchApps();

  return (
    <section className="py-5 bg-light">
      <div className="container">
        <h1 className="text-center fw-bold mb-5">Our Mobile Apps</h1>
        {apps.length === 0 ? (
          <p className="text-center text-muted">
            App listings are temporarily unavailable. Please try again later.
          </p>
        ) : (
          <div className="row g-4">
            {apps.map((app) => (
              <div className="col-md-6" key={app.app_id}>
                <div className="app-card h-100 shadow-sm text-center p-3">
                  <div className="app-logo mb-3">
                    <Image
                      src={app.logo_img}
                      alt={app.app_name}
                      width={100}
                      height={100}
                      className="img-fluid rounded"
                    />
                  </div>

                  <h5 className="app-name mb-3">{app.app_name}</h5>

                  <p className="app-description"> {app.app_description} </p>

                  <div className="d-flex justify-content-center gap-3">
                    {app.app_store_url && app.app_store_url !== "dummy" && (
                      <Link
                        href={app.app_store_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="app-link-btn"
                      >
                        <Image
                          src="/images/download-on-the-app-store.svg"
                          alt="App Store"
                          width={120}
                          height={40}
                          unoptimized
                          style={{ width: "auto", height: "40px" }}
                        />
                      </Link>
                    )}

                    {app.google_play_url && app.google_play_url !== "dummy" && (
                      <Link
                        href={app.google_play_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="app-link-btn"
                      >
                        <Image
                          src="/images/Google_Play_Store_badge_EN.svg"
                          alt="Google Play"
                          width={135}
                          height={40}
                          unoptimized
                          style={{ width: "auto", height: "40px" }}
                        />
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
