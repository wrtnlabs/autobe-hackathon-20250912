import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IEnterpriseLmsAssessments } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsAssessments";
import { ContentcreatorinstructorPayload } from "../decorators/payload/ContentcreatorinstructorPayload";

/**
 * Creates a new assessment record in the Enterprise LMS.
 *
 * This operation is restricted to authenticated content creator/instructor
 * roles. It inserts a new assessment into the enterprise_lms_assessments table,
 * generating UUID for id, and setting created/updated timestamps.
 *
 * @param props - The function properties including the authenticated user and
 *   request body
 * @returns The created assessment record with all system-generated fields
 *   populated
 * @throws {Error} Throws on database errors or Prisma failures
 */
export async function postenterpriseLmsContentCreatorInstructorAssessments(props: {
  contentCreatorInstructor: ContentcreatorinstructorPayload;
  body: IEnterpriseLmsAssessments.ICreate;
}): Promise<IEnterpriseLmsAssessments> {
  const { contentCreatorInstructor, body } = props;

  // Current ISO timestamp for created_at and updated_at
  const now = toISOStringSafe(new Date());

  // Create assessment record in database
  const created = await MyGlobal.prisma.enterprise_lms_assessments.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      tenant_id: body.tenant_id,
      code: body.code,
      title: body.title,
      description: body.description ?? undefined,
      assessment_type: body.assessment_type,
      max_score: body.max_score,
      passing_score: body.passing_score,
      scheduled_start_at: body.scheduled_start_at ?? undefined,
      scheduled_end_at: body.scheduled_end_at ?? undefined,
      status: body.status,
      created_at: now,
      updated_at: now,
    },
  });

  return {
    id: created.id,
    tenant_id: created.tenant_id,
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
