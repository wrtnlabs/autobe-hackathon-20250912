import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Hard delete a UI page permanently.
 *
 * This operation permanently removes the UI page identified by pageId and all
 * related entities including widgets, versions, editors, comments, and
 * conflicts through cascading deletes configured in the database.
 *
 * Only users with the admin role are authorized to perform this operation.
 *
 * @param props - Operation parameters.
 * @param props.admin - The authenticated admin performing the deletion.
 * @param props.pageId - UUID of the UI page to delete.
 * @returns Void
 * @throws {Error} Throws if the page does not exist (404) or other database
 *   errors occur.
 */
export async function deleteflexOfficeAdminPagesPageId(props: {
  admin: AdminPayload;
  pageId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { admin, pageId } = props;

  // Authorization is enforced by the presence of admin

  // Verify the existence of the page
  await MyGlobal.prisma.flex_office_pages.findUniqueOrThrow({
    where: { id: pageId },
  });

  // Perform hard delete
  await MyGlobal.prisma.flex_office_pages.delete({
    where: { id: pageId },
  });
}
