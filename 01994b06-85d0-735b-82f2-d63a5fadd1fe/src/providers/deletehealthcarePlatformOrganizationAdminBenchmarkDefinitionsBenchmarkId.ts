import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { OrganizationadminPayload } from "../decorators/payload/OrganizationadminPayload";

/**
 * Delete an analytics benchmark definition entry (soft delete).
 *
 * This operation marks the benchmark as deleted by setting its deleted_at
 * field, if not already deleted and if not referenced by any active KPI
 * snapshots. Only organization admins for the owning organization are
 * permitted.
 *
 * @param props - Request properties
 * @param props.organizationAdmin - The authenticated org admin user for
 *   authorization
 * @param props.benchmarkId - ID of the benchmark definition to delete
 * @returns Void
 * @throws {Error} If benchmark does not exist or is already deleted
 * @throws {Error} If user is not authorized (benchmark not in their
 *   organization)
 * @throws {Error} If the benchmark is referenced by active KPI snapshots
 */
export async function deletehealthcarePlatformOrganizationAdminBenchmarkDefinitionsBenchmarkId(props: {
  organizationAdmin: OrganizationadminPayload;
  benchmarkId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { organizationAdmin, benchmarkId } = props;

  // Step 1: Fetch the benchmark and validate existence
  const benchmark =
    await MyGlobal.prisma.healthcare_platform_benchmark_definitions.findFirst({
      where: { id: benchmarkId },
      select: { id: true, organization_id: true, deleted_at: true },
    });
  if (!benchmark) throw new Error("Benchmark not found");
  if (benchmark.deleted_at !== null)
    throw new Error("Benchmark already deleted");

  // Step 2: Enforce org ownership (admin can only delete their own org's benchmarks)
  if (organizationAdmin.id !== benchmark.organization_id) {
    throw new Error("Forbidden: Not your organization's benchmark");
  }

  // Step 3: Block deletion if referenced by active KPI snapshots
  const activeKpiCount =
    await MyGlobal.prisma.healthcare_platform_kpi_snapshots.count({
      where: { benchmark_id: benchmarkId, deleted_at: null },
    });
  if (activeKpiCount > 0) {
    throw new Error("Cannot delete: Referenced by active KPI(s)");
  }

  // Step 4: Perform soft delete (update deleted_at)
  await MyGlobal.prisma.healthcare_platform_benchmark_definitions.update({
    where: { id: benchmarkId },
    data: { deleted_at: toISOStringSafe(new Date()) },
  });
}
