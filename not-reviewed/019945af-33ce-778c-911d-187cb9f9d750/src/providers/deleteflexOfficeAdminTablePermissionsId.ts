import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Soft delete a table permission by ID.
 *
 * This operation marks the table permission entity as deleted by setting its
 * deleted_at timestamp to the current time instead of removing the record.
 *
 * Only active (not already deleted) records can be soft deleted.
 *
 * @param props - The request properties including admin and table permission
 *   ID.
 * @param props.admin - The authenticated admin performing the operation.
 * @param props.id - The UUID of the table permission to soft delete.
 * @throws {Error} Throws if the table permission does not exist or is already
 *   deleted.
 */
export async function deleteflexOfficeAdminTablePermissionsId(props: {
  admin: AdminPayload;
  id: string & tags.Format<"uuid">;
}): Promise<void> {
  const { admin, id } = props;

  const permission =
    await MyGlobal.prisma.flex_office_table_permissions.findUniqueOrThrow({
      where: { id },
    });

  if (permission.deleted_at !== null) {
    throw new Error("Table permission not found or already deleted");
  }

  await MyGlobal.prisma.flex_office_table_permissions.update({
    where: { id },
    data: {
      deleted_at: toISOStringSafe(new Date()),
    },
  });
}
