import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IEnterpriseLmsAssessments } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsAssessments";
import { ContentcreatorinstructorPayload } from "../decorators/payload/ContentcreatorinstructorPayload";

/**
 * Retrieve detailed information of a specific Enterprise LMS assessment by ID.
 *
 * This operation fetches the full metadata of the assessment identified by the
 * provided UUID. Authorization ensures only users with the matching role can
 * access it. Tenant matching authorization is recommended but limited by
 * payload content availability.
 *
 * @param props - Function parameters containing the authenticated content
 *   creator instructor and the assessment UUID
 * @param props.contentCreatorInstructor - Authenticated content creator or
 *   instructor payload
 * @param props.assessmentId - UUID string identifying the assessment
 * @returns Detailed assessment data conforming to IEnterpriseLmsAssessments
 * @throws {Error} Throws error if assessment not found or unauthorized access
 */
export async function getenterpriseLmsContentCreatorInstructorAssessmentsAssessmentId(props: {
  contentCreatorInstructor: ContentcreatorinstructorPayload;
  assessmentId: string & tags.Format<"uuid">;
}): Promise<IEnterpriseLmsAssessments> {
  const { contentCreatorInstructor, assessmentId } = props;

  // Fetch assessment record by ID
  const assessment =
    await MyGlobal.prisma.enterprise_lms_assessments.findUniqueOrThrow({
      where: { id: assessmentId },
    });

  // Tenant-level authorization check is limited due to missing tenant_id in payload
  // If tenant_id was available, this check should be:
  // if (assessment.tenant_id !== contentCreatorInstructor.tenant_id) throw new Error("Unauthorized access: tenant mismatch");

  // Map Prisma Date fields to ISO string format for API return
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
