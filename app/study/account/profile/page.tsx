import AccountTabs from "@/components/study/account/AccountTabs";
import ProfileForm from "@/components/study/account/ProfileForm";
import { StudyNotice, StudyPageHeader } from "@/components/study/StudyUi";
import { getStudyAccount } from "@/lib/study-api";

export const metadata = { title: "Edit Profile" };

export default async function StudyProfilePage() {
  const account = await getStudyAccount();
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
      <AccountTabs active="profile" />
      {account.ok ? (
        <ProfileForm
          profile={account.data.profile}
          states={account.data.states}
          cities={account.data.cities}
        />
      ) : (
        <StudyNotice code={account.code} message={account.message} />
      )}
    </>
  );
}
