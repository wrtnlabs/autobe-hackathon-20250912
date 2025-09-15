import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAtsRecruitmentActorLoginHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentActorLoginHistory";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * Get a single actor login history record by its loginHistoryId from
 * ats_recruitment_actor_login_histories table
 *
 * Fetches the details of a specific actor login record, revealing the full
 * context of the login attempt for security forensics or audit purposes. Each
 * login history record contains the timestamp, actor (user/account id),
 * actor_type (role: applicant/hrRecruiter/techReviewer/systemAdmin), IP
 * address, user agent, login success status, and relevant incident/event
 * metadata as available.
 *
 * Access to this endpoint is limited to system administrators and compliance
 * auditors due to the sensitivity of the stored information (IP, device,
 * behavioral pattern). It is used to investigate suspicious logins, failed
 * authentication attempts, or respond to compliance and data subject requests
 * (GDPR, audits).
 *
 * @param props - Object containing the system admin authentication and login
 *   history ID
 * @param props.systemAdmin - Authenticated system admin payload (authorization
 *   enforced by decorator)
 * @param props.loginHistoryId - The unique identifier of the login history
 *   record
 * @returns Full detail of the specified actor login history record
 * @throws {Error} When the target login history record does not exist
 */
export async function getatsRecruitmentSystemAdminActorLoginHistoriesLoginHistoryId(props: {
  systemAdmin: SystemadminPayload;
  loginHistoryId: string & tags.Format<"uuid">;
}): Promise<IAtsRecruitmentActorLoginHistory> {
  const record =
    await MyGlobal.prisma.ats_recruitment_actor_login_histories.findUnique({
      where: { id: props.loginHistoryId },
    });
  if (!record) {
    throw new Error("Login history not found");
  }
  return {
    id: record.id,
    actor_id: record.actor_id,
    actor_type: record.actor_type,
    login_succeeded: record.login_succeeded,
    origin_ip: record.origin_ip === null ? undefined : record.origin_ip,
    user_agent: record.user_agent === null ? undefined : record.user_agent,
    login_at: toISOStringSafe(record.login_at),
  };
}
