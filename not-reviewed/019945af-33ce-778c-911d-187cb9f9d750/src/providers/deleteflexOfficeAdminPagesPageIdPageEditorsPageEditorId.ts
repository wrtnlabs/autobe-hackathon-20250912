import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Soft-delete a page editor session by page ID and page editor ID.
 *
 * This operation marks the editor session as deleted by setting the
 * `deleted_at` timestamp, while retaining the record for audit purposes. It
 * ensures the collaborative editing session counts remain accurate by marking
 * sessions inactive without physical deletion.
 *
 * Requires admin role authorization.
 *
 * @param props - Object containing admin authorization and identifiers
 * @param props.admin - The authenticated admin performing the operation
 * @param props.pageId - UUID of the UI page the editor session belongs to
 * @param props.pageEditorId - UUID of the page editor session to soft-delete
 * @throws {Error} Throws if the specified page editor session does not exist
 */
export async function deleteflexOfficeAdminPagesPageIdPageEditorsPageEditorId(props: {
  admin: AdminPayload;
  pageId: string & tags.Format<"uuid">;
  pageEditorId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { admin, pageId, pageEditorId } = props;

  // Find the active editor session
  const session = await MyGlobal.prisma.flex_office_page_editors.findFirst({
    where: {
      id: pageEditorId,
      page_id: pageId,
      deleted_at: null,
    },
  });

  if (!session) {
    throw new Error("Page editor session not found");
  }

  // Soft delete: set deleted_at and updated_at to current timestamp
  const now = toISOStringSafe(new Date());

  await MyGlobal.prisma.flex_office_page_editors.update({
    where: { id: pageEditorId },
    data: {
      deleted_at: now,
      updated_at: now,
    },
  });
}
