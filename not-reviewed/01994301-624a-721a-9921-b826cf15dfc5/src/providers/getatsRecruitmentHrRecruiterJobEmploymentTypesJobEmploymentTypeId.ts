import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAtsRecruitmentJobEmploymentType } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentJobEmploymentType";
import { HrrecruiterPayload } from "../decorators/payload/HrrecruiterPayload";

/**
 * Retrieve details for a specific job employment type
 * (ats_recruitment_job_employment_types).
 *
 * This API endpoint lets authorized HR recruiters view all fields for a
 * particular job employment type, including activation status and descriptive
 * metadata. It returns the employment type only if it exists and is not
 * soft-deleted. Used when editing job posting rules or auditing employment
 * types for compliance.
 *
 * Authorization is required: only authenticated HR recruiters may access this
 * endpoint. System administrators are not handled here. Access is denied for
 * deleted or unknown types.
 *
 * @param props - Parameters for this operation
 * @param props.hrRecruiter - Authenticated HR recruiter user context
 * @param props.jobEmploymentTypeId - UUID of the job employment type to
 *   retrieve
 * @returns All fields for the specified job employment type, following the
 *   IAtsRecruitmentJobEmploymentType interface
 * @throws {Error} When no matching employment type is found (invalid ID,
 *   soft-deleted, or unauthorized access)
 */
export async function getatsRecruitmentHrRecruiterJobEmploymentTypesJobEmploymentTypeId(props: {
  hrRecruiter: HrrecruiterPayload;
  jobEmploymentTypeId: string & tags.Format<"uuid">;
}): Promise<IAtsRecruitmentJobEmploymentType> {
  const { jobEmploymentTypeId } = props;
  // Fetch only non-deleted job employment type; error if not found
  const jobType =
    await MyGlobal.prisma.ats_recruitment_job_employment_types.findFirst({
      where: { id: jobEmploymentTypeId, deleted_at: null },
      select: {
        id: true,
        name: true,
        description: true,
        is_active: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    });
  if (!jobType) throw new Error("Job employment type not found");
  // Comply with DTO null/undefined contract strictly
  return {
    id: jobType.id,
    name: jobType.name,
    description: jobType.description ?? null,
    is_active: jobType.is_active,
    created_at: toISOStringSafe(jobType.created_at),
    updated_at: toISOStringSafe(jobType.updated_at),
    // deleted_at is optional + nullable in DTO
    deleted_at: jobType.deleted_at ? toISOStringSafe(jobType.deleted_at) : null,
  };
}
