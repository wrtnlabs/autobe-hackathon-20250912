import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IEnterpriseLmsBlendedLearningSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsBlendedLearningSession";
import { ContentcreatorinstructorPayload } from "../decorators/payload/ContentcreatorinstructorPayload";

/**
 * Get detailed information of a blended learning session by its ID.
 *
 * This operation retrieves a single blended learning session that belongs to
 * the tenant of the authenticated contentCreatorInstructor user.
 *
 * @param props - Object containing the authenticated contentCreatorInstructor
 *   payload and session ID
 * @param props.contentCreatorInstructor - Authenticated
 *   contentCreatorInstructor user payload
 * @param props.sessionId - The UUID of the blended learning session to be
 *   retrieved
 * @returns A Promise resolving to IEnterpriseLmsBlendedLearningSession object
 * @throws {Error} When the session does not exist or has been soft-deleted
 * @throws {Error} When the authenticated user's tenant does not match the
 *   session's tenant
 */
export async function getenterpriseLmsContentCreatorInstructorBlendedLearningSessionsSessionId(props: {
  contentCreatorInstructor: ContentcreatorinstructorPayload;
  sessionId: string & tags.Format<"uuid">;
}): Promise<IEnterpriseLmsBlendedLearningSession> {
  const { contentCreatorInstructor, sessionId } = props;

  const record =
    await MyGlobal.prisma.enterprise_lms_blended_learning_sessions.findUniqueOrThrow(
      {
        where: { id: sessionId, deleted_at: null },
      },
    );

  if (record.tenant_id !== contentCreatorInstructor.id) {
    throw new Error("Unauthorized: Tenant mismatch");
  }

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
