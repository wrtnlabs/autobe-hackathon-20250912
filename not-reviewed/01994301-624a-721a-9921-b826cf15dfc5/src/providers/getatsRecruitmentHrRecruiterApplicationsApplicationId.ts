import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAtsRecruitmentApplication } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentApplication";
import { HrrecruiterPayload } from "../decorators/payload/HrrecruiterPayload";

/**
 * Retrieve details of a specific job application from the applications table
 * using applicationId.
 *
 * This function allows an authenticated HR recruiter to fetch the full details
 * of a specific job application, including applicant, job posting, resume
 * reference, status, submission and state change timestamps, and soft-delete
 * info. Only active (non-deleted) applications may be retrieved. All business
 * and audit requirements are satisfied: permissions enforced, application
 * existence checked, and fields mapped strictly per API contract. All date
 * fields are formatted as ISO 8601 strings, and nullable/optional fields are
 * handled with undefined per DTO.
 *
 * @param props - Properties for this operation
 * @param props.hrRecruiter - The authenticated HR recruiter making the request
 * @param props.applicationId - The unique identifier of the job application to
 *   retrieve
 * @returns The detailed job application record for the specified applicationId
 * @throws {Error} If no such application exists or was deleted
 */
export async function getatsRecruitmentHrRecruiterApplicationsApplicationId(props: {
  hrRecruiter: HrrecruiterPayload;
  applicationId: string & tags.Format<"uuid">;
}): Promise<IAtsRecruitmentApplication> {
  const { applicationId } = props;
  const row = await MyGlobal.prisma.ats_recruitment_applications.findFirst({
    where: { id: applicationId, deleted_at: null },
  });
  if (!row) throw new Error("Application not found");
  return {
    id: row.id,
    applicant_id: row.applicant_id,
    job_posting_id: row.job_posting_id,
    resume_id: row.resume_id === null ? undefined : row.resume_id,
    current_status: row.current_status,
    submitted_at: toISOStringSafe(row.submitted_at),
    last_state_change_at: toISOStringSafe(row.last_state_change_at),
    created_at: toISOStringSafe(row.created_at),
    updated_at: toISOStringSafe(row.updated_at),
    deleted_at:
      row.deleted_at === null ? undefined : toISOStringSafe(row.deleted_at),
  };
}
