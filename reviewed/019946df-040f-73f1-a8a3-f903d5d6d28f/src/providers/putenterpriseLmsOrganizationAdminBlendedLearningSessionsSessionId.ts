import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IEnterpriseLmsBlendedLearningSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsBlendedLearningSession";
import { OrganizationadminPayload } from "../decorators/payload/OrganizationadminPayload";

/**
 * Updates an existing blended learning session identified by sessionId. Only
 * the organization admin belonging to the same tenant can perform this update.
 * The function respects nullable fields and converts all date fields to the
 * required ISO string with branding.
 *
 * @param props - Object containing organization admin auth, sessionId and
 *   update body
 * @returns The updated blended learning session information
 * @throws {Error} When session is not found
 * @throws {Error} When organization admin is not found
 * @throws {Error} When the session does not belong to the organization admin's
 *   tenant
 */
export async function putenterpriseLmsOrganizationAdminBlendedLearningSessionsSessionId(props: {
  organizationAdmin: OrganizationadminPayload;
  sessionId: string & tags.Format<"uuid">;
  body: IEnterpriseLmsBlendedLearningSession.IUpdate;
}): Promise<IEnterpriseLmsBlendedLearningSession> {
  const { organizationAdmin, sessionId, body } = props;

  // Verify session exists
  const session =
    await MyGlobal.prisma.enterprise_lms_blended_learning_sessions.findUnique({
      where: { id: sessionId },
    });
  if (!session) throw new Error("Blended learning session not found");

  // Fetch tenant_id of organization admin
  const orgAdminRecord =
    await MyGlobal.prisma.enterprise_lms_organizationadmin.findUnique({
      where: { id: organizationAdmin.id },
      select: { tenant_id: true },
    });
  if (!orgAdminRecord) throw new Error("Organization admin not found");

  // Check tenant ownership
  if (session.tenant_id !== orgAdminRecord.tenant_id) {
    throw new Error("Unauthorized: Tenant mismatch");
  }

  // Prepare update data
  const now = toISOStringSafe(new Date());
  const updateData: Partial<
    IEnterpriseLmsBlendedLearningSession.IUpdate & {
      updated_at: string & tags.Format<"date-time">;
    }
  > = {
    session_type: body.session_type ?? undefined,
    title: body.title ?? undefined,
    description: body.description ?? null,
    status: body.status ?? undefined,
    scheduled_start_at: body.scheduled_start_at ?? undefined,
    scheduled_end_at:
      body.scheduled_end_at === undefined ? undefined : body.scheduled_end_at,
    actual_start_at:
      body.actual_start_at === undefined ? undefined : body.actual_start_at,
    actual_end_at:
      body.actual_end_at === undefined ? undefined : body.actual_end_at,
    updated_at: now,
  };

  const updated =
    await MyGlobal.prisma.enterprise_lms_blended_learning_sessions.update({
      where: { id: sessionId },
      data: updateData,
    });

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
