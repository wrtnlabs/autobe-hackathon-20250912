import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IEnterpriseLmsAssessments } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsAssessments";
import { OrganizationadminPayload } from "../decorators/payload/OrganizationadminPayload";

/**
 * Create a new Enterprise LMS assessment record
 *
 * Creates a new assessment with detailed properties specifying code, title,
 * type, scoring criteria, schedule, and lifecycle status within the Enterprise
 * LMS.
 *
 * Only authorized organization administrators may perform this operation.
 *
 * @param props - Object containing the authenticated organizationAdmin and the
 *   assessment creation data
 * @param props.organizationAdmin - The authenticated organization administrator
 *   performing the operation
 * @param props.body - The assessment creation data according to
 *   IEnterpriseLmsAssessments.ICreate
 * @returns The newly created assessment record with system-generated UUID and
 *   timestamps
 * @throws {Error} When creation fails due to database or authorization issues
 */
export async function postenterpriseLmsOrganizationAdminAssessments(props: {
  organizationAdmin: OrganizationadminPayload;
  body: IEnterpriseLmsAssessments.ICreate;
}): Promise<IEnterpriseLmsAssessments> {
  const { organizationAdmin, body } = props;

  const id = v4() as string & tags.Format<"uuid">;
  const now = toISOStringSafe(new Date());

  const created = await MyGlobal.prisma.enterprise_lms_assessments.create({
    data: {
      id: id,
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
