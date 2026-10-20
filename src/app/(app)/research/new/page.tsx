import { requireUser } from "@/lib/auth";
import { PageHeader } from "@/components/ui";
import { ResearchNewForm } from "@/components/research-new-form";

export const dynamic = "force-dynamic";

export default async function NewResearchPage() {
  await requireUser();
  return (
    <div>
      <PageHeader
        title="New research organization"
        description="Create a researched company profile. Every saved field is recorded as a sourced claim on the detail page."
      />
      <ResearchNewForm />
    </div>
  );
}
