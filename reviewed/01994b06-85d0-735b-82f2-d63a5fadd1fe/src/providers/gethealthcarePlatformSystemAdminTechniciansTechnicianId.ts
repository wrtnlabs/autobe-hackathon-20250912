import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformTechnician } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformTechnician";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * Retrieve a technician record in healthcare_platform_technicians by ID.
 *
 * This endpoint allows system administrators to query the full profile of a
 * technician staff member by unique UUID. It enforces that only non-deleted
 * (active) technician records can be accessed. The function returns HR and
 * credential information, audit timestamps, and soft-delete marker, matching
 * the IHealthcarePlatformTechnician DTO contract and strict production
 * standards. Throws an error if the technician is not found or is soft-deleted.
 * All dates are mapped to ISO 8601 date-time strings, and null/undefined fields
 * are handled per type.
 *
 * Authorization is enforced via systemAdmin argument at route/controller layer.
 * Access attempts must be logged by API gateway for compliance, outside of
 * provider scope.
 *
 * @param props - Object containing the authenticated systemAdmin and the
 *   required technicianId
 * @param props.systemAdmin - The authenticated system administrator
 *   (SystemadminPayload)
 * @param props.technicianId - The UUID of the technician to retrieve
 * @returns A detailed technician record matching IHealthcarePlatformTechnician
 * @throws {Error} If the technician does not exist, or is soft-deleted
 *   (deleted_at not null).
 */
export async function gethealthcarePlatformSystemAdminTechniciansTechnicianId(props: {
  systemAdmin: SystemadminPayload;
  technicianId: string & tags.Format<"uuid">;
}): Promise<IHealthcarePlatformTechnician> {
  const { technicianId } = props;
  // Fetch technician by id, only if not soft-deleted
  const technician =
    await MyGlobal.prisma.healthcare_platform_technicians.findFirst({
      where: {
        id: technicianId,
        deleted_at: null,
      },
    });
  if (!technician) {
    throw new Error("Technician not found");
  }
  return {
    id: technician.id,
    email: technician.email,
    full_name: technician.full_name,
    license_number: technician.license_number,
    specialty: technician.specialty ?? undefined,
    phone: technician.phone ?? undefined,
    created_at: toISOStringSafe(technician.created_at),
    updated_at: toISOStringSafe(technician.updated_at),
    deleted_at: technician.deleted_at
      ? toISOStringSafe(technician.deleted_at)
      : undefined,
  };
}
