import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IEnterpriseLmsBlendedLearningSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsBlendedLearningSession";
import { DepartmentmanagerPayload } from "../decorators/payload/DepartmentmanagerPayload";

/**
 * Get detailed information of a blended learning session by its ID within the
 * tenant.
 *
 * Enforces tenant isolation to ensure department managers access only sessions
 * in their tenant. Converts all date fields to ISO 8601 strings branded as
 * date-time. Throws if the session does not exist or is soft-deleted.
 *
 * @param props - Parameters including departmentManager payload and sessionId
 *   UUID
 * @returns The detailed blended learning session information
 * @throws {Error} When the session does not exist or tenant isolation fails
 */
export async function getenterpriseLmsDepartmentManagerBlendedLearningSessionsSessionId(props: {
  departmentManager: DepartmentmanagerPayload;
  sessionId: string & tags.Format<"uuid">;
}): Promise<IEnterpriseLmsBlendedLearningSession> {
  const { departmentManager, sessionId } = props;

  const session =
    await MyGlobal.prisma.enterprise_lms_blended_learning_sessions.findFirstOrThrow(
      {
        where: {
          id: sessionId,
          tenant_id: departmentManager.tenant_id,
          deleted_at: null,
        },
      },
    );

  return {
    id: session.id,
    tenant_id: session.tenant_id,
    session_type: session.session_type,
    title: session.title,
    description: session.description ?? null,
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
