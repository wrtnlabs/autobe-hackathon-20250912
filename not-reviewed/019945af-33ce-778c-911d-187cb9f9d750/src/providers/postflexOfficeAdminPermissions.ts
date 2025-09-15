import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IFlexOfficePermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficePermission";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Create a new FlexOffice permission entity.
 *
 * This operation inserts a new record into the flex_office_permissions table
 * with the specified unique permission key, optional description, and status.
 *
 * Only admin users are authorized to perform this action.
 *
 * The server automatically generates creation and update timestamps.
 *
 * @param props - Object containing the admin payload and the creation data
 * @param props.admin - Authenticated admin performing the operation
 * @param props.body - The permission creation details
 * @returns The created permission entity with all standard fields
 * @throws {Error} Throws an error when a permission with the same key already
 *   exists
 */
export async function postflexOfficeAdminPermissions(props: {
  admin: AdminPayload;
  body: IFlexOfficePermission.ICreate;
}): Promise<IFlexOfficePermission> {
  const { admin, body } = props;

  // Check for existing permission key to ensure uniqueness
  const existing = await MyGlobal.prisma.flex_office_permissions.findFirst({
    where: {
      permission_key: body.permission_key,
      deleted_at: null,
    },
  });

  if (existing) {
    throw new Error(`Permission key '${body.permission_key}' already exists.`);
  }

  // Generate the new ID and timestamps
  const id = v4() as string & tags.Format<"uuid">;
  const now = toISOStringSafe(new Date());

  // Create new permission record
  const created = await MyGlobal.prisma.flex_office_permissions.create({
    data: {
      id,
      permission_key: body.permission_key,
      description: body.description ?? null,
      status: body.status,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
  });

  // Return the created record with converted date strings
  return {
    id: created.id,
    permission_key: created.permission_key,
    description: created.description ?? null,
    status: created.status,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at: created.deleted_at ? toISOStringSafe(created.deleted_at) : null,
  };
}
