import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IEnterpriseLmsBlendedLearningSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsBlendedLearningSession";
import { ContentcreatorinstructorPayload } from "../decorators/payload/ContentcreatorinstructorPayload";

/**
 * Create a new blended learning session.
 *
 * This function ensures the authenticated contentCreatorInstructor's tenant_id
 * matches the one in the creation request. It creates a new
 * enterprise_lms_blended_learning_sessions record with generated UUID and
 * timestamps.
 *
 * @param props - Object containing contentCreatorInstructor and body (session
 *   creation data)
 * @returns The newly created IEnterpriseLmsBlendedLearningSession object with
 *   all fields populated.
 * @throws {Error} When tenant_id in body does not match authenticated user's
 *   tenant_id
 */
export async function postenterpriseLmsContentCreatorInstructorBlendedLearningSessions(props: {
  contentCreatorInstructor: ContentcreatorinstructorPayload;
  body: IEnterpriseLmsBlendedLearningSession.ICreate;
}): Promise<IEnterpriseLmsBlendedLearningSession> {
  const { contentCreatorInstructor, body } = props;

  if (contentCreatorInstructor.id !== body.tenant_id) {
    throw new Error("Unauthorized: tenant_id mismatch");
  }

  const id = v4() as string & tags.Format<"uuid">;
  const now = toISOStringSafe(new Date());

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
    scheduled_start_at: created.scheduled_start_at as string &
      tags.Format<"date-time">,
    scheduled_end_at: created.scheduled_end_at ?? null,
    actual_start_at: created.actual_start_at ?? null,
    actual_end_at: created.actual_end_at ?? null,
    created_at: created.created_at as string & tags.Format<"date-time">,
    updated_at: created.updated_at as string & tags.Format<"date-time">,
    deleted_at: null,
  };
}
