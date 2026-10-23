import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

export default async function AppHomePage() {
  // Next 16: headers() is async. The proxy only checks that a cookie exists;
  // this is the real session check.
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    redirect("/sign-in");
  }
  return (
    <main className="mx-auto max-w-2xl px-6 py-16">
      <h1 className="text-2xl font-semibold tracking-tight">Your pilot</h1>
      <p className="mt-3 opacity-70">Signed in as {session.user.email}.</p>
    </main>
  );
}
