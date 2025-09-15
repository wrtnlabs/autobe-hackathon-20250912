import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformBenchmarkDefinition } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformBenchmarkDefinition";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * Create a new analytics benchmark definition
 * (healthcare_platform_benchmark_definitions table).
 *
 * This function creates a new benchmark definition used for analytics
 * comparison, normalization, and dashboards, within the healthcarePlatform
 * system. The new entry will belong to the specified organization (by UUID),
 * and includes value, label, measurement unit, effective date windows, and
 * optional description. Uniqueness is enforced on (organization_id,
 * benchmark_code) to prevent duplicates within the same organization, ignoring
 * soft-deleted records.
 *
 * Only authenticated systemAdmins are permitted to call this function. If a
 * duplicate (organization_id, benchmark_code) is found (excluding
 * soft-deleted), an error is thrown. All timestamps are set with ISO 8601 UTC
 * strings.
 *
 * @param props - Parameters for the operation
 * @param props.systemAdmin - Authenticated SystemadminPayload making the
 *   request
 * @param props.body - Benchmark definition creation payload
 * @returns The full benchmark definition record
 * @throws Error if a benchmark code with the same organization_id already
 *   exists and is not deleted.
 */
export async function posthealthcarePlatformSystemAdminBenchmarkDefinitions(props: {
  systemAdmin: SystemadminPayload;
  body: IHealthcarePlatformBenchmarkDefinition.ICreate;
}): Promise<IHealthcarePlatformBenchmarkDefinition> {
  const { body } = props;

  // Check uniqueness on (organization_id, benchmark_code) ignoring soft-deleted
  const exists =
    await MyGlobal.prisma.healthcare_platform_benchmark_definitions.findFirst({
      where: {
        organization_id: body.organization_id,
        benchmark_code: body.benchmark_code,
        deleted_at: null,
      },
    });
  if (exists) {
    throw new Error(
      "A benchmark with this code already exists for the given organization.",
    );
  }

  // Generate ID and timestamps
  const id: string & tags.Format<"uuid"> = v4();
  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());

  // Create the record
  const created =
    await MyGlobal.prisma.healthcare_platform_benchmark_definitions.create({
      data: {
        id,
        organization_id: body.organization_id,
        benchmark_code: body.benchmark_code,
        label: body.label,
        description:
          typeof body.description !== "undefined" ? body.description : null,
        value: body.value,
        unit: body.unit,
        effective_start_at: body.effective_start_at,
        effective_end_at:
          typeof body.effective_end_at !== "undefined"
            ? body.effective_end_at
            : null,
        created_at: now,
        updated_at: now,
        deleted_at: null,
      },
    });

  // Map fields to DTO contract (handle null/undefined distinctions)
  return {
    id: created.id,
    organization_id:
      typeof created.organization_id !== "undefined" &&
      created.organization_id !== null
        ? created.organization_id
        : undefined,
    benchmark_code: created.benchmark_code,
    label: created.label,
    description:
      typeof created.description !== "undefined" && created.description !== null
        ? created.description
        : undefined,
    value: created.value,
    unit: created.unit,
    effective_start_at: created.effective_start_at,
    effective_end_at:
      typeof created.effective_end_at !== "undefined" &&
      created.effective_end_at !== null
        ? created.effective_end_at
        : undefined,
    created_at: created.created_at,
    updated_at: created.updated_at,
    deleted_at:
      typeof created.deleted_at !== "undefined" && created.deleted_at !== null
        ? created.deleted_at
        : undefined,
  };
}
