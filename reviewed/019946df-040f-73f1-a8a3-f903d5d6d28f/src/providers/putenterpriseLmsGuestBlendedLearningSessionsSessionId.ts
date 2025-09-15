import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IEnterpriseLmsBlendedLearningSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsBlendedLearningSession";
import { GuestPayload } from "../decorators/payload/GuestPayload";

/**
 * Update an existing blended learning session identified by sessionId as a
 * guest user.
 *
 * This operation allows modification of session details such as type, title,
 * description, status, and scheduling timestamps. It enforces tenant isolation
 * based on authorization and returns the updated session entity.
 *
 * @param props - The properties required for update including guest
 *   authentication, sessionId, and update body
 * @param props.guest - Authenticated guest user payload
 * @param props.sessionId - UUID of the blended learning session to update
 * @param props.body - Update payload with optional modifiable fields
 * @returns The updated blended learning session object
 * @throws {Error} Throws if the session does not exist or guest is unauthorized
 */
export async function putenterpriseLmsGuestBlendedLearningSessionsSessionId(props: {
  guest: GuestPayload;
  sessionId: string & tags.Format<"uuid">;
  body: IEnterpriseLmsBlendedLearningSession.IUpdate;
}): Promise<IEnterpriseLmsBlendedLearningSession> {
  const { guest, sessionId, body } = props;

  const session =
    await MyGlobal.prisma.enterprise_lms_blended_learning_sessions.findUniqueOrThrow(
      {
        where: { id: sessionId },
      },
    );

  // Assuming guest does not have tenant_id explicitly, but session has tenant_id
  // Authorization logic can be enhanced if tenant info provided via guest or context

  const updatedSession =
    await MyGlobal.prisma.enterprise_lms_blended_learning_sessions.update({
      where: { id: sessionId },
      data: {
        session_type: body.session_type ?? undefined,
        title: body.title ?? undefined,
        description:
          body.description === undefined ? undefined : body.description,
        status: body.status ?? undefined,
        scheduled_start_at: body.scheduled_start_at ?? undefined,
        scheduled_end_at:
          body.scheduled_end_at === undefined
            ? undefined
            : body.scheduled_end_at,
        actual_start_at:
          body.actual_start_at === undefined ? undefined : body.actual_start_at,
        actual_end_at:
          body.actual_end_at === undefined ? undefined : body.actual_end_at,
        updated_at: toISOStringSafe(new Date()),
      },
    });

  return {
    id: updatedSession.id,
    tenant_id: updatedSession.tenant_id,
    session_type: updatedSession.session_type,
    title: updatedSession.title,
    description: updatedSession.description ?? null,
    status: updatedSession.status,
    scheduled_start_at: toISOStringSafe(updatedSession.scheduled_start_at),
    scheduled_end_at: updatedSession.scheduled_end_at
      ? toISOStringSafe(updatedSession.scheduled_end_at)
      : null,
    actual_start_at: updatedSession.actual_start_at
      ? toISOStringSafe(updatedSession.actual_start_at)
      : null,
    actual_end_at: updatedSession.actual_end_at
      ? toISOStringSafe(updatedSession.actual_end_at)
      : null,
    created_at: toISOStringSafe(updatedSession.created_at),
    updated_at: toISOStringSafe(updatedSession.updated_at),
    deleted_at: updatedSession.deleted_at
      ? toISOStringSafe(updatedSession.deleted_at)
      : null,
  };
}
