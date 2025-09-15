import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IEnterpriseLmsBlendedLearningSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsBlendedLearningSession";
import { CorporatelearnerPayload } from "../decorators/payload/CorporatelearnerPayload";

/**
 * Update an existing blended learning session by its ID.
 *
 * This operation updates the blended learning session details for the tenant
 * associated with the authenticated corporate learner. It enforces strict
 * tenant isolation, allowing only users belonging to the tenant to update the
 * session. All date fields are properly converted and nullable fields are
 * handled correctly.
 *
 * @param props - Object containing corporate learner payload, sessionId to
 *   update, and the update body containing modifiable fields.
 * @returns The updated blended learning session entity.
 * @throws {Error} If the session does not belong to the corporate learner's
 *   tenant.
 */
export async function putenterpriseLmsCorporateLearnerBlendedLearningSessionsSessionId(props: {
  corporateLearner: CorporatelearnerPayload;
  sessionId: string & tags.Format<"uuid">;
  body: IEnterpriseLmsBlendedLearningSession.IUpdate;
}): Promise<IEnterpriseLmsBlendedLearningSession> {
  const { corporateLearner, sessionId, body } = props;

  const currentTimestamp = toISOStringSafe(new Date());

  const existingSession =
    await MyGlobal.prisma.enterprise_lms_blended_learning_sessions.findUniqueOrThrow(
      {
        where: { id: sessionId },
      },
    );

  if (existingSession.tenant_id !== corporateLearner.id) {
    throw new Error("Unauthorized: Session does not belong to the tenant");
  }

  const updated =
    await MyGlobal.prisma.enterprise_lms_blended_learning_sessions.update({
      where: { id: sessionId },
      data: {
        session_type: body.session_type ?? undefined,
        title: body.title ?? undefined,
        description:
          body.description === null ? null : (body.description ?? undefined),
        status: body.status ?? undefined,
        scheduled_start_at: body.scheduled_start_at ?? undefined,
        scheduled_end_at:
          body.scheduled_end_at === null
            ? null
            : (body.scheduled_end_at ?? undefined),
        actual_start_at:
          body.actual_start_at === null
            ? null
            : (body.actual_start_at ?? undefined),
        actual_end_at:
          body.actual_end_at === null
            ? null
            : (body.actual_end_at ?? undefined),
        updated_at: currentTimestamp,
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
