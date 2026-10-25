import AccountTabs from "@/components/study/account/AccountTabs";
import PasswordForm from "@/components/study/account/PasswordForm";
import { StudyPageHeader } from "@/components/study/StudyUi";

export const metadata = { title: "Change Password" };

export default function StudyPasswordPage() {
  const crumbs = [
    { label: "Dashboard", href: "/study" },
    { label: "My account" },
  ];
  return (
    <>
      <StudyPageHeader
        title="My account"
        subtitle="Keep your details up to date."
        crumbs={crumbs}
      />
      <AccountTabs active="password" />
      <PasswordForm />
    </>
  );
}
