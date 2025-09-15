import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAtsRecruitmentDataDeletionLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentDataDeletionLog";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * Get a specific data deletion log by ID (ats_recruitment_data_deletion_logs).
 *
 * Retrieves a single data deletion log entry from the
 * ats_recruitment_data_deletion_logs table by primary key. Provides detailed
 * deletion history of recruitment-related data for GDPR and compliance usage,
 * including timestamp, requestor, target type/id, deletion reason, and outcome
 * note. Only accessible by authenticated systemAdmin users.
 *
 * @param props - Request properties
 * @param props.systemAdmin - The authenticated system admin requesting this log
 * @param props.dataDeletionLogId - The primary key UUID of the data deletion
 *   log entry to fetch
 * @returns The detailed data deletion log entry as
 *   IAtsRecruitmentDataDeletionLog
 * @throws {Error} If the record does not exist or access is unauthorized
 */
export async function getatsRecruitmentSystemAdminDataDeletionLogsDataDeletionLogId(props: {
  systemAdmin: SystemadminPayload;
  dataDeletionLogId: string & tags.Format<"uuid">;
}): Promise<IAtsRecruitmentDataDeletionLog> {
  const { dataDeletionLogId } = props;

  const log =
    await MyGlobal.prisma.ats_recruitment_data_deletion_logs.findUniqueOrThrow({
      where: { id: dataDeletionLogId },
      select: {
        id: true,
        deleted_at: true,
        requestor_id: true,
        requestor_type: true,
        target_type: true,
        target_id: true,
        deletion_reason: true,
        outcome_note: true,
      },
    });

  return {
    id: log.id,
    deleted_at: toISOStringSafe(log.deleted_at),
    requestor_id: log.requestor_id,
    requestor_type: log.requestor_type,
    target_type: log.target_type,
    target_id: log.target_id,
    deletion_reason: log.deletion_reason,
    ...(log.outcome_note !== undefined && { outcome_note: log.outcome_note }),
  };
}
