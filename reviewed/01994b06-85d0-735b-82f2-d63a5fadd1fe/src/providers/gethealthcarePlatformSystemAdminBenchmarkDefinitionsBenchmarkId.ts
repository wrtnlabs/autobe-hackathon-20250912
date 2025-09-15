import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformBenchmarkDefinition } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformBenchmarkDefinition";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * Get full detail of a benchmark definition
 * (IHealthcarePlatformBenchmarkDefinition) by benchmarkId.
 *
 * Retrieves all details for a single benchmark definition entity, as identified
 * by benchmarkId (UUID). Benchmarks define reference targets for KPIs (e.g.,
 * national average, org goal), including metadata, code, unit, value, dates,
 * and organizational ties. Only system admin or org admin can access details.
 * Audit and error on not-found or unauthorized.
 *
 * @param props - Parameters object
 * @param props.systemAdmin - SystemadminPayload injection (authorization
 *   contract)
 * @param props.benchmarkId - The UUID of the benchmark definition to retrieve
 * @returns Detailed IHealthcarePlatformBenchmarkDefinition for
 *   analytic/audit/reporting use
 * @throws {Error} If benchmark with given ID does not exist or is deleted
 *   (findFirstOrThrow), or if unauthorized
 */
export async function gethealthcarePlatformSystemAdminBenchmarkDefinitionsBenchmarkId(props: {
  systemAdmin: SystemadminPayload;
  benchmarkId: string & tags.Format<"uuid">;
}): Promise<IHealthcarePlatformBenchmarkDefinition> {
  const { benchmarkId } = props;

  const found =
    await MyGlobal.prisma.healthcare_platform_benchmark_definitions.findFirstOrThrow(
      {
        where: {
          id: benchmarkId,
          deleted_at: null,
        },
        select: {
          id: true,
          organization_id: true,
          benchmark_code: true,
          label: true,
          description: true,
          value: true,
          unit: true,
          effective_start_at: true,
          effective_end_at: true,
          created_at: true,
          updated_at: true,
          deleted_at: true,
        },
      },
    );

  return {
    id: found.id,
    organization_id: found.organization_id ?? undefined,
    benchmark_code: found.benchmark_code,
    label: found.label,
    description: found.description ?? undefined,
    value: found.value,
    unit: found.unit,
    effective_start_at: toISOStringSafe(found.effective_start_at),
    effective_end_at:
      found.effective_end_at !== null && found.effective_end_at !== undefined
        ? toISOStringSafe(found.effective_end_at)
        : undefined,
    created_at: toISOStringSafe(found.created_at),
    updated_at: toISOStringSafe(found.updated_at),
    deleted_at:
      found.deleted_at !== null && found.deleted_at !== undefined
        ? toISOStringSafe(found.deleted_at)
        : undefined,
  };
}
