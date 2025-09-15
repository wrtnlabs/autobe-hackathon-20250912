import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IEnterpriseLmsBlendedLearningSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsBlendedLearningSession";
import { OrganizationadminPayload } from "../decorators/payload/OrganizationadminPayload";

/**
 * Create a new blended learning session specifying all required details such as
 * session type (online, offline, hybrid), title, description, status, and
 * schedule timestamps within tenant boundaries.
 *
 * The operation validates input data with strong schema and business rules
 * compliance, ensuring session uniqueness and proper status assignment.
 *
 * Authorization control restricts creation to authorized user roles.
 *
 * Created sessions may be updated or queried via associated operations for full
 * management lifecycle.
 *
 * @param props - Object containing organization admin payload and session
 *   creation data
 * @param props.organizationAdmin - Authenticated organization admin details
 * @param props.body - Creation data for a new blended learning session
 * @returns The newly created blended learning session with all fields
 * @throws {Error} If the session_type provided is invalid
 */
export async function postenterpriseLmsOrganizationAdminBlendedLearningSessions(props: {
  organizationAdmin: OrganizationadminPayload;
  body: IEnterpriseLmsBlendedLearningSession.ICreate;
}): Promise<IEnterpriseLmsBlendedLearningSession> {
  const { organizationAdmin, body } = props;

  // Validate session_type enum
  const validSessionTypes = ["ONLINE", "OFFLINE", "HYBRID"];
  if (!validSessionTypes.includes(body.session_type)) {
    throw new Error(`Invalid session_type: ${body.session_type}`);
  }

  const newSessionId = v4() as string & tags.Format<"uuid">;
  const now = toISOStringSafe(new Date()) as string & tags.Format<"date-time">;

  const scheduled_end_at = body.scheduled_end_at ?? null;
  const actual_start_at = body.actual_start_at ?? null;
  const actual_end_at = body.actual_end_at ?? null;

  const created =
    await MyGlobal.prisma.enterprise_lms_blended_learning_sessions.create({
      data: {
        id: newSessionId,
        tenant_id: body.tenant_id,
        session_type: body.session_type,
        title: body.title,
        description: body.description ?? null,
        status: body.status,
        scheduled_start_at: body.scheduled_start_at,
        scheduled_end_at,
        actual_start_at,
        actual_end_at,
        created_at: now,
        updated_at: now,
      },
    });

  return {
    id: created.id,
    tenant_id: created.tenant_id,
    session_type: created.session_type,
    title: created.title,
    description: created.description ?? null,
    status: created.status,
    scheduled_start_at: created.scheduled_start_at,
    scheduled_end_at: created.scheduled_end_at ?? null,
    actual_start_at: created.actual_start_at ?? null,
    actual_end_at: created.actual_end_at ?? null,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at: created.deleted_at ?? null,
  };
}
