import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformBenchmarkDefinition } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformBenchmarkDefinition";
import { OrganizationadminPayload } from "../decorators/payload/OrganizationadminPayload";

/**
 * Update an existing benchmark definition
 * (healthcare_platform_benchmark_definitions table).
 *
 * This operation updates fields such as label, value, unit, active date
 * windows, and description of an analytics benchmark definition identified by
 * benchmarkId. The benchmark is soft-deleted aware and only updated if active.
 * Only an authenticated organizationAdmin can perform this operation. All
 * updates refresh the updated_at field. Fields not specified in the body are
 * unchanged. Full type safety and date handling are ensured.
 *
 * @param props - Properties for this operation
 * @param props.organizationAdmin - The authenticated organization admin
 *   performing the update (payload: OrganizationadminPayload)
 * @param props.benchmarkId - Benchmark definition UUID to update
 * @param props.body - Partial update payload
 *   (IHealthcarePlatformBenchmarkDefinition.IUpdate)
 * @returns The updated IHealthcarePlatformBenchmarkDefinition DTO
 * @throws {Error} If the benchmark definition does not exist or is soft-deleted
 */
export async function puthealthcarePlatformOrganizationAdminBenchmarkDefinitionsBenchmarkId(props: {
  organizationAdmin: OrganizationadminPayload;
  benchmarkId: string & tags.Format<"uuid">;
  body: IHealthcarePlatformBenchmarkDefinition.IUpdate;
}): Promise<IHealthcarePlatformBenchmarkDefinition> {
  const { organizationAdmin, benchmarkId, body } = props;

  // Find existing benchmark, ensure it's not deleted
  const benchmark =
    await MyGlobal.prisma.healthcare_platform_benchmark_definitions.findFirst({
      where: {
        id: benchmarkId,
        deleted_at: null,
      },
    });
  if (benchmark === null) {
    throw new Error("Benchmark definition not found");
  }

  // Update fields; skip those not present in body
  const now = toISOStringSafe(new Date());
  const updated =
    await MyGlobal.prisma.healthcare_platform_benchmark_definitions.update({
      where: { id: benchmarkId },
      data: {
        label: body.label ?? undefined,
        value: body.value ?? undefined,
        unit: body.unit ?? undefined,
        effective_start_at: body.effective_start_at ?? undefined,
        effective_end_at: body.effective_end_at ?? undefined,
        description: body.description ?? undefined,
        updated_at: now,
      },
    });

  return {
    id: updated.id,
    organization_id:
      updated.organization_id === null ? undefined : updated.organization_id,
    benchmark_code: updated.benchmark_code,
    label: updated.label,
    description:
      typeof updated.description === "undefined" || updated.description === null
        ? undefined
        : updated.description,
    value: updated.value,
    unit: updated.unit,
    effective_start_at: toISOStringSafe(updated.effective_start_at),
    effective_end_at:
      typeof updated.effective_end_at === "undefined" ||
      updated.effective_end_at === null
        ? undefined
        : toISOStringSafe(updated.effective_end_at),
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at:
      typeof updated.deleted_at === "undefined" || updated.deleted_at === null
        ? undefined
        : toISOStringSafe(updated.deleted_at),
  };
}
