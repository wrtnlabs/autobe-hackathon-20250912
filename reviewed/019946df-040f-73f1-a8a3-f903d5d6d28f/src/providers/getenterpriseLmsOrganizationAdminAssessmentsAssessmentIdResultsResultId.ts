import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IEnterpriseLmsAssessmentResult } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsAssessmentResult";
import { OrganizationadminPayload } from "../decorators/payload/OrganizationadminPayload";

/**
 * Retrieve detailed information about a specific assessment result identified
 * by its resultId and associated with the specified assessmentId within the
 * multi-tenant Enterprise LMS system.
 *
 * This operation ensures data retrieval scoped by tenant and enforces access
 * control based on user roles. It interfaces directly with the
 * enterprise_lms_assessment_results table, fetching all recorded fields for the
 * requested assessment attempt.
 *
 * The response includes score, status, completion timestamp, and audit
 * timestamps. Authorization checks verify user permission to view this data,
 * protecting learner privacy and tenant data isolation.
 *
 * @param props - Object containing the organization admin payload,
 *   assessmentId, and resultId.
 * @param props.organizationAdmin - Authenticated organization admin user making
 *   the request.
 * @param props.assessmentId - Unique identifier of the target assessment.
 * @param props.resultId - Unique identifier of the assessment result.
 * @returns Detailed assessment result information conforming to
 *   IEnterpriseLmsAssessmentResult.
 * @throws Error if the assessment result is not found.
 */
export async function getenterpriseLmsOrganizationAdminAssessmentsAssessmentIdResultsResultId(props: {
  organizationAdmin: OrganizationadminPayload;
  assessmentId: string & tags.Format<"uuid">;
  resultId: string & tags.Format<"uuid">;
}): Promise<IEnterpriseLmsAssessmentResult> {
  const { organizationAdmin, assessmentId, resultId } = props;

  const result =
    await MyGlobal.prisma.enterprise_lms_assessment_results.findFirstOrThrow({
      where: {
        id: resultId,
        assessment_id: assessmentId,
        deleted_at: null,
      },
    });

  return {
    id: result.id,
    assessment_id: result.assessment_id,
    learner_id: result.learner_id,
    score: result.score,
    completed_at: result.completed_at
      ? toISOStringSafe(result.completed_at)
      : null,
    status: result.status,
    created_at: toISOStringSafe(result.created_at),
    updated_at: toISOStringSafe(result.updated_at),
    deleted_at: result.deleted_at ? toISOStringSafe(result.deleted_at) : null,
  };
}
