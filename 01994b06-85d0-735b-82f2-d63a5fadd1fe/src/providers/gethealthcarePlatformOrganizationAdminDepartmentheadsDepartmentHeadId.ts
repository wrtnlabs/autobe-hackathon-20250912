import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformDepartmentHead } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformDepartmentHead";
import { OrganizationadminPayload } from "../decorators/payload/OrganizationadminPayload";

/**
 * Get a department head's full record by ID
 * (healthcare_platform_departmentheads)
 *
 * Fetches the full record for a single department head from the database by
 * unique identifier, strictly enforcing non-deleted records and returning all
 * fields (id, email, full_name, phone, created_at, updated_at, deleted_at).
 * This endpoint is used by staff, admins, and auditors for HR and workflow
 * audits, and restricts access to authenticated organization admins. All
 * accesses are expected to be logged for compliance/audit.
 *
 * @param props - Request parameters
 * @param props.organizationAdmin - Authenticated administrator information
 * @param props.departmentHeadId - The unique department head ID to look up
 *   (UUID)
 * @returns Complete department head details (all fields in DTO). Returns error
 *   if department head does not exist or has been deleted (soft-deleted)
 * @throws {Error} If record not found or access denied
 */
export async function gethealthcarePlatformOrganizationAdminDepartmentheadsDepartmentHeadId(props: {
  organizationAdmin: OrganizationadminPayload;
  departmentHeadId: string & tags.Format<"uuid">;
}): Promise<IHealthcarePlatformDepartmentHead> {
  const { organizationAdmin, departmentHeadId } = props;

  // Fetch the department head (excluding soft-deleted)
  const record =
    await MyGlobal.prisma.healthcare_platform_departmentheads.findFirst({
      where: {
        id: departmentHeadId,
        deleted_at: null,
      },
    });

  if (!record) {
    throw new Error("Department head not found or has been deleted.");
  }

  //
  // TODO: Log access for audit using a suitable audit table if required
  //

  return {
    id: record.id,
    email: record.email,
    full_name: record.full_name,
    phone: record.phone ?? undefined,
    created_at: toISOStringSafe(record.created_at),
    updated_at: toISOStringSafe(record.updated_at),
    deleted_at: record.deleted_at
      ? toISOStringSafe(record.deleted_at)
      : undefined,
  };
}
