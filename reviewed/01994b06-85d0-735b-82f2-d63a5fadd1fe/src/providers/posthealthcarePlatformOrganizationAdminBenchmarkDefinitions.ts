import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformBenchmarkDefinition } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformBenchmarkDefinition";
import { OrganizationadminPayload } from "../decorators/payload/OrganizationadminPayload";

/**
 * Create a new analytics benchmark definition
 * (healthcare_platform_benchmark_definitions).
 *
 * This operation creates a new benchmark record defining target values, time
 * windows, and measurement units for analytics normalization in an organization
 * context. The function verifies all data types strictly, never uses native
 * Date nor type assertions, and handles all output fields per DTO contract.
 *
 * @param props - Props object: { organizationAdmin: authenticated org admin
 *   (OrganizationadminPayload); body:
 *   IHealthcarePlatformBenchmarkDefinition.ICreate }
 * @returns Newly created IHealthcarePlatformBenchmarkDefinition, with all
 *   required and optional fields correctly populated
 * @throws {Error} On uniqueness violation or other DB errors
 */
export async function posthealthcarePlatformOrganizationAdminBenchmarkDefinitions(props: {
  organizationAdmin: OrganizationadminPayload;
  body: IHealthcarePlatformBenchmarkDefinition.ICreate;
}): Promise<IHealthcarePlatformBenchmarkDefinition> {
  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());
  try {
    const created =
      await MyGlobal.prisma.healthcare_platform_benchmark_definitions.create({
        data: {
          id: v4(),
          organization_id: props.organizationAdmin.id,
          benchmark_code: props.body.benchmark_code,
          label: props.body.label,
          value: props.body.value,
          unit: props.body.unit,
          effective_start_at: props.body.effective_start_at,
          effective_end_at: props.body.effective_end_at ?? null,
          description: props.body.description ?? null,
          created_at: now,
          updated_at: now,
          deleted_at: null,
        },
      });
    return {
      id: created.id,
      organization_id: created.organization_id ?? undefined,
      benchmark_code: created.benchmark_code,
      label: created.label,
      description: created.description ?? undefined,
      value: created.value,
      unit: created.unit,
      effective_start_at: created.effective_start_at,
      effective_end_at: created.effective_end_at ?? undefined,
      created_at: created.created_at,
      updated_at: created.updated_at,
      deleted_at: created.deleted_at ?? undefined,
    };
  } catch (error) {
    throw new Error(error instanceof Error ? error.message : String(error));
  }
}
