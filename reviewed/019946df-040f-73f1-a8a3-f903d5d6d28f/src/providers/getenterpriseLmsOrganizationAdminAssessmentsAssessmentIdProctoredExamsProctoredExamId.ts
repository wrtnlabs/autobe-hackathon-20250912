import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IEnterpriseLmsProctoredExam } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsProctoredExam";
import { OrganizationadminPayload } from "../decorators/payload/OrganizationadminPayload";

/**
 * Get detailed info of a proctored exam by ID for a given assessment
 *
 * Retrieves detailed information about a specific proctored exam tied to a
 * particular assessment. This operation requires an authenticated
 * organizationAdmin loader, and enforces soft-deleted records exclusion.
 *
 * @param props - The operation properties
 * @param props.organizationAdmin - The authenticated organization admin caller
 *   payload
 * @param props.assessmentId - UUID of the assessment
 * @param props.proctoredExamId - UUID of the proctored exam
 * @returns The detailed proctored exam entity matching the requested
 *   identifiers
 * @throws {Error} Throws if no matching proctored exam is found
 */
export async function getenterpriseLmsOrganizationAdminAssessmentsAssessmentIdProctoredExamsProctoredExamId(props: {
  organizationAdmin: OrganizationadminPayload;
  assessmentId: string & tags.Format<"uuid">;
  proctoredExamId: string & tags.Format<"uuid">;
}): Promise<IEnterpriseLmsProctoredExam> {
  const { organizationAdmin, assessmentId, proctoredExamId } = props;

  const record =
    await MyGlobal.prisma.enterprise_lms_proctored_exams.findFirstOrThrow({
      where: {
        id: proctoredExamId,
        assessment_id: assessmentId,
        deleted_at: null,
      },
    });

  return {
    id: record.id,
    assessment_id: record.assessment_id,
    exam_session_id: record.exam_session_id,
    proctor_id: record.proctor_id ?? undefined,
    scheduled_at: toISOStringSafe(record.scheduled_at),
    status: record.status as
      | "scheduled"
      | "in_progress"
      | "completed"
      | "cancelled",
    created_at: toISOStringSafe(record.created_at),
    updated_at: toISOStringSafe(record.updated_at),
    deleted_at: record.deleted_at ? toISOStringSafe(record.deleted_at) : null,
  };
}
