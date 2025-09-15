import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformTelemedicineSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformTelemedicineSession";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * Update details for a telemedicine session (TelemedicineSession table) by
 * telemedicineSessionId.
 *
 * This operation updates the telemedicine session's audit timestamp
 * (updated_at) and returns the latest session record. No business fields (join
 * link, times, recorded) may be changed via this endpoint; only audit fields
 * are updatable, as the DTO restricts modifications to an empty object.
 * Authorization is enforced via systemAdmin context and session existence is
 * verified before the update.
 *
 * @param props - The request payload
 * @param props.systemAdmin - The authenticated SystemadminPayload (MUST be
 *   present and already authorized)
 * @param props.telemedicineSessionId - UUID path parameter identifying the
 *   session to update
 * @param props.body - Update object (currently empty, may allow further
 *   updatable fields in future revisions)
 * @returns The updated telemedicine session record (all business fields
 *   unmodified, updated_at refreshed)
 * @throws {Error} When the telemedicine session does not exist or is
 *   inaccessible
 */
export async function puthealthcarePlatformSystemAdminTelemedicineSessionsTelemedicineSessionId(props: {
  systemAdmin: SystemadminPayload;
  telemedicineSessionId: string & tags.Format<"uuid">;
  body: IHealthcarePlatformTelemedicineSession.IUpdate;
}): Promise<IHealthcarePlatformTelemedicineSession> {
  const { telemedicineSessionId } = props;
  // Step 1: Lookup session, ensure exists
  const found =
    await MyGlobal.prisma.healthcare_platform_telemedicine_sessions.findUnique({
      where: { id: telemedicineSessionId },
    });
  if (!found) throw new Error("Telemedicine session not found");

  // Step 2: Update only updated_at (audit write)
  const now = toISOStringSafe(new Date());
  const updated =
    await MyGlobal.prisma.healthcare_platform_telemedicine_sessions.update({
      where: { id: telemedicineSessionId },
      data: { updated_at: now },
    });

  // Step 3: Map and brand all fields for output without assertion
  return {
    id: updated.id,
    appointment_id: updated.appointment_id,
    join_link: updated.join_link,
    session_start: toISOStringSafe(updated.session_start),
    session_end: toISOStringSafe(updated.session_end),
    provider_joined_at: updated.provider_joined_at
      ? toISOStringSafe(updated.provider_joined_at)
      : updated.provider_joined_at,
    patient_joined_at: updated.patient_joined_at
      ? toISOStringSafe(updated.patient_joined_at)
      : updated.patient_joined_at,
    session_recorded: updated.session_recorded,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
  };
}
