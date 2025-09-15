import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAtsRecruitmentExportFailure } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentExportFailure";
import { HrrecruiterPayload } from "../decorators/payload/HrrecruiterPayload";

/**
 * Retrieve export job failure details by exportJobId and failureId
 * (ats_recruitment_export_failures)
 *
 * Retrieves a specific export job failure record by its unique identifier. This
 * operates on the ats_recruitment_export_failures table and allows privileged
 * users (systemAdmin, hrRecruiter) to view detailed failure information about
 * an export job. The response delivers full details about the export job
 * failure, including the job, failure stage, cause message, and failure
 * timestamp. Access is strictly limited to the HR recruiter who is the
 * initiator of the export job (compliance, data privacy). Errors are thrown for
 * non-existent records or insufficient permissions.
 *
 * @param props - Request parameter object
 * @param props.hrRecruiter - Authenticated HR recruiter making the request
 * @param props.exportJobId - Target export job's UUID
 * @param props.failureId - Unique identifier for the export job failure record
 * @returns The export job failure record with schema-aligned fields
 * @throws {Error} When export job or failure is not found, or recruiter is not
 *   authorized
 */
export async function getatsRecruitmentHrRecruiterExportJobsExportJobIdFailuresFailureId(props: {
  hrRecruiter: HrrecruiterPayload;
  exportJobId: string & tags.Format<"uuid">;
  failureId: string & tags.Format<"uuid">;
}): Promise<IAtsRecruitmentExportFailure> {
  // 1. Retrieve the export job and verify the current recruiter is the initiator
  const exportJob = await MyGlobal.prisma.ats_recruitment_export_jobs.findFirst(
    {
      where: { id: props.exportJobId },
      select: { id: true, initiator_id: true },
    },
  );
  if (!exportJob) {
    throw new Error("Export job not found");
  }
  if (exportJob.initiator_id !== props.hrRecruiter.id) {
    throw new Error(
      "Forbidden: You do not have access to this export job's failure records",
    );
  }

  // 2. Retrieve the export failure record associated with this job
  const failure =
    await MyGlobal.prisma.ats_recruitment_export_failures.findFirst({
      where: {
        id: props.failureId,
        export_job_id: props.exportJobId,
      },
      select: {
        id: true,
        export_job_id: true,
        failure_stage: true,
        failure_reason: true,
        failed_at: true,
      },
    });
  if (!failure) {
    throw new Error("Export job failure record not found");
  }

  // 3. Return structured result without any type assertion or Date usage
  return {
    id: failure.id,
    export_job_id: failure.export_job_id,
    failure_stage: failure.failure_stage,
    failure_reason: failure.failure_reason,
    failed_at: toISOStringSafe(failure.failed_at),
  };
}
