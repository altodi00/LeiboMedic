import { Nav } from "@/components/nav";
import { requireFamily } from "@/lib/family";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { family } = await requireFamily();
  return (
    <>
      <Nav familyName={family.name} />
      <main className="mx-auto max-w-5xl px-4 pb-28 pt-6 md:pb-12">{children}</main>
    </>
  );
}
