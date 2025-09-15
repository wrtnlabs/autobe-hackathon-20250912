import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformDepartmentHead } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformDepartmentHead";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * Get a department head's full record by ID
 * (healthcare_platform_departmentheads)
 *
 * This endpoint retrieves the complete details of a department head from the
 * 'healthcare_platform_departmentheads' table, identified by the provided
 * departmentHeadId parameter. It returns all profile, contact, and timestamp
 * metadata, regardless of soft-deletion state, for use in audits, staff
 * management, or compliance review workflows. Access is restricted to users
 * with platform-wide roles (systemAdmin authorization required). Every access
 * is logged for audit purposes in the 'healthcare_platform_audit_logs' table.
 *
 * @param props - Request properties
 * @param props.systemAdmin - Authenticated system admin payload performing the
 *   operation
 * @param props.departmentHeadId - Unique identifier for the department head to
 *   retrieve
 * @returns Full department head record with all fields, suitable for
 *   audit/compliance
 * @throws {Error} If the department head does not exist
 */
export async function gethealthcarePlatformSystemAdminDepartmentheadsDepartmentHeadId(props: {
  systemAdmin: SystemadminPayload;
  departmentHeadId: string & tags.Format<"uuid">;
}): Promise<IHealthcarePlatformDepartmentHead> {
  const { systemAdmin, departmentHeadId } = props;

  // Retrieve department head record (regardless of soft-delete status)
  const departmentHead =
    await MyGlobal.prisma.healthcare_platform_departmentheads.findUnique({
      where: { id: departmentHeadId },
    });
  if (!departmentHead) {
    throw new Error("Department head not found");
  }

  // Log audit access for compliance
  await MyGlobal.prisma.healthcare_platform_audit_logs.create({
    data: {
      id: v4(),
      user_id: systemAdmin.id,
      organization_id: null,
      action_type: "STAFF_DETAIL_VIEW",
      event_context: null,
      ip_address: null,
      related_entity_type: "DEPARTMENT_HEAD",
      related_entity_id: departmentHeadId,
      created_at: toISOStringSafe(new Date()),
    },
  });

  // Map fields for API response (strict contract, all types as per DTO, no `as` or `Date` types)
  return {
    id: departmentHead.id,
    email: departmentHead.email,
    full_name: departmentHead.full_name,
    phone: departmentHead.phone ?? undefined,
    created_at: toISOStringSafe(departmentHead.created_at),
    updated_at: toISOStringSafe(departmentHead.updated_at),
    deleted_at: departmentHead.deleted_at
      ? toISOStringSafe(departmentHead.deleted_at)
      : undefined,
  };
}
