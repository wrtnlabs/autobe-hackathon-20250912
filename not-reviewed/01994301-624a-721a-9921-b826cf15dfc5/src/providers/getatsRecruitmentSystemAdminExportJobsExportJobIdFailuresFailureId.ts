import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAtsRecruitmentExportFailure } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentExportFailure";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * Retrieve export job failure details by exportJobId and failureId
 * (ats_recruitment_export_failures)
 *
 * This function returns the details of a specific export job failure, given
 * both the exportJobId and failureId as UUID path parameters. It provides
 * privileged system administrator users the ability to review failure stage,
 * root cause, and time of failure for compliance, troubleshooting, and audit
 * purposes. Only admins with system-level authorization are permitted to access
 * this data.
 *
 * @param props - Object containing all required parameters for this operation.
 * @param props.systemAdmin - The authenticated system administrator payload
 *   (must have type "systemadmin", enforced by decorator).
 * @param props.exportJobId - The export job UUID to which the failure belongs.
 * @param props.failureId - The unique export failure record's UUID to retrieve.
 * @returns The IAtsRecruitmentExportFailure record containing failure details
 *   (stage, reason, time, etc).
 * @throws {Error} If no matching failure record is found (404 Not Found)
 */
export async function getatsRecruitmentSystemAdminExportJobsExportJobIdFailuresFailureId(props: {
  systemAdmin: SystemadminPayload;
  exportJobId: string & tags.Format<"uuid">;
  failureId: string & tags.Format<"uuid">;
}): Promise<IAtsRecruitmentExportFailure> {
  const { systemAdmin, exportJobId, failureId } = props;

  // Authorization: presence of systemAdmin is already enforced by decorator; additional restriction not needed

  // Find the failure record matching both the export job and the specific failureId
  const failure =
    await MyGlobal.prisma.ats_recruitment_export_failures.findFirst({
      where: {
        id: failureId,
        export_job_id: exportJobId,
      },
    });

  // Enforce 404 for not found, as required by API contract
  if (!failure) {
    throw new Error("Export failure record not found");
  }

  return {
    id: failure.id,
    export_job_id: failure.export_job_id,
    failure_stage: failure.failure_stage,
    failure_reason: failure.failure_reason,
    // Convert failed_at as Date to ISO8601 string with correct branding
    failed_at: toISOStringSafe(failure.failed_at),
  };
}
