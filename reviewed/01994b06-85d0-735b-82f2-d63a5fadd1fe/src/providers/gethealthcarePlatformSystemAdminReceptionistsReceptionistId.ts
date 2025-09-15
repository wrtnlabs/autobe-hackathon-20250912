import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformReceptionist } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformReceptionist";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * Retrieve detailed information about a specific receptionist from the
 * healthcare_platform_receptionists table.
 *
 * This operation fetches the full profile, contact information, timestamps, and
 * status for a receptionist identified by their unique receptionistId. Only
 * administrators (systemAdmin role) may access this endpoint. Throws an error
 * if receptionist is not found or is deleted.
 *
 * @param props - Properties for the operation
 * @param props.systemAdmin - SystemadminPayload, authentication required with
 *   system-wide privileges
 * @param props.receptionistId - UUID of the receptionist to query
 * @returns Complete receptionist profile record conforming to
 *   IHealthcarePlatformReceptionist
 * @throws {Error} If the receptionist does not exist or has been deleted
 */
export async function gethealthcarePlatformSystemAdminReceptionistsReceptionistId(props: {
  systemAdmin: SystemadminPayload;
  receptionistId: string & tags.Format<"uuid">;
}): Promise<IHealthcarePlatformReceptionist> {
  const { receptionistId } = props;
  // Find active (not deleted) receptionist by UUID
  const receptionist =
    await MyGlobal.prisma.healthcare_platform_receptionists.findFirst({
      where: {
        id: receptionistId,
        deleted_at: null,
      },
    });
  if (!receptionist) {
    throw new Error("Receptionist not found");
  }
  return {
    id: receptionist.id,
    email: receptionist.email,
    full_name: receptionist.full_name,
    phone: receptionist.phone ?? undefined,
    created_at: toISOStringSafe(receptionist.created_at),
    updated_at: toISOStringSafe(receptionist.updated_at),
    deleted_at: receptionist.deleted_at
      ? toISOStringSafe(receptionist.deleted_at)
      : undefined,
  };
}
