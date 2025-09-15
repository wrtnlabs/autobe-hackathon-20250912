import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IEnterpriseLmsAssessments } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsAssessments";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * Retrieve detailed information of a specific Enterprise LMS assessment by ID.
 *
 * This operation fetches comprehensive assessment details including all
 * metadata fields. Access is restricted to authorized systemAdmin users
 * belonging to the same tenant as the assessment.
 *
 * @param props - Object containing systemAdmin payload and assessment ID.
 * @param props.systemAdmin - Authenticated systemAdmin user payload.
 * @param props.assessmentId - UUID identifier of the assessment to be
 *   retrieved.
 * @returns The detailed assessment entity conforming to
 *   IEnterpriseLmsAssessments.
 * @throws {Error} When assessment is not found (404).
 * @throws {Error} When user is unauthorized to access the assessment (403).
 */
export async function getenterpriseLmsSystemAdminAssessmentsAssessmentId(props: {
  systemAdmin: SystemadminPayload;
  assessmentId: string & tags.Format<"uuid">;
}): Promise<IEnterpriseLmsAssessments> {
  const { systemAdmin, assessmentId } = props;

  // Fetch assessment from DB, ensure not deleted
  const assessment = await MyGlobal.prisma.enterprise_lms_assessments.findFirst(
    {
      where: {
        id: assessmentId,
        deleted_at: null,
      },
    },
  );

  if (!assessment) {
    throw new Error("Assessment not found");
  }

  // Fetch systemAdmin with tenant info
  const systemAdminRecord =
    await MyGlobal.prisma.enterprise_lms_systemadmin.findUnique({
      where: { id: systemAdmin.id },
    });

  if (
    !systemAdminRecord ||
    systemAdminRecord.deleted_at !== null ||
    systemAdminRecord.status !== "active"
  ) {
    throw new Error("Unauthorized");
  }

  // Verify tenant match
  if (systemAdminRecord.tenant_id !== assessment.tenant_id) {
    throw new Error("Unauthorized");
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
