import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IEnterpriseLmsBlendedLearningSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsBlendedLearningSession";
import { CorporatelearnerPayload } from "../decorators/payload/CorporatelearnerPayload";

/**
 * Retrieves detailed information about a single blended learning session
 * belonging to the tenant organization of the requesting corporate learner.
 *
 * Authorization enforces tenant isolation - users can only access sessions
 * within their tenant.
 *
 * @param props - Object containing corporateLearner payload and the sessionId
 * @param props.corporateLearner - Authenticated corporate learner payload
 *   containing tenant_id
 * @param props.sessionId - Unique UUID string identifying the blended learning
 *   session
 * @returns The detailed blended learning session data
 * @throws {Error} If the session does not exist or tenant mismatch occurs
 */
export async function getenterpriseLmsCorporateLearnerBlendedLearningSessionsSessionId(props: {
  corporateLearner: CorporatelearnerPayload;
  sessionId: string & tags.Format<"uuid">;
}): Promise<IEnterpriseLmsBlendedLearningSession> {
  const { corporateLearner, sessionId } = props;

  const session =
    await MyGlobal.prisma.enterprise_lms_blended_learning_sessions.findUniqueOrThrow(
      {
        where: { id: sessionId },
      },
    );

  if (session.tenant_id !== corporateLearner.tenant_id) {
    throw new Error("Unauthorized: Tenant mismatch");
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
