import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IFlexOfficeRoleAssignment } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeRoleAssignment";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Create a new role assignment linking a user to a role.
 *
 * This operation creates a record in the flex_office_role_assignments table
 * associating a user ID with a role name. Only administrators can perform this
 * operation.
 *
 * @param props - Object containing the admin payload and role assignment
 *   creation data.
 * @param props.admin - Authenticated admin performing the operation.
 * @param props.body - Data required to create the role assignment, including
 *   user_id and role_name.
 * @returns The newly created role assignment with all relevant fields.
 * @throws {Error} When database operation fails or input data is invalid.
 */
export async function postflexOfficeAdminRoleAssignments(props: {
  admin: AdminPayload;
  body: IFlexOfficeRoleAssignment.ICreate;
}): Promise<IFlexOfficeRoleAssignment> {
  const { admin, body } = props;

  const now = toISOStringSafe(new Date());
  const id = v4() as string & tags.Format<"uuid">;

  const created = await MyGlobal.prisma.flex_office_role_assignments.create({
    data: {
      id,
      user_id: body.user_id,
      role_name: body.role_name,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
  });

  return {
    id: created.id,
    user_id: created.user_id,
    role_name: created.role_name,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at: created.deleted_at ? toISOStringSafe(created.deleted_at) : null,
  };
}
