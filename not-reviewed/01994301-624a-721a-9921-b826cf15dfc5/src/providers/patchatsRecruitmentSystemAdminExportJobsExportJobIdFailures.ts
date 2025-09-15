import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAtsRecruitmentExportFailure } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentExportFailure";
import { IPageIAtsRecruitmentExportFailure } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAtsRecruitmentExportFailure";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * Search and page through export job failure records
 * (ats_recruitment_export_failures) for a specific export job.
 *
 * This API operation enables authorized system administrators to retrieve and
 * audit export job failure events by export job ID. It supports full filtering
 * and pagination by failure stage, reason substring, and occurrence date/time.
 * All date fields are strictly returned as string & tags.Format<'date-time'>,
 * and UUIDs are handled via v4(). The returned result provides operational and
 * compliance visibility over export job issues, using a functional, immutable
 * coding style. Authorization is enforced per endpoint contract.
 *
 * @param props - Object containing:
 *
 *   - SystemAdmin: Authenticated SystemadminPayload (route authentication context
 *       enforced)
 *   - ExportJobId: string & tags.Format<'uuid'> — the export job whose failures are
 *       being queried
 *   - Body: IAtsRecruitmentExportFailure.IRequest — request body containing filter
 *       and pagination options
 *
 * @returns Paginated export failure result page.
 * @throws {Error} If export job does not exist or is inaccessible
 */
export async function patchatsRecruitmentSystemAdminExportJobsExportJobIdFailures(props: {
  systemAdmin: SystemadminPayload;
  exportJobId: string & tags.Format<"uuid">;
  body: IAtsRecruitmentExportFailure.IRequest;
}): Promise<IPageIAtsRecruitmentExportFailure> {
  // Step 1: Validate export job existence
  const exportJob =
    await MyGlobal.prisma.ats_recruitment_export_jobs.findUnique({
      where: { id: props.exportJobId },
      select: { id: true },
    });
  if (!exportJob) throw new Error("Export job not found");

  // Step 2: Prepare pagination
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;

  // Step 3: Build where condition
  const where = {
    export_job_id: props.exportJobId,
    ...(props.body.failure_stage !== undefined &&
      props.body.failure_stage !== null && {
        failure_stage: props.body.failure_stage,
      }),
    ...(props.body.failure_reason !== undefined &&
      props.body.failure_reason !== null && {
        failure_reason: { contains: props.body.failure_reason },
      }),
    ...((props.body.failed_at_from !== undefined &&
      props.body.failed_at_from !== null) ||
    (props.body.failed_at_to !== undefined && props.body.failed_at_to !== null)
      ? {
          failed_at: {
            ...(props.body.failed_at_from !== undefined &&
              props.body.failed_at_from !== null && {
                gte: props.body.failed_at_from,
              }),
            ...(props.body.failed_at_to !== undefined &&
              props.body.failed_at_to !== null && {
                lte: props.body.failed_at_to,
              }),
          },
        }
      : {}),
  };

  // Step 4: Find paginated rows and total count in parallel
  const [rows, total] = await Promise.all([
    MyGlobal.prisma.ats_recruitment_export_failures.findMany({
      where,
      orderBy: { failed_at: "desc" },
      skip,
      take: limit,
    }),
    MyGlobal.prisma.ats_recruitment_export_failures.count({ where }),
  ]);

  // Step 5: Map rows to DTO structure (convert Date to ISO string)
  const data = rows.map((row) => ({
    id: row.id,
    export_job_id: row.export_job_id,
    failure_stage: row.failure_stage,
    failure_reason: row.failure_reason,
    failed_at: toISOStringSafe(row.failed_at),
  }));

  // Step 6: Return paginated result
  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / limit),
    },
    data,
  };
}
