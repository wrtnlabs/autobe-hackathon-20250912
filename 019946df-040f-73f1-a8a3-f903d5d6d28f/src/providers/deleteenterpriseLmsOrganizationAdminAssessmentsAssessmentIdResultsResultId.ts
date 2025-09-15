import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { OrganizationadminPayload } from "../decorators/payload/OrganizationadminPayload";

/**
 * Permanently deletes an assessment result by the specified assessmentId and
 * resultId.
 *
 * This operation performs a hard delete as the assessment result model does not
 * support soft deletion. Authorization is assumed to be handled via the
 * organizationAdmin payload.
 *
 * @param props - Parameters including the authenticated organization admin,
 *   assessmentId, and resultId.
 * @throws {Error} When no matching assessment result is found.
 */
export async function deleteenterpriseLmsOrganizationAdminAssessmentsAssessmentIdResultsResultId(props: {
  organizationAdmin: OrganizationadminPayload;
  assessmentId: string & tags.Format<"uuid">;
  resultId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { organizationAdmin, assessmentId, resultId } = props;

  // Verify the assessment result exists and belongs to the specified assessment
  const existing =
    await MyGlobal.prisma.enterprise_lms_assessment_results.findFirst({
      where: {
        id: resultId,
        assessment_id: assessmentId,
      },
    });

  if (!existing) {
    throw new Error("Assessment result not found");
  }

  // Perform hard delete
  await MyGlobal.prisma.enterprise_lms_assessment_results.delete({
    where: {
      id: resultId,
    },
  });
}
