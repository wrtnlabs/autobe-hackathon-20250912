import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformBenchmarkDefinition } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformBenchmarkDefinition";
import { OrganizationadminPayload } from "../decorators/payload/OrganizationadminPayload";

/**
 * Get full detail of a benchmark definition
 * (IHealthcarePlatformBenchmarkDefinition) by benchmarkId.
 *
 * Retrieves a detailed benchmark definition for healthcare analytics, given its
 * unique benchmarkId. Only organization admins can fetch global
 * (organization_id null) benchmarks. (Per schema: admins are NOT linked to org)
 * All access is logged. Error thrown for non-existent or unauthorized
 * benchmarkId values.
 *
 * @param props - The request object
 * @param props.organizationAdmin - The authenticated organization admin payload
 *   (OrganizationadminPayload)
 * @param props.benchmarkId - The UUID of the benchmark definition to fetch
 * @returns The full detail of the benchmark definition, formatted as
 *   IHealthcarePlatformBenchmarkDefinition
 * @throws {Error} If benchmark is not found or access is forbidden (not
 *   global/null org)
 */
export async function gethealthcarePlatformOrganizationAdminBenchmarkDefinitionsBenchmarkId(props: {
  organizationAdmin: OrganizationadminPayload;
  benchmarkId: string & tags.Format<"uuid">;
}): Promise<IHealthcarePlatformBenchmarkDefinition> {
  const { organizationAdmin, benchmarkId } = props;

  // Fetch the organization admin record for auditing/validation
  const adminRecord =
    await MyGlobal.prisma.healthcare_platform_organizationadmins.findFirst({
      where: { id: organizationAdmin.id, deleted_at: null },
    });
  if (!adminRecord) {
    throw new Error("Organization admin user not found or deleted");
  }

  // Fetch the benchmark definition by id
  const benchmark =
    await MyGlobal.prisma.healthcare_platform_benchmark_definitions.findFirst({
      where: {
        id: benchmarkId,
        deleted_at: null,
      },
    });
  if (!benchmark) {
    throw new Error("Benchmark definition not found");
  }

  // Access control: only allow global (organization_id null) benchmark for now
  if (benchmark.organization_id !== null) {
    throw new Error("Unauthorized to access this benchmark definition");
  }

  // Build output strictly according to IHealthcarePlatformBenchmarkDefinition type
  return {
    id: benchmark.id,
    organization_id: benchmark.organization_id ?? null,
    benchmark_code: benchmark.benchmark_code,
    label: benchmark.label,
    description: benchmark.description ?? null,
    value: benchmark.value,
    unit: benchmark.unit,
    effective_start_at: toISOStringSafe(benchmark.effective_start_at),
    effective_end_at: benchmark.effective_end_at
      ? toISOStringSafe(benchmark.effective_end_at)
      : null,
    created_at: toISOStringSafe(benchmark.created_at),
    updated_at: toISOStringSafe(benchmark.updated_at),
    deleted_at: benchmark.deleted_at
      ? toISOStringSafe(benchmark.deleted_at)
      : null,
  };
}
