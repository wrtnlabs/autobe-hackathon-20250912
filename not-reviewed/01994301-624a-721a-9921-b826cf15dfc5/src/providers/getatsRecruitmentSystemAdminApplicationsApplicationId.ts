import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAtsRecruitmentApplication } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentApplication";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * Retrieve details of a specific job application from the applications table
 * using applicationId.
 *
 * Fetches the full detail of a single job application by its unique ID. Returns
 * core applicant, job posting, submitted resume (if any), current application
 * status, all audit timestamps, and soft-delete state. For system admin role,
 * this enables compliance auditing, review, and progress checks. Throws if
 * application not found.
 *
 * @param props - Input parameters
 * @param props.systemAdmin - Authenticated system admin making the request
 * @param props.applicationId - Unique identifier (UUID) for the target job
 *   application record
 * @returns The full application entity, including all lifecycle fields
 * @throws {Error} If the application is not found or is soft-deleted
 */
export async function getatsRecruitmentSystemAdminApplicationsApplicationId(props: {
  systemAdmin: SystemadminPayload;
  applicationId: string & tags.Format<"uuid">;
}): Promise<IAtsRecruitmentApplication> {
  const { applicationId } = props;
  const app = await MyGlobal.prisma.ats_recruitment_applications.findFirst({
    where: {
      id: applicationId,
      deleted_at: null,
    },
  });
  if (!app) throw new Error("Application not found");
  return {
    id: app.id,
    applicant_id: app.applicant_id,
    job_posting_id: app.job_posting_id,
    resume_id:
      typeof app.resume_id === "undefined"
        ? undefined
        : app.resume_id !== null
          ? app.resume_id
          : null,
    current_status: app.current_status,
    submitted_at: toISOStringSafe(app.submitted_at),
    last_state_change_at: toISOStringSafe(app.last_state_change_at),
    created_at: toISOStringSafe(app.created_at),
    updated_at: toISOStringSafe(app.updated_at),
    deleted_at:
      typeof app.deleted_at === "undefined"
        ? undefined
        : app.deleted_at !== null
          ? toISOStringSafe(app.deleted_at)
          : null,
  };
}
