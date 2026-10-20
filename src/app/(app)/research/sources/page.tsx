import { prisma } from "@/lib/db";
import { requireUser, isManagerRole } from "@/lib/auth";
import { DEFAULT_SOURCES } from "@/lib/research";
import { PageHeader } from "@/components/ui";
import { ResearchSources, type ResearchSourceItem } from "@/components/research-sources";

export const dynamic = "force-dynamic";

export default async function ResearchSourcesPage() {
  const user = await requireUser();
  const manager = isManagerRole(user.role);

  const dbSources = await prisma.researchSource.findMany({ orderBy: { name: "asc" } });

  const sources: ResearchSourceItem[] =
    dbSources.length > 0
      ? dbSources.map((s) => ({
          id: s.id,
          name: s.name,
          category: s.category,
          fieldsSupplied: s.fieldsSupplied,
          licence: s.licence,
          allowedUses: s.allowedUses,
          personalData: s.personalData,
          refreshCadence: s.refreshCadence,
          isActive: s.isActive,
          notes: s.notes,
        }))
      : DEFAULT_SOURCES.map((s) => ({
          id: null,
          name: s.name,
          category: s.category,
          fieldsSupplied: s.fieldsSupplied,
          licence: s.licence,
          allowedUses: null,
          personalData: s.personalData,
          refreshCadence: s.refreshCadence,
          isActive: true,
          notes: null,
        }));

  return (
    <div>
      <PageHeader
        title="Research Sources"
        description="Licensing register for every source that supplies company or contact fields. Only use sources whose licence permits your intended use."
      />
      <ResearchSources sources={sources} isManager={manager} />
    </div>
  );
}
