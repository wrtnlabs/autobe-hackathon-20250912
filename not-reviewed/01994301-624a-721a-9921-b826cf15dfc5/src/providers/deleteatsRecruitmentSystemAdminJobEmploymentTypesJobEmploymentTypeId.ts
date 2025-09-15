import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * Delete (soft-delete) a job employment type from
 * ats_recruitment_job_employment_types.
 *
 * This operation marks the employment type as deleted by setting its deleted_at
 * field to the current datetime. It enforces that only system administrators
 * can perform this action, and it is only allowed if the employment type is not
 * referenced by any job postings (that are not deleted). Employment types
 * marked as deleted can be recovered or purged later for compliance.
 *
 * @param props - The request props containing systemAdmin authentication and
 *   the UUID of the employment type.
 * @param props.systemAdmin - Authenticated system administrator payload (must
 *   be type 'systemadmin').
 * @param props.jobEmploymentTypeId - UUID of the job employment type to delete.
 * @returns Void
 * @throws {Error} If the employment type does not exist.
 * @throws {Error} If the employment type is already deleted.
 * @throws {Error} If the employment type is referenced by active job postings.
 */
export async function deleteatsRecruitmentSystemAdminJobEmploymentTypesJobEmploymentTypeId(props: {
  systemAdmin: SystemadminPayload;
  jobEmploymentTypeId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { systemAdmin, jobEmploymentTypeId } = props;

  // 1. Fetch and validate existence
  const employmentType =
    await MyGlobal.prisma.ats_recruitment_job_employment_types.findFirst({
      where: { id: jobEmploymentTypeId },
    });
  if (!employmentType) throw new Error("Job employment type not found.");
  if (employmentType.deleted_at)
    throw new Error("Job employment type is already deleted.");

  // 2. Check for referencing job postings that are not deleted
  const referencingCount =
    await MyGlobal.prisma.ats_recruitment_job_postings.count({
      where: {
        job_employment_type_id: jobEmploymentTypeId,
        deleted_at: null,
      },
    });
  if (referencingCount > 0) {
    throw new Error(
      "Employment type is in use by job postings and cannot be deleted.",
    );
  }

  // 3. Soft-delete: mark as deleted
  await MyGlobal.prisma.ats_recruitment_job_employment_types.update({
    where: { id: jobEmploymentTypeId },
    data: { deleted_at: toISOStringSafe(new Date()) },
  });
  // 4. No value returned (void)
}
