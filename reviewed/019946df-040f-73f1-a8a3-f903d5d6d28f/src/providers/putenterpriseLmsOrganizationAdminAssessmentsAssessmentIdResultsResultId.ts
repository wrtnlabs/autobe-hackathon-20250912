import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IEnterpriseLmsAssessmentResult } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsAssessmentResult";
import { OrganizationadminPayload } from "../decorators/payload/OrganizationadminPayload";

/**
 * Update a specific assessment result identified by assessmentId and resultId.
 *
 * This operation updates score, status, and completion timestamp fields in the
 * enterprise_lms_assessment_results table. Authorization is limited to
 * organizationAdmins. All updated dates are converted to ISO string format
 * conforming to the required tags.
 *
 * @param props - Object containing organizationAdmin, assessmentId, resultId,
 *   and update body
 * @param props.organizationAdmin - The authenticated organization administrator
 * @param props.assessmentId - UUID of the assessment
 * @param props.resultId - UUID of the assessment result
 * @param props.body - Update object containing score, status, and completed_at
 * @returns The updated assessment result record
 * @throws {Error} Throws if the assessment result does not exist or update
 *   fails
 */
export async function putenterpriseLmsOrganizationAdminAssessmentsAssessmentIdResultsResultId(props: {
  organizationAdmin: OrganizationadminPayload;
  assessmentId: string & tags.Format<"uuid">;
  resultId: string & tags.Format<"uuid">;
  body: IEnterpriseLmsAssessmentResult.IUpdate;
}): Promise<IEnterpriseLmsAssessmentResult> {
  const { organizationAdmin, assessmentId, resultId, body } = props;

  const existing =
    await MyGlobal.prisma.enterprise_lms_assessment_results.findUniqueOrThrow({
      where: { id: resultId },
    });

  if (existing.assessment_id !== assessmentId) {
    throw new Error(
      "Assessment result does not belong to specified assessment",
    );
  }

  const updateData: {
    score?: number;
    status?: string;
    completed_at?: (string & tags.Format<"date-time">) | null;
    updated_at: string & tags.Format<"date-time">;
  } = {
    updated_at: toISOStringSafe(new Date()),
  };

  if (body.score !== undefined) {
    updateData.score = body.score;
  }
  if (body.status !== undefined) {
    updateData.status = body.status;
  }
  if (body.completed_at !== undefined) {
    updateData.completed_at = body.completed_at;
  }

  const updated =
    await MyGlobal.prisma.enterprise_lms_assessment_results.update({
      where: { id: resultId },
      data: updateData,
    });

  return {
    id: updated.id,
    assessment_id: updated.assessment_id,
    learner_id: updated.learner_id,
    score: updated.score,
    completed_at: updated.completed_at ?? null,
    status: updated.status,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at ?? null,
  };
}
