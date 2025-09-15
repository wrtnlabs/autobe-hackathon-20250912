import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * Delete a content access control record identified by its unique ID.
 *
 * This endpoint permanently removes the access control rule from the system,
 * performing a hard delete operation.
 *
 * Authorization is restricted to system administrators.
 *
 * @param props - Object containing the systemAdmin payload and the ID of the
 *   record to delete
 * @param props.systemAdmin - Authenticated system administrator payload
 * @param props.id - UUID of the content access control record
 * @throws {Error} Throws when the record does not exist
 */
export async function deleteenterpriseLmsSystemAdminContentAccessControlsId(props: {
  systemAdmin: SystemadminPayload;
  id: string & tags.Format<"uuid">;
}): Promise<void> {
  const { systemAdmin, id } = props;

  // Verify the content access control record exists
  const record =
    await MyGlobal.prisma.enterprise_lms_content_access_controls.findUnique({
      where: { id },
    });

  if (!record) {
    throw new Error("Content Access Control record not found");
  }

  // Permanently delete the content access control record
  await MyGlobal.prisma.enterprise_lms_content_access_controls.delete({
    where: { id },
  });
}
