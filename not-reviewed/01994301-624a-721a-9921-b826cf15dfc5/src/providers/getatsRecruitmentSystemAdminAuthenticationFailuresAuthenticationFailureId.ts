import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAtsRecruitmentAuthenticationFailure } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentAuthenticationFailure";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * Retrieve authentication failure event by ID
 * (ats_recruitment_authentication_failures table) for incident audit and
 * forensics.
 *
 * This API operation allows system administrators to retrieve detailed
 * information regarding a specific failed authentication attempt within the ATS
 * recruitment platform. The endpoint returns metadata such as the attempted
 * user identifier (could be an email, username, or non-existent account),
 * timestamp of the failed event, technical/business reason for rejection (e.g.,
 * wrong password, locked account), the originating IP address, device/browser
 * info, and whether the event contributed to a lockout status. This facilitates
 * security incident review, brute-force detection, compliance auditing, and
 * incident forensics. Access is strictly limited to system administrators for
 * privacy and security policy.
 *
 * @param props - Properties required for retrieving the authentication failure
 *   event
 * @param props.systemAdmin - The authenticated system administrator making this
 *   request
 * @param props.authenticationFailureId - Unique identifier of the
 *   authentication failure event
 * @returns Detailed authentication failure event information, including
 *   attempted credentials, failure reason, timestamp, source IP, device
 *   information, and lockout status
 * @throws {Error} When the authentication failure entry by that ID does not
 *   exist
 */
export async function getatsRecruitmentSystemAdminAuthenticationFailuresAuthenticationFailureId(props: {
  systemAdmin: SystemadminPayload;
  authenticationFailureId: string & tags.Format<"uuid">;
}): Promise<IAtsRecruitmentAuthenticationFailure> {
  const { authenticationFailureId } = props;
  const failure =
    await MyGlobal.prisma.ats_recruitment_authentication_failures.findUnique({
      where: { id: authenticationFailureId },
    });
  if (failure == null) {
    throw new Error("Authentication failure event not found");
  }
  return {
    id: failure.id,
    attempted_at: toISOStringSafe(failure.attempted_at),
    attempted_user_identifier: failure.attempted_user_identifier,
    ip_address: failure.ip_address ?? undefined,
    device_info: failure.device_info ?? undefined,
    failure_reason: failure.failure_reason,
    lockout_triggered: failure.lockout_triggered,
  };
}
