import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IEnterpriseLmsBlendedLearningSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsBlendedLearningSession";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * Create a new blended learning session.
 *
 * This operation creates a new blended learning session under the specified
 * tenant. The session includes session type (online, offline, hybrid), title,
 * description, status, and schedule timestamps.
 *
 * Authorization is required and the operation ensures the system administrator
 * can only create sessions within their tenant scope.
 *
 * Date-time fields are stored as ISO-formatted strings.
 *
 * @param props - Object containing system admin payload and creation data
 * @param props.systemAdmin - The authenticated system administrator performing
 *   the operation
 * @param props.body - The creation data for the blended learning session
 * @returns The newly created blended learning session entity
 * @throws {Error} If the tenant ID in the body does not match the system
 *   admin's tenant ID
 */
export async function postenterpriseLmsSystemAdminBlendedLearningSessions(props: {
  systemAdmin: SystemadminPayload;
  body: IEnterpriseLmsBlendedLearningSession.ICreate;
}): Promise<IEnterpriseLmsBlendedLearningSession> {
  const { systemAdmin, body } = props;

  if (systemAdmin.id !== body.tenant_id) {
    throw new Error("Unauthorized: Tenant ID mismatch");
  }

  const now = toISOStringSafe(new Date());

  const created =
    await MyGlobal.prisma.enterprise_lms_blended_learning_sessions.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
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
        deleted_at: null,
      },
    });

  return {
    id: created.id,
    tenant_id: created.tenant_id,
    session_type: created.session_type,
    title: created.title,
    description: created.description,
    status: created.status,
    scheduled_start_at: created.scheduled_start_at,
    scheduled_end_at: created.scheduled_end_at ?? null,
    actual_start_at: created.actual_start_at ?? null,
    actual_end_at: created.actual_end_at ?? null,
    created_at: created.created_at,
    updated_at: created.updated_at,
    deleted_at: null,
  };
}
