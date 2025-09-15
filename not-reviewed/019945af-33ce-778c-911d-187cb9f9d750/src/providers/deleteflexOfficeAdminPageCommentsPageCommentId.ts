import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Deletes a FlexOffice page comment by its unique identifier.
 *
 * This hard delete operation permanently removes the page comment record from
 * the database. The action requires authorization as an admin user.
 *
 * @param props - Object containing the admin payload and the UUID of the page
 *   comment
 * @param props.admin - The authenticated admin making the request
 * @param props.pageCommentId - The UUID of the page comment to delete
 * @throws {Error} Throws if the admin is not found or unauthorized
 * @throws {Error} Throws if the page comment with the given ID does not exist
 */
export async function deleteflexOfficeAdminPageCommentsPageCommentId(props: {
  admin: AdminPayload;
  pageCommentId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { admin, pageCommentId } = props;

  // Validate admin authorization by checking active admin record
  await MyGlobal.prisma.flex_office_admins.findUniqueOrThrow({
    where: { id: admin.id },
    select: { id: true },
  });

  // Validate existence of the page comment
  await MyGlobal.prisma.flex_office_page_comments.findUniqueOrThrow({
    where: { id: pageCommentId },
  });

  // Perform hard delete
  await MyGlobal.prisma.flex_office_page_comments.delete({
    where: { id: pageCommentId },
  });
}
