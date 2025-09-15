import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * Permanently delete an existing assessment along with its dependent data.
 *
 * This function removes the assessment identified by `assessmentId` and
 * cascades the deletion to related assessment questions, results, and proctored
 * exams.
 *
 * Only users with `systemAdmin` role are authorized to execute this operation.
 *
 * @param props - Object containing the systemAdmin payload and target
 *   assessment UUID
 * @param props.systemAdmin - Authenticated systemAdmin payload
 * @param props.assessmentId - UUID of the assessment to delete
 * @throws {Error} Throws if the assessment ID does not exist
 */
export async function deleteenterpriseLmsSystemAdminAssessmentsAssessmentId(props: {
  systemAdmin: SystemadminPayload;
  assessmentId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { systemAdmin, assessmentId } = props;

  // Check assessment existence
  await MyGlobal.prisma.enterprise_lms_assessments.findUniqueOrThrow({
    where: { id: assessmentId },
  });

  // Delete all related questions
  await MyGlobal.prisma.enterprise_lms_assessment_questions.deleteMany({
    where: { assessment_id: assessmentId },
  });

  // Delete all related results
  await MyGlobal.prisma.enterprise_lms_assessment_results.deleteMany({
    where: { assessment_id: assessmentId },
  });

  // Delete all related proctored exams
  await MyGlobal.prisma.enterprise_lms_proctored_exams.deleteMany({
    where: { assessment_id: assessmentId },
  });

  // Hard delete the assessment
  await MyGlobal.prisma.enterprise_lms_assessments.delete({
    where: { id: assessmentId },
  });
}
