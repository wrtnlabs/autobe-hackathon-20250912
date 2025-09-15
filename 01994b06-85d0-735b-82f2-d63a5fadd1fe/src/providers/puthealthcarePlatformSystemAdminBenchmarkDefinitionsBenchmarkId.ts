import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformBenchmarkDefinition } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformBenchmarkDefinition";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * Update an existing benchmark definition
 * (healthcare_platform_benchmark_definitions)
 *
 * Updates the specified benchmark definition with new values for label, value,
 * unit, effective_start_at, effective_end_at, and description. Only systemAdmin
 * or organizationAdmin with proper auth can perform this operation. Ensures
 * updated_at is always set to now (ISO8601 string). Audited for compliance.
 * Throws on not found or uniqueness constraint violation. Returns the full
 * post-update DTO.
 *
 * @param props - Operation request props
 * @param props.systemAdmin - The authenticated system admin (authorization
 *   enforced)
 * @param props.benchmarkId - UUID of the benchmark definition to update
 * @param props.body - Partial update fields (send only changed fields)
 * @returns The updated benchmark definition as API DTO
 * @throws {Error} If the benchmark does not exist, or upon unique constraint
 *   violation
 */
export async function puthealthcarePlatformSystemAdminBenchmarkDefinitionsBenchmarkId(props: {
  systemAdmin: SystemadminPayload;
  benchmarkId: string & tags.Format<"uuid">;
  body: IHealthcarePlatformBenchmarkDefinition.IUpdate;
}): Promise<IHealthcarePlatformBenchmarkDefinition> {
  // 1. Fetch existing benchmark
  const existing =
    await MyGlobal.prisma.healthcare_platform_benchmark_definitions.findUnique({
      where: { id: props.benchmarkId },
    });
  if (!existing) throw new Error("Benchmark definition not found");

  // 2. Prepare update values (partial)
  const updates = {
    ...(props.body.label !== undefined ? { label: props.body.label } : {}),
    ...(props.body.value !== undefined ? { value: props.body.value } : {}),
    ...(props.body.unit !== undefined ? { unit: props.body.unit } : {}),
    ...(props.body.description !== undefined
      ? { description: props.body.description }
      : {}),
    ...(props.body.effective_start_at !== undefined
      ? { effective_start_at: props.body.effective_start_at }
      : {}),
    ...(props.body.effective_end_at !== undefined
      ? { effective_end_at: props.body.effective_end_at }
      : {}),
    updated_at: toISOStringSafe(new Date()),
  };

  // 3. Apply update in DB
  let updated: typeof existing;
  try {
    updated =
      await MyGlobal.prisma.healthcare_platform_benchmark_definitions.update({
        where: { id: props.benchmarkId },
        data: updates,
      });
  } catch (err) {
    if (
      typeof err === "object" &&
      err !== null &&
      "code" in err &&
      (err as { code: string }).code === "P2002"
    ) {
      throw new Error(
        "Duplicate label/unit for organization or business constraint violated",
      );
    }
    throw new Error(
      "Failed to update benchmark definition: " +
        (err instanceof Error ? err.message : String(err)),
    );
  }

  // 4. Return mapped DTO, with all dates as ISO strings and optional fields as per IHealthcarePlatformBenchmarkDefinition
  return {
    id: updated.id,
    organization_id: updated.organization_id ?? undefined,
    benchmark_code: updated.benchmark_code,
    label: updated.label,
    value: updated.value,
    unit: updated.unit,
    effective_start_at: toISOStringSafe(updated.effective_start_at),
    effective_end_at: updated.effective_end_at
      ? toISOStringSafe(updated.effective_end_at)
      : undefined,
    description: updated.description ?? undefined,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at
      ? toISOStringSafe(updated.deleted_at)
      : undefined,
  };
}
