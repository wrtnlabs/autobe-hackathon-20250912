import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IFlexOfficeRoleAssignment } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeRoleAssignment";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Update an existing role assignment's details
 *
 * This operation updates the 'role_name' and optionally 'user_id' for an
 * existing role assignment identified by its unique ID. Authorization is
 * limited to administrators.
 *
 * @param props - Object containing admin authentication, role assignment ID,
 *   and update body
 * @param props.admin - Authenticated admin performing the update
 * @param props.id - UUID of the role assignment to update
 * @param props.body - Partial update fields for the role assignment
 * @returns Updated role assignment object conforming to
 *   IFlexOfficeRoleAssignment
 * @throws {Error} Throws if the role assignment does not exist
 */
export async function putflexOfficeAdminRoleAssignmentsId(props: {
  admin: AdminPayload;
  id: string & tags.Format<"uuid">;
  body: IFlexOfficeRoleAssignment.IUpdate;
}): Promise<IFlexOfficeRoleAssignment> {
  const { admin, id, body } = props;

  // Ensure the role assignment exists
  await MyGlobal.prisma.flex_office_role_assignments.findUniqueOrThrow({
    where: { id },
  });

  // Generate current timestamp for update
  const now = toISOStringSafe(new Date());

  // Update record with provided fields and set updated_at
  const updated = await MyGlobal.prisma.flex_office_role_assignments.update({
    where: { id },
    data: {
      user_id: body.user_id ?? undefined,
      role_name: body.role_name ?? undefined,
      updated_at: now,
    },
  });

  // Return updated record with proper date formatting
  return {
    id: updated.id,
    user_id: updated.user_id,
    role_name: updated.role_name,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at ? toISOStringSafe(updated.deleted_at) : null,
  };
}
