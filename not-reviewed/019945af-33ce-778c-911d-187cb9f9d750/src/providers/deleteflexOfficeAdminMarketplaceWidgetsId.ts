import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Permanently deletes a marketplace widget by its UUID.
 *
 * This operation is authorized for admin users only. It performs a hard delete
 * from the database as soft delete is not supported.
 *
 * @param props - The function parameters including authenticated admin and
 *   widget ID
 * @param props.admin - The authenticated admin performing the deletion
 * @param props.id - UUID of the marketplace widget to delete
 * @throws {Error} Throws if the widget does not exist or deletion fails
 */
export async function deleteflexOfficeAdminMarketplaceWidgetsId(props: {
  admin: AdminPayload;
  id: string & tags.Format<"uuid">;
}): Promise<void> {
  const { admin, id } = props;

  // Directly perform hard delete
  await MyGlobal.prisma.flex_office_marketplace_widgets.delete({
    where: { id },
  });
}
