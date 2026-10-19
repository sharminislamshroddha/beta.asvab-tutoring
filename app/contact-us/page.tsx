import type { Metadata } from "next";
import { fetchStateList } from "@/lib/php-api";
import ContactForm from "./ContactForm";

export const metadata: Metadata = {
  title: "Contact Us | ASVAB Tutoring",
  description:
    "Get in touch with ASVAB Tutoring. Fill out the form and our team will get back to you shortly.",
};

export const revalidate = 3600;

export default async function ContactPage() {
  const states = await fetchStateList();
  return <ContactForm initialStates={states} />;
}
