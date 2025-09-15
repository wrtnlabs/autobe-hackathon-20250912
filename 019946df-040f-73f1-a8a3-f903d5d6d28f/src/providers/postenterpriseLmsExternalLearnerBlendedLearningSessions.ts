import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IEnterpriseLmsBlendedLearningSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsBlendedLearningSession";
import { ExternallearnerPayload } from "../decorators/payload/ExternallearnerPayload";

/**
 * Create a new blended learning session specifying all required details such as
 * session type (online, offline, hybrid), title, description, status, and
 * schedule timestamps within tenant boundaries.
 *
 * This operation enforces strict tenant scope, ensuring that external learners
 * can only create sessions within their own tenant.
 *
 * @param props - Object containing the external learner payload and session
 *   creation data
 * @returns The newly created blended learning session with all system-generated
 *   fields
 * @throws {Error} If the externalLearner tenant_id does not match the creation
 *   request tenant_id
 */
export async function postenterpriseLmsExternalLearnerBlendedLearningSessions(props: {
  externalLearner: ExternallearnerPayload;
  body: IEnterpriseLmsBlendedLearningSession.ICreate;
}): Promise<IEnterpriseLmsBlendedLearningSession> {
  const { externalLearner, body } = props;

  if (externalLearner.tenant_id !== body.tenant_id) {
    throw new Error(
      "Tenant ID mismatch: unauthorized to create for this tenant",
    );
  }

  const id = v4() as string & tags.Format<"uuid">;
  const now = toISOStringSafe(new Date());

  const created =
    await MyGlobal.prisma.enterprise_lms_blended_learning_sessions.create({
      data: {
        id: id,
        tenant_id: body.tenant_id,
        session_type: body.session_type,
        title: body.title,
        description: body.description ?? null,
        status: body.status,
        scheduled_start_at: toISOStringSafe(body.scheduled_start_at),
        scheduled_end_at: body.scheduled_end_at
          ? toISOStringSafe(body.scheduled_end_at)
          : null,
        actual_start_at: body.actual_start_at
          ? toISOStringSafe(body.actual_start_at)
          : null,
        actual_end_at: body.actual_end_at
          ? toISOStringSafe(body.actual_end_at)
          : null,
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
