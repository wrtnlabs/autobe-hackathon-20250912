import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Soft delete a FlexOffice editor user.
 *
 * This operation marks the editor user identified by `editorId` as deleted by
 * setting the `deleted_at` timestamp. It preserves audit logs and allows
 * potential recovery by deactivated accounts.
 *
 * Only administrative users are authorized to perform this operation.
 *
 * @param props - The properties required to perform the deletion
 * @param props.admin - The authenticated admin user performing the deletion
 * @param props.editorId - The UUID of the editor to delete
 * @throws {Error} Throws if the editor user does not exist
 */
export async function deleteflexOfficeAdminEditorsEditorId(props: {
  admin: AdminPayload;
  editorId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { admin, editorId } = props;

  // Check existence of editor, throws automatically if not found
  await MyGlobal.prisma.flex_office_editors.findUniqueOrThrow({
    where: { id: editorId },
  });

  // Set deletion timestamp as ISO string
  const deletedAt: string & tags.Format<"date-time"> = toISOStringSafe(
    new Date(),
  );

  // Update the editor's deleted_at field to mark soft deletion
  await MyGlobal.prisma.flex_office_editors.update({
    where: { id: editorId },
    data: { deleted_at: deletedAt },
  });
}
