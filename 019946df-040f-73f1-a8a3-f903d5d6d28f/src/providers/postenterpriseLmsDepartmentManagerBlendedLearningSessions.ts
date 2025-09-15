import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IEnterpriseLmsBlendedLearningSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsBlendedLearningSession";
import { DepartmentmanagerPayload } from "../decorators/payload/DepartmentmanagerPayload";

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
 * @param props - Object containing the departmentManager payload and the create
 *   body
 * @param props.departmentManager - The authenticated department manager payload
 * @param props.body - The data for creating a new blended learning session
 * @returns The newly created blended learning session record
 * @throws {Error} When the authenticated user is unauthorized or invalid
 */
export async function postenterpriseLmsDepartmentManagerBlendedLearningSessions(props: {
  departmentManager: DepartmentmanagerPayload;
  body: IEnterpriseLmsBlendedLearningSession.ICreate;
}): Promise<IEnterpriseLmsBlendedLearningSession> {
  const { departmentManager, body } = props;

  // Authorization check: validate the departmentManager exists, active, and belongs to tenant
  const found =
    await MyGlobal.prisma.enterprise_lms_departmentmanager.findFirst({
      where: {
        id: departmentManager.id,
        tenant_id: body.tenant_id,
        status: "active",
        deleted_at: null,
      },
    });
  if (!found) {
    throw new Error("Unauthorized or invalid department manager");
  }

  // Prepare timestamps as ISO string branded types
  const now = toISOStringSafe(new Date());

  // Insert new blended learning session
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
    description: created.description ?? null,
    status: created.status,
    scheduled_start_at: created.scheduled_start_at,
    scheduled_end_at: created.scheduled_end_at ?? null,
    actual_start_at: created.actual_start_at ?? null,
    actual_end_at: created.actual_end_at ?? null,
    created_at: created.created_at,
    updated_at: created.updated_at,
    deleted_at: created.deleted_at ?? null,
  };
}
