import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformTechnician } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformTechnician";
import { OrganizationadminPayload } from "../decorators/payload/OrganizationadminPayload";

/**
 * Update a technician's profile in the healthcare_platform_technicians table.
 *
 * Updates mutable fields (full_name, specialty, phone) for an existing
 * technician, restricting access to authorized organizationAdmin users. Ensures
 * all date values are handled as ISO8601 strings. Throws errors for nonexistent
 * or archived (deleted) technicians. All changes are auditable via updated_at
 * timestamp.
 *
 * @param props - Properties for update operation
 * @param props.organizationAdmin - Authenticated organization administrator
 *   (OrganizationadminPayload)
 * @param props.technicianId - Unique identifier (UUID) of technician to update
 * @param props.body - Fields to update (full_name, specialty, phone)
 * @returns Updated technician profile record with all properties populated
 * @throws {Error} If technician is not found or has been deleted (archived)
 */
export async function puthealthcarePlatformOrganizationAdminTechniciansTechnicianId(props: {
  organizationAdmin: OrganizationadminPayload;
  technicianId: string & tags.Format<"uuid">;
  body: IHealthcarePlatformTechnician.IUpdate;
}): Promise<IHealthcarePlatformTechnician> {
  const { technicianId, body } = props;
  // Find technician (must exist, must not be deleted)
  const technician =
    await MyGlobal.prisma.healthcare_platform_technicians.findFirst({
      where: { id: technicianId, deleted_at: null },
    });
  if (!technician) {
    throw new Error("Technician not found or has been deleted.");
  }

  // Prepare now timestamp in correct ISO format
  const now = toISOStringSafe(new Date());

  // Update allowed fields (only those present in body)
  const updated = await MyGlobal.prisma.healthcare_platform_technicians.update({
    where: { id: technicianId },
    data: {
      ...(body.full_name !== undefined ? { full_name: body.full_name } : {}),
      ...(body.specialty !== undefined ? { specialty: body.specialty } : {}),
      ...(body.phone !== undefined ? { phone: body.phone } : {}),
      updated_at: now,
    },
  });

  // Return fully typed technician result
  const result: IHealthcarePlatformTechnician = {
    id: updated.id,
    email: updated.email,
    full_name: updated.full_name,
    license_number: updated.license_number,
    // For nullable/optional fields, preserve explicit null or undefined if allowed by DTO
    specialty:
      typeof updated.specialty !== "undefined" ? updated.specialty : undefined,
    phone: typeof updated.phone !== "undefined" ? updated.phone : undefined,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    // deleted_at is nullable/omittable in output; mapped accordingly
    ...(typeof updated.deleted_at !== "undefined"
      ? {
          deleted_at: updated.deleted_at
            ? toISOStringSafe(updated.deleted_at)
            : null,
        }
      : {}),
  };
  return result;
}
