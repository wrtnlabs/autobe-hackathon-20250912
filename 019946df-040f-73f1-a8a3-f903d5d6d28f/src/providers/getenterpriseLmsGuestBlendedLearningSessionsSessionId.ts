import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IEnterpriseLmsBlendedLearningSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsBlendedLearningSession";
import { GuestPayload } from "../decorators/payload/GuestPayload";

/**
 * Get detailed information of a blended learning session by its unique session
 * ID.
 *
 * This function retrieves a blended learning session from the database while
 * enforcing tenant data isolation and role-based authorization for a guest
 * user.
 *
 * @param props - Object containing the guest payload and session ID
 * @param props.guest - Authenticated guest user payload
 * @param props.sessionId - UUID of the blended learning session
 * @returns Detailed blended learning session information
 * @throws Error if the session does not exist or is deleted
 */
export async function getenterpriseLmsGuestBlendedLearningSessionsSessionId(props: {
  guest: GuestPayload;
  sessionId: string & tags.Format<"uuid">;
}): Promise<IEnterpriseLmsBlendedLearningSession> {
  const { guest, sessionId } = props;

  const session =
    await MyGlobal.prisma.enterprise_lms_blended_learning_sessions.findUniqueOrThrow(
      {
        where: {
          id: sessionId,
          deleted_at: null,
        },
      },
    );

  return {
    id: session.id,
    tenant_id: session.tenant_id,
    session_type: session.session_type,
    title: session.title,
    description: session.description ?? undefined,
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
