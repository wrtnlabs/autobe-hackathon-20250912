import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAtsRecruitmentExportJobDetail } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentExportJobDetail";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * Retrieve a single export job detail record
 * (ats_recruitment_export_job_details) by its ID under a given export job.
 *
 * This API operation retrieves the full information for an individual export
 * job detail, including metadata about the exported data row, summary JSON, and
 * its inclusion timestamp. It enforces that the detail actually belongs to the
 * specified export job, and restricts access to authenticated system
 * administrators only.
 *
 * @param props - SystemAdmin: SystemadminPayload; // The authenticated system
 *   administrator making the request exportJobId: string & tags.Format<'uuid'>;
 *   // Unique export job ID for context detailId: string & tags.Format<'uuid'>;
 *   // Unique ID of the export job detail to retrieve
 * @returns The full IAtsRecruitmentExportJobDetail record with all
 *   schema-required fields.
 * @throws {Error} If no such export job detail exists under the export job
 */
export async function getatsRecruitmentSystemAdminExportJobsExportJobIdDetailsDetailId(props: {
  systemAdmin: SystemadminPayload;
  exportJobId: string & tags.Format<"uuid">;
  detailId: string & tags.Format<"uuid">;
}): Promise<IAtsRecruitmentExportJobDetail> {
  const { exportJobId, detailId } = props;
  const detail =
    await MyGlobal.prisma.ats_recruitment_export_job_details.findFirst({
      where: {
        id: detailId,
        export_job_id: exportJobId,
      },
    });
  if (!detail) throw new Error("Not Found");

  // data_row_id is optional+nullable in API, nullable in DB. Pass null, omit if undefined
  const out: IAtsRecruitmentExportJobDetail = {
    id: detail.id,
    export_job_id: detail.export_job_id,
    row_summary_json: detail.row_summary_json,
    included_at: toISOStringSafe(detail.included_at),
    // Only include data_row_id if it's not undefined in the DB row
    ...(typeof detail.data_row_id !== "undefined"
      ? { data_row_id: detail.data_row_id === null ? null : detail.data_row_id }
      : {}),
  };
  return out;
}
