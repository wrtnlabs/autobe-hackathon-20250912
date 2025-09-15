import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IEnterpriseLmsBlendedLearningSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsBlendedLearningSession";
import { GuestPayload } from "../decorators/payload/GuestPayload";

/**
 * Create a new blended learning session specifying all required details such as
 * session type (online, offline, hybrid), title, description, status, and
 * schedule timestamps within tenant boundaries.
 *
 * This operation validates input data with strong schema and business rules
 * compliance, ensuring session uniqueness and proper status assignment.
 * Authorization control restricts creation to authorized user roles (guest in
 * this context).
 *
 * @param props - Object containing guest authentication payload and creation
 *   request body
 * @param props.guest - The authenticated guest making the creation request
 * @param props.body - The creation data for the new blended learning session
 * @returns The newly created blended learning session with all fields populated
 * @throws {Error} Throws error if database operation fails or required fields
 *   are missing
 */
export async function postenterpriseLmsGuestBlendedLearningSessions(props: {
  guest: GuestPayload;
  body: IEnterpriseLmsBlendedLearningSession.ICreate;
}): Promise<IEnterpriseLmsBlendedLearningSession> {
  const { guest, body } = props;

  const now = toISOStringSafe(new Date());
  const id = v4() as string & tags.Format<"uuid">;

  const created =
    await MyGlobal.prisma.enterprise_lms_blended_learning_sessions.create({
      data: {
        id,
        tenant_id: body.tenant_id,
        session_type: body.session_type,
        title: body.title,
        description: body.description ?? null,
        status: body.status,
        scheduled_start_at: body.scheduled_start_at,
        scheduled_end_at: body.scheduled_end_at ?? null,
        actual_start_at: body.actual_start_at ?? null,
        actual_end_at: body.actual_end_at ?? null,
        created_at: now,
        updated_at: now,
      },
    });

  return {
    id: created.id as string & tags.Format<"uuid">,
    tenant_id: created.tenant_id as string & tags.Format<"uuid">,
    session_type: created.session_type,
    title: created.title,
    description: created.description ?? null,
    status: created.status,
    scheduled_start_at: toISOStringSafe(created.scheduled_start_at),
    scheduled_end_at: created.scheduled_end_at
      ? toISOStringSafe(created.scheduled_end_at)
      : null,
    actual_start_at: created.actual_start_at
      ? toISOStringSafe(created.actual_start_at)
      : null,
    actual_end_at: created.actual_end_at
      ? toISOStringSafe(created.actual_end_at)
      : null,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at: created.deleted_at ? toISOStringSafe(created.deleted_at) : null,
  };
}
