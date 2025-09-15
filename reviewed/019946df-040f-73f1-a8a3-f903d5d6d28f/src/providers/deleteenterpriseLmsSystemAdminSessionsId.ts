import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * Erase a LMS user session permanently.
 *
 * This function permanently deletes a session record (enterprise_lms_sessions)
 * by its unique ID. It bypasses soft deletion and removes the session
 * completely, thereby revoking user access and invalidating session tokens.
 *
 * Authorization is enforced via the presence of an authenticated systemAdmin in
 * props.
 *
 * @param props - Object containing parameters for the operation
 * @param props.systemAdmin - The authenticated system administrator performing
 *   the deletion
 * @param props.id - UUID of the session to be deleted
 * @throws {Error} Throws if the session is not found (404 error)
 */
export async function deleteenterpriseLmsSystemAdminSessionsId(props: {
  systemAdmin: SystemadminPayload;
  id: string & tags.Format<"uuid">;
}): Promise<void> {
  const { systemAdmin, id } = props;

  // Ensure the session exists; throws if not found
  await MyGlobal.prisma.enterprise_lms_sessions.findUniqueOrThrow({
    where: { id },
  });

  // Hard delete the session
  await MyGlobal.prisma.enterprise_lms_sessions.delete({
    where: { id },
  });
}
