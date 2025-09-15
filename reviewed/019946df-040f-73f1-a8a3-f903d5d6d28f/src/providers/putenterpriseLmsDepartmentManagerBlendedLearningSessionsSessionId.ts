import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IEnterpriseLmsBlendedLearningSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsBlendedLearningSession";
import { DepartmentmanagerPayload } from "../decorators/payload/DepartmentmanagerPayload";

/**
 * Updates an existing blended learning session in the enterprise LMS.
 *
 * This function updates session properties such as session type, title,
 * description, status, and scheduling timestamps for a given session ID. All
 * updates are scoped to the tenant of the authenticated department manager to
 * ensure tenant data isolation and security.
 *
 * @param props - Object containing the authenticated department manager,
 *   session ID, and update body.
 * @param props.departmentManager - The authenticated department manager
 *   performing the update.
 * @param props.sessionId - The unique UUID identifying the session to be
 *   updated.
 * @param props.body - The update data for the blended learning session.
 * @returns The updated blended learning session entity with all timestamps
 *   properly formatted as ISO 8601 date-time strings.
 * @throws {Error} Throws if the session does not belong to the department
 *   manager's tenant, or if the session is not found.
 */
export async function putenterpriseLmsDepartmentManagerBlendedLearningSessionsSessionId(props: {
  departmentManager: DepartmentmanagerPayload;
  sessionId: string & tags.Format<"uuid">;
  body: IEnterpriseLmsBlendedLearningSession.IUpdate;
}): Promise<IEnterpriseLmsBlendedLearningSession> {
  const { departmentManager, sessionId, body } = props;

  // Retrieve session record or throw if not found
  const session =
    await MyGlobal.prisma.enterprise_lms_blended_learning_sessions.findUniqueOrThrow(
      {
        where: { id: sessionId },
      },
    );

  // Authorization check: ensure session belongs to department manager's tenant
  if (session.tenant_id !== departmentManager.tenant_id) {
    throw new Error("Unauthorized: Tenant mismatch");
  }

  // Set current timestamp for updated_at
  const now = toISOStringSafe(new Date());

  // Update only provided fields, including updated_at
  const updated =
    await MyGlobal.prisma.enterprise_lms_blended_learning_sessions.update({
      where: { id: sessionId },
      data: {
        ...(body.session_type !== undefined && {
          session_type: body.session_type,
        }),
        ...(body.title !== undefined && { title: body.title }),
        ...(body.description !== undefined
          ? { description: body.description }
          : {}),
        ...(body.status !== undefined && { status: body.status }),
        ...(body.scheduled_start_at !== undefined && {
          scheduled_start_at: body.scheduled_start_at,
        }),
        ...(body.scheduled_end_at !== undefined
          ? { scheduled_end_at: body.scheduled_end_at }
          : {}),
        ...(body.actual_start_at !== undefined
          ? { actual_start_at: body.actual_start_at }
          : {}),
        ...(body.actual_end_at !== undefined
          ? { actual_end_at: body.actual_end_at }
          : {}),
        updated_at: now,
      },
    });

  // Return updated entity with date fields converted to ISO strings
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
