import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * Delete an analytics benchmark definition entry
 * (healthcare_platform_benchmark_definitions table).
 *
 * This operation irreversibly removes a benchmark definition from the analytics
 * configuration for an organization or system. If the model supports soft
 * delete (as per deleted_at), the record is marked deleted and retained for
 * auditing; otherwise, the removal would be hard delete (not applicable here).
 * Deletion enforces referential integrity—it is only permitted when no active
 * KPI snapshot references the benchmark. Only privileged users (systemAdmin,
 * organizationAdmin) can perform this action. All deletions are logged per
 * system policy (logging stubbed or call audit infra as needed).
 *
 * @param props - The deletion request context
 * @param props.systemAdmin - The authenticated SystemadminPayload performing
 *   the operation
 * @param props.benchmarkId - The unique identifier of the benchmark definition
 *   to delete
 * @returns Void
 * @throws {Error} If the benchmark is not found, already deleted, or is
 *   referenced by an active KPI snapshot
 */
export async function deletehealthcarePlatformSystemAdminBenchmarkDefinitionsBenchmarkId(props: {
  systemAdmin: SystemadminPayload;
  benchmarkId: string & tags.Format<"uuid">;
}): Promise<void> {
  // 1. Ensure the benchmark exists and is not already soft-deleted
  const benchmark =
    await MyGlobal.prisma.healthcare_platform_benchmark_definitions.findUnique({
      where: {
        id: props.benchmarkId,
        deleted_at: null,
      },
    });
  if (benchmark == null) {
    throw new Error("Benchmark definition not found or already deleted");
  }

  // 2. Prevent deletion if referenced by active KPI snapshot
  const referencingKPI =
    await MyGlobal.prisma.healthcare_platform_kpi_snapshots.findFirst({
      where: {
        benchmark_id: props.benchmarkId,
        deleted_at: null,
      },
    });
  if (referencingKPI != null) {
    throw new Error("Cannot delete benchmark: referenced by active KPI");
  }

  // 3. Soft-delete the benchmark (update deleted_at to current ISO string)
  const deletedAt: string & tags.Format<"date-time"> = toISOStringSafe(
    new Date(),
  );
  await MyGlobal.prisma.healthcare_platform_benchmark_definitions.update({
    where: { id: props.benchmarkId },
    data: { deleted_at: deletedAt },
  });

  // 4. Optionally log deletion for audit (stubbed; implement per audit infra)
  // await MyGlobal.logs.create({ ... })

  // Nothing is returned per contract
}
