import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IEnterpriseLmsBlendedLearningSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsBlendedLearningSession";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * Update an existing blended learning session by its ID.
 *
 * This operation allows a system administrator to modify details of a blended
 * learning session, including session type, title, description, status, and
 * scheduling timestamps.
 *
 * The function enforces that the session exists. Tenant isolation is assumed to
 * be managed externally or by system administrator global permissions.
 *
 * Date/time fields are consistently converted to ISO 8601 strings with
 * appropriate branding.
 *
 * @param props - Object containing the system administrator payload, session
 *   ID, and update body data
 * @param props.systemAdmin - The authenticated system administrator
 * @param props.sessionId - UUID of the blended learning session to update
 * @param props.body - Partial update information for the session
 * @returns The updated blended learning session with all fields
 * @throws Error if the session does not exist
 */
export async function putenterpriseLmsSystemAdminBlendedLearningSessionsSessionId(props: {
  systemAdmin: SystemadminPayload;
  sessionId: string & tags.Format<"uuid">;
  body: IEnterpriseLmsBlendedLearningSession.IUpdate;
}): Promise<IEnterpriseLmsBlendedLearningSession> {
  const { systemAdmin, sessionId, body } = props;

  // Find session to verify existence
  const session =
    await MyGlobal.prisma.enterprise_lms_blended_learning_sessions.findUnique({
      where: { id: sessionId },
    });

  if (!session)
    throw new Error(`Blended learning session not found: ${sessionId}`);

  // Authorization for tenant ownership is assumed handled externally for systemAdmin

  // Update the session
  const updated =
    await MyGlobal.prisma.enterprise_lms_blended_learning_sessions.update({
      where: { id: sessionId },
      data: {
        session_type: body.session_type ?? undefined,
        title: body.title ?? undefined,
        description: body.description ?? undefined,
        status: body.status ?? undefined,
        scheduled_start_at: body.scheduled_start_at ?? undefined,
        scheduled_end_at: body.scheduled_end_at ?? undefined,
        actual_start_at: body.actual_start_at ?? undefined,
        actual_end_at: body.actual_end_at ?? undefined,
        updated_at: toISOStringSafe(new Date()),
      },
    });

  return {
    id: updated.id,
    tenant_id: updated.tenant_id,
    session_type: updated.session_type,
    title: updated.title,
    description: updated.description ?? null,
    status: updated.status,
    scheduled_start_at: toISOStringSafe(updated.scheduled_start_at),
    scheduled_end_at: updated.scheduled_end_at
      ? toISOStringSafe(updated.scheduled_end_at)
      : null,
    actual_start_at: updated.actual_start_at
      ? toISOStringSafe(updated.actual_start_at)
      : null,
    actual_end_at: updated.actual_end_at
      ? toISOStringSafe(updated.actual_end_at)
      : null,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at ? toISOStringSafe(updated.deleted_at) : null,
  };
}
