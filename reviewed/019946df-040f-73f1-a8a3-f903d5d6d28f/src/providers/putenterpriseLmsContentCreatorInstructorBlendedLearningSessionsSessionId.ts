import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IEnterpriseLmsBlendedLearningSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsBlendedLearningSession";
import { ContentcreatorinstructorPayload } from "../decorators/payload/ContentcreatorinstructorPayload";

/**
 * Update an existing blended learning session by its ID
 *
 * Updates the specified blended learning session with new details such as
 * session type, title, description, status, and scheduling. Enforces tenant
 * isolation and validates that the acting content creator instructor has access
 * rights.
 *
 * @param props - Request properties
 * @param props.contentCreatorInstructor - Authenticated content creator
 *   instructor performing the update
 * @param props.sessionId - UUID of the blended learning session to be updated
 * @param props.body - Update data for the blended learning session
 * @returns The updated blended learning session entity
 * @throws {Error} When session is not found
 * @throws {Error} When unauthorized access is attempted
 */
export async function putenterpriseLmsContentCreatorInstructorBlendedLearningSessionsSessionId(props: {
  contentCreatorInstructor: ContentcreatorinstructorPayload;
  sessionId: string & tags.Format<"uuid">;
  body: IEnterpriseLmsBlendedLearningSession.IUpdate;
}): Promise<IEnterpriseLmsBlendedLearningSession> {
  const { contentCreatorInstructor, sessionId, body } = props;

  // Fetch the existing session
  const session =
    await MyGlobal.prisma.enterprise_lms_blended_learning_sessions.findUniqueOrThrow(
      {
        where: { id: sessionId },
      },
    );

  // Authorization check: verify tenant isolation
  if (session.tenant_id !== contentCreatorInstructor.id) {
    throw new Error("Unauthorized: You do not have access to this session.");
  }

  // Prepare update data
  const updated =
    await MyGlobal.prisma.enterprise_lms_blended_learning_sessions.update({
      where: { id: sessionId },
      data: {
        ...(body.session_type !== undefined && {
          session_type: body.session_type,
        }),
        ...(body.title !== undefined && { title: body.title }),
        description:
          body.description === null ? null : (body.description ?? undefined),
        ...(body.status !== undefined && { status: body.status }),
        ...(body.scheduled_start_at !== undefined && {
          scheduled_start_at: toISOStringSafe(body.scheduled_start_at),
        }),
        scheduled_end_at:
          body.scheduled_end_at === null
            ? null
            : body.scheduled_end_at
              ? toISOStringSafe(body.scheduled_end_at)
              : undefined,
        actual_start_at:
          body.actual_start_at === null
            ? null
            : body.actual_start_at
              ? toISOStringSafe(body.actual_start_at)
              : undefined,
        actual_end_at:
          body.actual_end_at === null
            ? null
            : body.actual_end_at
              ? toISOStringSafe(body.actual_end_at)
              : undefined,
      },
    });

  // Return the updated session with all date fields converted
  return {
    id: updated.id as string & tags.Format<"uuid">,
    tenant_id: updated.tenant_id as string & tags.Format<"uuid">,
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
