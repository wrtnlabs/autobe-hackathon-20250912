import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * Delete a specific blended learning session by ID
 *
 * This operation permanently deletes a blended learning session identified by
 * its sessionId. Only systemAdmin role users are authorized to perform this
 * operation.
 *
 * @param props - Object containing systemAdmin payload and sessionId UUID
 * @param props.systemAdmin - Authenticated systemAdmin user payload
 * @param props.sessionId - UUID of the blended learning session to delete
 * @returns Void
 * @throws {Error} Throws if the session does not exist (404 behavior)
 * @throws {Error} Throws if unauthorized access occurs
 */
export async function deleteenterpriseLmsSystemAdminBlendedLearningSessionsSessionId(props: {
  systemAdmin: SystemadminPayload;
  sessionId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { systemAdmin, sessionId } = props;

  // Verify existence of the blended learning session
  await MyGlobal.prisma.enterprise_lms_blended_learning_sessions.findUniqueOrThrow(
    {
      where: { id: sessionId },
      select: { id: true },
    },
  );

  // Authorization check already assumed via provided systemAdmin payload

  // Perform hard delete of the blended learning session
  await MyGlobal.prisma.enterprise_lms_blended_learning_sessions.delete({
    where: { id: sessionId },
  });
}
