import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * Delete a System Administrator user permanently.
 *
 * This operation removes the system administrator and all associated sessions
 * based on the specified systemadminId.
 *
 * @param props - The function properties
 * @param props.systemAdmin - Authenticated system administrator payload
 * @param props.systemadminId - Unique identifier of the system administrator to
 *   delete
 * @throws Will throw if the target system administrator does not exist
 */
export async function deleteenterpriseLmsSystemAdminSystemadminsSystemadminId(props: {
  systemAdmin: SystemadminPayload;
  systemadminId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { systemAdmin, systemadminId } = props;

  // Authorization is assumed to be handled before this function is called

  // Delete all sessions associated with the system administrator
  await MyGlobal.prisma.enterprise_lms_sessions.deleteMany({
    where: { user_id: systemadminId },
  });

  // Delete the system administrator themselves
  await MyGlobal.prisma.enterprise_lms_systemadmin.delete({
    where: { id: systemadminId },
  });
}
