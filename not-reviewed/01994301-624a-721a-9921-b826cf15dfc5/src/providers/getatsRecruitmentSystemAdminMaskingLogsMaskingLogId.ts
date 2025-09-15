import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAtsRecruitmentMaskingLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentMaskingLog";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * Get a specific data masking log entry by ID (ats_recruitment_masking_logs).
 *
 * Retrieves a single data masking log entry by its primary key from the
 * ats_recruitment_masking_logs table. Shows when, by whom, and why a specific
 * entity or field was masked (anonymized) in the system, supporting compliance,
 * privacy inquiries, and audit investigations.
 *
 * Only systemAdmin roles are permitted to use this endpoint, to prevent
 * unnecessary exposure of detailed privacy action logs. Attempts to access a
 * non-existent or already scrubbed masking log result in 404 errors or
 * compliance alerts.
 *
 * @param props - Properties for the operation
 * @param props.systemAdmin - The authenticated system administrator
 * @param props.maskingLogId - Unique identifier (UUID) of the data masking log
 *   entry to retrieve
 * @returns Full data masking log record with masking metadata and context.
 * @throws {Error} When the specified masking log entry is not found
 */
export async function getatsRecruitmentSystemAdminMaskingLogsMaskingLogId(props: {
  systemAdmin: SystemadminPayload;
  maskingLogId: string & tags.Format<"uuid">;
}): Promise<IAtsRecruitmentMaskingLog> {
  const { maskingLogId } = props;
  const log = await MyGlobal.prisma.ats_recruitment_masking_logs.findFirst({
    where: { id: maskingLogId },
  });
  if (!log) {
    throw new Error("Masking log entry not found");
  }
  return {
    id: log.id,
    masked_at: toISOStringSafe(log.masked_at),
    masked_by_id: log.masked_by_id,
    masked_by_type: log.masked_by_type,
    target_type: log.target_type,
    target_id: log.target_id,
    masking_reason: log.masking_reason,
  };
}
