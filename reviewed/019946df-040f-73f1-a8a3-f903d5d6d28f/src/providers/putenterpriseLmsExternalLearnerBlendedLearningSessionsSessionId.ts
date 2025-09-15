import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IEnterpriseLmsBlendedLearningSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsBlendedLearningSession";
import { ExternallearnerPayload } from "../decorators/payload/ExternallearnerPayload";

/**
 * Update an existing blended learning session by its ID
 *
 * This operation updates the blended learning session details for a given
 * sessionId, enforcing tenant isolation and role-based authorization for
 * external learner access.
 *
 * @param props - The input properties including the externalLearner payload,
 *   sessionId, and the update body
 * @returns The updated blended learning session entity
 * @throws {Error} When the session is not found
 * @throws {Error} When the external learner's tenant does not match the session
 */
export async function putenterpriseLmsExternalLearnerBlendedLearningSessionsSessionId(props: {
  externalLearner: ExternallearnerPayload;
  sessionId: string & tags.Format<"uuid">;
  body: IEnterpriseLmsBlendedLearningSession.IUpdate;
}): Promise<IEnterpriseLmsBlendedLearningSession> {
  const { externalLearner, sessionId, body } = props;

  const session =
    await MyGlobal.prisma.enterprise_lms_blended_learning_sessions.findUnique({
      where: { id: sessionId },
    });

  if (!session) {
    throw new Error("Blended learning session not found");
  }

  if (session.tenant_id !== externalLearner.id) {
    throw new Error("Unauthorized: tenant mismatch");
  }

  const updated =
    await MyGlobal.prisma.enterprise_lms_blended_learning_sessions.update({
      where: { id: sessionId },
      data: {
        ...(body.session_type !== undefined && {
          session_type: body.session_type,
        }),
        ...(body.title !== undefined && { title: body.title }),
        ...(body.description !== undefined && {
          description: body.description,
        }),
        ...(body.status !== undefined && { status: body.status }),
        ...(body.scheduled_start_at !== undefined && {
          scheduled_start_at: body.scheduled_start_at,
        }),
        ...(body.scheduled_end_at !== undefined && {
          scheduled_end_at: body.scheduled_end_at,
        }),
        ...(body.actual_start_at !== undefined && {
          actual_start_at: body.actual_start_at,
        }),
        ...(body.actual_end_at !== undefined && {
          actual_end_at: body.actual_end_at,
        }),
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
