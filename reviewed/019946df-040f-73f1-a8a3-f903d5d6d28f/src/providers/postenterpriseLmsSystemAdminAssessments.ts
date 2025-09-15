import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IEnterpriseLmsAssessments } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsAssessments";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * Create a new Enterprise LMS assessment record
 *
 * This endpoint creates a new assessment within the Enterprise LMS platform
 * specifying code, title, type, scoring criteria, scheduled dates, and status.
 * Only authorized system administrators can perform this operation.
 *
 * @param props - Object containing systemAdmin authentication and assessment
 *   data
 * @param props.systemAdmin - Authenticated systemAdmin user payload
 * @param props.body - Assessment creation data excluding system-generated
 *   fields
 * @returns The newly created assessment record with all fields populated
 * @throws {Error} When creation fails due to database errors or invalid data
 */
export async function postenterpriseLmsSystemAdminAssessments(props: {
  systemAdmin: SystemadminPayload;
  body: IEnterpriseLmsAssessments.ICreate;
}): Promise<IEnterpriseLmsAssessments> {
  const { systemAdmin, body } = props;

  // Generate UUID for new assessment
  const id = v4() as string & tags.Format<"uuid">;

  // Current timestamp in ISO string format
  const now = toISOStringSafe(new Date());

  // Prepare create input following API and schema specs
  const createInput = {
    id,
    tenant_id: body.tenant_id,
    code: body.code,
    title: body.title,
    description: body.description ?? null,
    assessment_type: body.assessment_type,
    max_score: body.max_score,
    passing_score: body.passing_score,
    scheduled_start_at: body.scheduled_start_at ?? null,
    scheduled_end_at: body.scheduled_end_at ?? null,
    status: body.status,
    created_at: now,
    updated_at: now,
    deleted_at: null,
  };

  // Create assessment record in the database
  const created = await MyGlobal.prisma.enterprise_lms_assessments.create({
    data: createInput,
  });

  // Return created record with date fields converted as ISO strings
  return {
    id: created.id as string & tags.Format<"uuid">,
    tenant_id: created.tenant_id as string & tags.Format<"uuid">,
    code: created.code,
    title: created.title,
    description: created.description ?? undefined,
    assessment_type: created.assessment_type,
    max_score: created.max_score,
    passing_score: created.passing_score,
    scheduled_start_at: created.scheduled_start_at
      ? toISOStringSafe(created.scheduled_start_at)
      : null,
    scheduled_end_at: created.scheduled_end_at
      ? toISOStringSafe(created.scheduled_end_at)
      : null,
    status: created.status,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at: created.deleted_at ? toISOStringSafe(created.deleted_at) : null,
  };
}
