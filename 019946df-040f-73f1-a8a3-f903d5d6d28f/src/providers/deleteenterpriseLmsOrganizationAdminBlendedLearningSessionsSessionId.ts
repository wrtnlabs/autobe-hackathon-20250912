import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { OrganizationadminPayload } from "../decorators/payload/OrganizationadminPayload";

/**
 * Delete a specific blended learning session by sessionId from the Enterprise
 * LMS.
 *
 * This operation permanently removes the session record from the database. Only
 * users with organizationAdmin role are authorized.
 *
 * @param props - Object containing the organization admin payload and session
 *   id
 * @param props.organizationAdmin - The authorized organization admin performing
 *   the deletion
 * @param props.sessionId - The UUID of the blended learning session to delete
 * @throws {Error} When the session does not exist (404 error)
 * @throws {Error} When the organization admin does not belong to the session's
 *   tenant (403 error)
 */
export async function deleteenterpriseLmsOrganizationAdminBlendedLearningSessionsSessionId(props: {
  organizationAdmin: OrganizationadminPayload;
  sessionId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { organizationAdmin, sessionId } = props;

  const session =
    await MyGlobal.prisma.enterprise_lms_blended_learning_sessions.findUnique({
      where: { id: sessionId },
    });

  if (!session) {
    throw new Error("Blended learning session not found");
  }

  if (organizationAdmin.id !== session.tenant_id) {
    throw new Error("Unauthorized: Tenant mismatch");
  }

  await MyGlobal.prisma.enterprise_lms_blended_learning_sessions.delete({
    where: { id: sessionId },
  });
}
