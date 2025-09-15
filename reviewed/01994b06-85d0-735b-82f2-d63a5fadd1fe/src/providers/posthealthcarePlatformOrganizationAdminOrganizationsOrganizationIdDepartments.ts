import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformDepartment";
import { OrganizationadminPayload } from "../decorators/payload/OrganizationadminPayload";

/**
 * Creates a new department within a specified organization in
 * healthcare_platform_departments.
 *
 * This endpoint allows authenticated organization administrators to register a
 * new business department under their organization context. The request must
 * specify unique values for code and name within the organization. Timestamps
 * are generated automatically for immutable audit. Soft delete is not set on
 * create; deleted_at is omitted. Uniqueness violations (duplicate code or name)
 * are clearly reported. Parent organization linkage derives from the
 * organizationId URL parameter, not the body, for integrity and security.
 *
 * @param props - Parameters required for department creation
 * @param props.organizationAdmin - The authenticated organization administrator
 *   performing the operation
 * @param props.organizationId - The UUID of the target organization (tenant)
 *   under which to create the department
 * @param props.body - Department creation data: code, name, status, etc.
 * @returns The full created department entity with all schema fields populated
 * @throws {Error} If uniqueness constraints on code or name are violated, or on
 *   any other Prisma or business rule violation
 */
export async function posthealthcarePlatformOrganizationAdminOrganizationsOrganizationIdDepartments(props: {
  organizationAdmin: OrganizationadminPayload;
  organizationId: string & tags.Format<"uuid">;
  body: IHealthcarePlatformDepartment.ICreate;
}): Promise<IHealthcarePlatformDepartment> {
  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());
  try {
    const created =
      await MyGlobal.prisma.healthcare_platform_departments.create({
        data: {
          id: v4() as string & tags.Format<"uuid">,
          healthcare_platform_organization_id: props.organizationId,
          code: props.body.code,
          name: props.body.name,
          status: props.body.status,
          created_at: now,
          updated_at: now,
        },
      });
    return {
      id: created.id,
      healthcare_platform_organization_id:
        created.healthcare_platform_organization_id,
      code: created.code,
      name: created.name,
      status: created.status,
      created_at: toISOStringSafe(created.created_at),
      updated_at: toISOStringSafe(created.updated_at),
      deleted_at:
        created.deleted_at !== null
          ? toISOStringSafe(created.deleted_at)
          : undefined,
    };
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "P2002"
    ) {
      // Prisma unique constraint violation
      throw new Error(
        "Department code and name must be unique within this organization. " +
          "(A department with this code or name already exists.)",
      );
    }
    throw error;
  }
}
