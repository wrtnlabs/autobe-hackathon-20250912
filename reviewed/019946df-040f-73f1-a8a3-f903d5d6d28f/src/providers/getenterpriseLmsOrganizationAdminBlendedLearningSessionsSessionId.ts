import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IEnterpriseLmsBlendedLearningSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsBlendedLearningSession";
import { OrganizationadminPayload } from "../decorators/payload/OrganizationadminPayload";

/**
 * Retrieves detailed information of a blended learning session within the
 * tenant organization by its unique session ID.
 *
 * This operation enforces tenant-scoped access control by verifying that the
 * requesting organizationAdmin user belongs to the same tenant as the session.
 *
 * @param props - The parameter object containing the organizationAdmin payload
 *   and sessionId.
 * @param props.organizationAdmin - The authenticated organizationAdmin user
 *   payload.
 * @param props.sessionId - The UUID of the blended learning session to
 *   retrieve.
 * @returns The detailed blended learning session data.
 * @throws {Error} When the session does not belong to the same tenant as the
 *   organizationAdmin.
 * @throws {Error} When the session ID does not exist.
 */
export async function getenterpriseLmsOrganizationAdminBlendedLearningSessionsSessionId(props: {
  organizationAdmin: OrganizationadminPayload;
  sessionId: string & tags.Format<"uuid">;
}): Promise<IEnterpriseLmsBlendedLearningSession> {
  const { organizationAdmin, sessionId } = props;

  // Fetch organizationAdmin user to get tenant_id
  const organizationAdminUser =
    await MyGlobal.prisma.enterprise_lms_organizationadmin.findUniqueOrThrow({
      where: { id: organizationAdmin.id },
      select: { tenant_id: true },
    });

  // Fetch session by sessionId
  const session =
    await MyGlobal.prisma.enterprise_lms_blended_learning_sessions.findUniqueOrThrow(
      {
        where: { id: sessionId },
      },
    );

  // Authorization check: ensure session belongs to the same tenant
  if (session.tenant_id !== organizationAdminUser.tenant_id) {
    throw new Error("Unauthorized: session does not belong to your tenant");
  }

  return {
    id: session.id,
    tenant_id: session.tenant_id,
    session_type: session.session_type,
    title: session.title,
    description: session.description ?? null,
    status: session.status,
    scheduled_start_at: toISOStringSafe(session.scheduled_start_at),
    scheduled_end_at: session.scheduled_end_at
      ? toISOStringSafe(session.scheduled_end_at)
      : null,
    actual_start_at: session.actual_start_at
      ? toISOStringSafe(session.actual_start_at)
      : null,
    actual_end_at: session.actual_end_at
      ? toISOStringSafe(session.actual_end_at)
      : null,
    created_at: toISOStringSafe(session.created_at),
    updated_at: toISOStringSafe(session.updated_at),
    deleted_at: session.deleted_at ? toISOStringSafe(session.deleted_at) : null,
  };
}
