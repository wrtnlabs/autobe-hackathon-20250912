import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IEnterpriseLmsBlendedLearningSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsBlendedLearningSession";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * Get detailed information of a blended learning session by its session ID.
 *
 * Retrieves a single blended learning session record that is not soft-deleted.
 *
 * @param props - Object containing system admin authentication and session ID.
 * @param props.systemAdmin - Authenticated system admin payload for
 *   authorization.
 * @param props.sessionId - UUID of the blended learning session to retrieve.
 * @returns Detailed blended learning session data matching
 *   IEnterpriseLmsBlendedLearningSession.
 * @throws {Error} Throws if no session is found with the given ID or access is
 *   unauthorized.
 */
export async function getenterpriseLmsSystemAdminBlendedLearningSessionsSessionId(props: {
  systemAdmin: SystemadminPayload;
  sessionId: string & tags.Format<"uuid">;
}): Promise<IEnterpriseLmsBlendedLearningSession> {
  const { systemAdmin, sessionId } = props;

  const record =
    await MyGlobal.prisma.enterprise_lms_blended_learning_sessions.findUniqueOrThrow(
      {
        where: {
          id: sessionId,
          deleted_at: null,
        },
      },
    );

  return {
    id: record.id,
    tenant_id: record.tenant_id,
    session_type: record.session_type,
    title: record.title,
    description: record.description ?? null,
    status: record.status,
    scheduled_start_at: toISOStringSafe(record.scheduled_start_at),
    scheduled_end_at: record.scheduled_end_at
      ? toISOStringSafe(record.scheduled_end_at)
      : null,
    actual_start_at: record.actual_start_at
      ? toISOStringSafe(record.actual_start_at)
      : null,
    actual_end_at: record.actual_end_at
      ? toISOStringSafe(record.actual_end_at)
      : null,
    created_at: toISOStringSafe(record.created_at),
    updated_at: toISOStringSafe(record.updated_at),
    deleted_at: record.deleted_at ? toISOStringSafe(record.deleted_at) : null,
  };
}
