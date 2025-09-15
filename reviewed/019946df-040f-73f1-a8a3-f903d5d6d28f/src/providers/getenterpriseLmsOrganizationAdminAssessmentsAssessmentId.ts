import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IEnterpriseLmsAssessments } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsAssessments";
import { OrganizationadminPayload } from "../decorators/payload/OrganizationadminPayload";

/**
 * Retrieve detailed information of a specific Enterprise LMS assessment by ID.
 *
 * This operation is authorized for organizationAdmin role holders. It ensures
 * the assessment belongs to the same tenant as the requesting
 * organizationAdmin. Unauthorized access or missing assessment results in
 * appropriate errors.
 *
 * @param props - Object containing authorization and target assessment ID
 * @param props.organizationAdmin - The authenticated organization admin making
 *   the request
 * @param props.assessmentId - UUID of the assessment to retrieve
 * @returns The detailed information of the specified assessment
 * @throws {Error} When the organizationAdmin is not active or found
 * @throws {Error} When the assessment is not found or access is forbidden
 */
export async function getenterpriseLmsOrganizationAdminAssessmentsAssessmentId(props: {
  organizationAdmin: OrganizationadminPayload;
  assessmentId: string & tags.Format<"uuid">;
}): Promise<IEnterpriseLmsAssessments> {
  const { organizationAdmin, assessmentId } = props;

  // Fetch organizationAdmin entity to get tenant_id and validate status
  const admin =
    await MyGlobal.prisma.enterprise_lms_organizationadmin.findUnique({
      where: { id: organizationAdmin.id },
      select: { tenant_id: true, status: true, deleted_at: true },
    });

  if (!admin || admin.deleted_at !== null || admin.status !== "active") {
    throw new Error("Unauthorized: Organization admin not active or not found");
  }

  const tenantId = admin.tenant_id;

  // Fetch assessment with tenant authorization
  const assessment = await MyGlobal.prisma.enterprise_lms_assessments.findFirst(
    {
      where: {
        id: assessmentId,
        tenant_id: tenantId,
        deleted_at: null,
      },
    },
  );

  if (!assessment) {
    throw new Error("Not Found: Assessment does not exist or access denied");
  }

  return {
    id: assessment.id,
    tenant_id: assessment.tenant_id,
    code: assessment.code,
    title: assessment.title,
    description: assessment.description ?? undefined,
    assessment_type: assessment.assessment_type,
    max_score: assessment.max_score,
    passing_score: assessment.passing_score,
    scheduled_start_at: assessment.scheduled_start_at
      ? toISOStringSafe(assessment.scheduled_start_at)
      : null,
    scheduled_end_at: assessment.scheduled_end_at
      ? toISOStringSafe(assessment.scheduled_end_at)
      : null,
    status: assessment.status,
    created_at: toISOStringSafe(assessment.created_at),
    updated_at: toISOStringSafe(assessment.updated_at),
    deleted_at: assessment.deleted_at
      ? toISOStringSafe(assessment.deleted_at)
      : null,
  };
}
