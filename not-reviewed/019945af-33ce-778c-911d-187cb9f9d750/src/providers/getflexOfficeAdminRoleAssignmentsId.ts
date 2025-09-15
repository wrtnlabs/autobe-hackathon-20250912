import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IFlexOfficeRoleAssignment } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeRoleAssignment";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Retrieves a specific role assignment by its unique identifier from the
 * database.
 *
 * This operation fetches the mapping between a user and their assigned role
 * within the FlexOffice system, enabling administrative auditing and role-based
 * access. Only authorized admin users may perform this operation.
 *
 * @param props - Object containing admin authentication and role assignment ID
 * @param props.admin - The authenticated admin user performing the retrieval
 * @param props.id - The unique UUID of the role assignment to retrieve
 * @returns The detailed role assignment matching the specified ID
 * @throws {Error} Throws if the role assignment with the given ID does not
 *   exist
 */
export async function getflexOfficeAdminRoleAssignmentsId(props: {
  admin: AdminPayload;
  id: string & tags.Format<"uuid">;
}): Promise<IFlexOfficeRoleAssignment> {
  const { admin, id } = props;

  const roleAssignment =
    await MyGlobal.prisma.flex_office_role_assignments.findUniqueOrThrow({
      where: { id },
    });

  return {
    id: roleAssignment.id,
    user_id: roleAssignment.user_id,
    role_name: roleAssignment.role_name,
    created_at: toISOStringSafe(roleAssignment.created_at),
    updated_at: toISOStringSafe(roleAssignment.updated_at),
    deleted_at: roleAssignment.deleted_at
      ? toISOStringSafe(roleAssignment.deleted_at)
      : null,
  };
}
