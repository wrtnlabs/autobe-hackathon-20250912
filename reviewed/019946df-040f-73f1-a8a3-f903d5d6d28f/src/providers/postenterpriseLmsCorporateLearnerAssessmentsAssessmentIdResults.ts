import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IEnterpriseLmsAssessmentResult } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsAssessmentResult";
import { CorporatelearnerPayload } from "../decorators/payload/CorporatelearnerPayload";

/**
 * Create a new assessment result for a specific assessment.
 *
 * This operation creates a new assessment result record associated with the
 * given assessmentId. It validates authenticated corporate learner and verifies
 * tenant consistency before recording the score, status, and completion
 * timestamp.
 *
 * @param props - The properties for creating the assessment result
 * @param props.corporateLearner - Authenticated corporate learner payload
 * @param props.assessmentId - The UUID of the assessment
 * @param props.body - The data to create the assessment result
 * @returns The created assessment result record
 * @throws {Error} When corporate learner not found
 * @throws {Error} When assessment not found
 * @throws {Error} When tenant mismatch occurs
 */
export async function postenterpriseLmsCorporateLearnerAssessmentsAssessmentIdResults(props: {
  corporateLearner: CorporatelearnerPayload;
  assessmentId: string & tags.Format<"uuid">;
  body: IEnterpriseLmsAssessmentResult.ICreate;
}): Promise<IEnterpriseLmsAssessmentResult> {
  const { corporateLearner, assessmentId, body } = props;

  // Verify corporate learner exists
  const corporateLearnerRecord =
    await MyGlobal.prisma.enterprise_lms_corporatelearner.findUnique({
      where: { id: corporateLearner.id },
    });

  if (!corporateLearnerRecord) {
    throw new Error("Corporate learner not found");
  }

  // Verify assessment exists
  const assessment =
    await MyGlobal.prisma.enterprise_lms_assessments.findUnique({
      where: { id: assessmentId },
    });

  if (!assessment) {
    throw new Error("Assessment not found");
  }

  // Verify tenant consistency
  if (assessment.tenant_id !== corporateLearnerRecord.tenant_id) {
    throw new Error("Tenant mismatch between assessment and corporate learner");
  }

  // Generate UUID for new record
  const newId = v4() as string & tags.Format<"uuid">;

  // Current timestamp
  const now = toISOStringSafe(new Date());

  // Create record
  const created =
    await MyGlobal.prisma.enterprise_lms_assessment_results.create({
      data: {
        id: newId,
        assessment_id: body.assessment_id,
        learner_id: body.learner_id,
        score: body.score,
        completed_at: body.completed_at ?? null,
        status: body.status,
        created_at: now,
        updated_at: now,
        deleted_at: null,
      },
    });

  // Return converted result
  return {
    id: created.id,
    assessment_id: created.assessment_id,
    learner_id: created.learner_id,
    score: created.score,
    completed_at: created.completed_at
      ? toISOStringSafe(created.completed_at)
      : null,
    status: created.status,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at: created.deleted_at ? toISOStringSafe(created.deleted_at) : null,
  };
}
