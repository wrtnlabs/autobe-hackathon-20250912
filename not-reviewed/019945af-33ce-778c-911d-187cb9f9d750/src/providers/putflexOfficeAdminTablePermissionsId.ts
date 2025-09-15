import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IFlexOfficeTablePermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeTablePermission";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Update a specific table permission in the FlexOffice system.
 *
 * This operation updates the details of a table permission record identified by
 * the given UUID. It ensures the record exists and is not soft deleted before
 * applying updates. It also validates the existence of the referenced
 * permission entity if permission_id is updated.
 *
 * Only authenticated administrators can perform this operation.
 *
 * @param props - Request properties including admin authentication, table
 *   permission ID, and the update body
 * @param props.admin - The authenticated admin user performing this operation
 * @param props.id - UUID of the table permission to update
 * @param props.body - Update data for the table permission
 * @returns The updated table permission object
 * @throws {Error} If the table permission does not exist or is soft deleted
 * @throws {Error} If the referenced permission_id does not exist or is soft
 *   deleted
 */
export async function putflexOfficeAdminTablePermissionsId(props: {
  admin: AdminPayload;
  id: string & tags.Format<"uuid">;
  body: IFlexOfficeTablePermission.IUpdate;
}): Promise<IFlexOfficeTablePermission> {
  const { admin, id, body } = props;

  // Verify the table permission record exists and is not soft deleted
  const existing =
    await MyGlobal.prisma.flex_office_table_permissions.findFirst({
      where: {
        id,
        deleted_at: null,
      },
    });
  if (!existing) {
    throw new Error(`Table permission with id ${id} not found or deleted.`);
  }

  // If permission_id update is requested, validate it exists and is active
  if (body.permission_id !== undefined) {
    const permission = await MyGlobal.prisma.flex_office_permissions.findFirst({
      where: {
        id: body.permission_id,
        deleted_at: null,
      },
    });
    if (!permission) {
      throw new Error(
        `Permission with id ${body.permission_id} not found or deleted.`,
      );
    }
  }

  // Perform update with provided fields, handle nullability correctly
  const updated = await MyGlobal.prisma.flex_office_table_permissions.update({
    where: { id },
    data: {
      permission_id: body.permission_id ?? undefined,
      table_name: body.table_name ?? undefined,
      deleted_at:
        body.deleted_at === null ? null : (body.deleted_at ?? undefined),
      updated_at: toISOStringSafe(new Date()),
    },
  });

  // Return the updated table permission with correct date conversions
  return {
    id: updated.id,
    permission_id: updated.permission_id,
    table_name: updated.table_name,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at ? toISOStringSafe(updated.deleted_at) : null,
  };
}
