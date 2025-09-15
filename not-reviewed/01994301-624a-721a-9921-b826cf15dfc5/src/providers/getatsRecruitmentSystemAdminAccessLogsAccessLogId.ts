import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAtsRecruitmentAccessLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentAccessLog";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * Retrieve details for a specific access log event by accessLogId
 * (ats_recruitment_access_logs).
 *
 * Fetches detailed data about a particular access log event—such as the actor
 * (user/system), the type and ID of accessed resource, the reason for access,
 * the time of the event, and associated metadata (IP, device). Restricted to
 * system administrators for audit review.
 *
 * @param props - SystemAdmin: Authenticated SystemadminPayload accessLogId: The
 *   unique identifier of the access log
 * @returns The complete access log record for audit review
 * @throws {Error} If record with given accessLogId does not exist
 */
export async function getatsRecruitmentSystemAdminAccessLogsAccessLogId(props: {
  systemAdmin: SystemadminPayload;
  accessLogId: string & tags.Format<"uuid">;
}): Promise<IAtsRecruitmentAccessLog> {
  const { accessLogId } = props;
  const record = await MyGlobal.prisma.ats_recruitment_access_logs.findFirst({
    where: { id: accessLogId },
  });
  if (!record) {
    throw new Error("Access log record not found");
  }
  return {
    id: record.id,
    actor_id: record.actor_id,
    actor_type: record.actor_type,
    target_type: record.target_type,
    target_id: record.target_id,
    accessed_at: toISOStringSafe(record.accessed_at),
    ip_address: record.ip_address ?? undefined,
    device_info: record.device_info ?? undefined,
    access_reason: record.access_reason ?? undefined,
  };
}
