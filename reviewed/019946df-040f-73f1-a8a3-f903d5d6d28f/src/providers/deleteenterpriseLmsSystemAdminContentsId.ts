import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * Delete a specific content record by its ID.
 *
 * Permanently deletes a content entity including all its metadata from the
 * Enterprise LMS database. The deletion is irreversible and removes the content
 * identified by the unique content ID provided as a path parameter. This
 * operation requires systemAdmin authorization.
 *
 * @param props - Object containing systemAdmin payload and content id
 * @param props.systemAdmin - Authenticated system administrator payload
 * @param props.id - Unique identifier of the target content
 * @throws {Error} Throws if deletion fails or content does not exist
 */
export async function deleteenterpriseLmsSystemAdminContentsId(props: {
  systemAdmin: SystemadminPayload;
  id: string & tags.Format<"uuid">;
}): Promise<void> {
  const { systemAdmin, id } = props;

  await MyGlobal.prisma.enterprise_lms_contents.delete({
    where: { id },
  });
}
