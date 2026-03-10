import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { OnboardingWizard } from "./onboarding-wizard";

export default async function OnboardingPage() {
  const { userId: clerkId } = await auth();
  if (!clerkId) redirect("/sign-in");

  // If the user already has a workspace, skip onboarding
  const user = await db.user.findUnique({
    where: { clerkId },
    include: { workspaces: { take: 1 } },
  });

  if (user && user.workspaces.length > 0) {
    redirect("/dashboard");
  }

  return <OnboardingWizard />;
}
