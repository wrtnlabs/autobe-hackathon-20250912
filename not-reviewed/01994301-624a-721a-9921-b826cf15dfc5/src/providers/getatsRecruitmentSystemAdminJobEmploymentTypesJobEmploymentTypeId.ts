import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAtsRecruitmentJobEmploymentType } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentJobEmploymentType";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * Retrieve details for a specific job employment type
 * (ats_recruitment_job_employment_types).
 *
 * This API endpoint lets authorized system administrators retrieve complete
 * information for a specific job employment type by ID. The response includes
 * all primary columns such as name, description, is_active, and audit
 * timestamps. It excludes logically deleted types.
 *
 * @param props - Object containing required properties:
 *
 *   - SystemAdmin: The authenticated SystemadminPayload of the requesting user
 *       (authorization required)
 *   - JobEmploymentTypeId: UUID of the job employment type to retrieve
 *
 * @returns Full details about the specified job employment type, formatted
 *   according to IAtsRecruitmentJobEmploymentType
 * @throws {Error} If no such (not-deleted) employment type is found by the
 *   given ID
 */
export async function getatsRecruitmentSystemAdminJobEmploymentTypesJobEmploymentTypeId(props: {
  systemAdmin: SystemadminPayload;
  jobEmploymentTypeId: string & tags.Format<"uuid">;
}): Promise<IAtsRecruitmentJobEmploymentType> {
  const { jobEmploymentTypeId } = props;
  const row =
    await MyGlobal.prisma.ats_recruitment_job_employment_types.findFirst({
      where: {
        id: jobEmploymentTypeId,
        deleted_at: null,
      },
    });
  if (!row) throw new Error("Job employment type not found");
  return {
    id: row.id,
    name: row.name,
    description: row.description ?? undefined,
    is_active: row.is_active,
    created_at: toISOStringSafe(row.created_at),
    updated_at: toISOStringSafe(row.updated_at),
    // Only return deleted_at if not null (matches DTO's optional+nullable signature)
    ...(row.deleted_at !== null
      ? { deleted_at: toISOStringSafe(row.deleted_at) }
      : {}),
  };
}
