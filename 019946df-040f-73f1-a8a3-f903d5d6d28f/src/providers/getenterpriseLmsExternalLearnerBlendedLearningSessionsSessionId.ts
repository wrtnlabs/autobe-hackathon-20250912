import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IEnterpriseLmsBlendedLearningSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsBlendedLearningSession";
import { ExternallearnerPayload } from "../decorators/payload/ExternallearnerPayload";

/**
 * Get detailed information of a blended learning session by its ID.
 *
 * Retrieves a single blended learning session belonging to the tenant of the
 * authenticated external learner. Enforces tenant-based authorization and
 * returns all session details including schedule and status.
 *
 * @param props - Request properties containing the external learner info and
 *   session ID
 * @param props.externalLearner - Authenticated external learner payload
 * @param props.sessionId - UUID of the blended learning session to retrieve
 * @returns Detailed blended learning session information conforming to
 *   IEnterpriseLmsBlendedLearningSession
 * @throws {Error} When the session is not found or the user is unauthorized
 */
export async function getenterpriseLmsExternalLearnerBlendedLearningSessionsSessionId(props: {
  externalLearner: ExternallearnerPayload;
  sessionId: string & tags.Format<"uuid">;
}): Promise<IEnterpriseLmsBlendedLearningSession> {
  const { externalLearner, sessionId } = props;

  // Retrieve the blended learning session ensuring tenant isolation and soft delete
  const session =
    await MyGlobal.prisma.enterprise_lms_blended_learning_sessions.findFirst({
      where: {
        id: sessionId,
        tenant_id: externalLearner.tenant_id,
        deleted_at: null,
      },
    });

  if (!session) {
    throw new Error("Blended learning session not found or unauthorized");
  }

  // Map and return the session with properly converted date strings
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
