import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * Delete content tag by ID
 *
 * This operation performs a permanent hard delete of the specified content tag
 * from the system. Restricted to system administrators for security and
 * governance purposes. Clients should ensure the tag is not referenced by other
 * entities before deletion to avoid referential integrity issues. Errors may
 * occur if the tag does not exist or if dependencies prevent deletion.
 *
 * @param props - Object containing the system administrator payload and the
 *   content tag ID to delete
 * @param props.systemAdmin - The authenticated system administrator performing
 *   the deletion
 * @param props.id - Unique identifier (UUID) of the content tag to be deleted
 * @throws {Error} When the content tag with the given ID does not exist
 * @throws {Error} When deletion fails due to referential integrity constraints
 */
export async function deleteenterpriseLmsSystemAdminContentTagsId(props: {
  systemAdmin: SystemadminPayload;
  id: string & tags.Format<"uuid">;
}): Promise<void> {
  await MyGlobal.prisma.enterprise_lms_content_tags.delete({
    where: { id: props.id },
  });
}
