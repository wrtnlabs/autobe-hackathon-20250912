import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformTechnician } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformTechnician";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * Update a technician's profile in the healthcare_platform_technicians table.
 *
 * This endpoint allows a system administrator to update mutable information for
 * an existing technician. Only fields explicitly provided in the request body
 * (full_name, specialty, phone) are updated. Verification ensures the
 * technician exists and is not deleted; attempts to update a non-existent or
 * deleted technician will throw an error. All date fields are converted to
 * string & tags.Format<'date-time'> for consistency and compliance.
 *
 * Security: Only systemAdmin users authorized via SystemadminAuth can invoke
 * this operation. Modifying technician data is auditable in the platform.
 *
 * @param props - Object containing systemAdmin payload for authentication, the
 *   technician's UUID, and the update body.
 * @param props.systemAdmin - The authenticated systemAdmin user making this
 *   request.
 * @param props.technicianId - UUID of the technician to update.
 * @param props.body - Fields to update (may include full_name, specialty,
 *   phone).
 * @returns The updated technician profile after changes are applied.
 * @throws {Error} If the technician is not found or is soft deleted.
 */
export async function puthealthcarePlatformSystemAdminTechniciansTechnicianId(props: {
  systemAdmin: SystemadminPayload;
  technicianId: string & tags.Format<"uuid">;
  body: IHealthcarePlatformTechnician.IUpdate;
}): Promise<IHealthcarePlatformTechnician> {
  const { technicianId, body } = props;

  // Step 1: Fetch technician, ensure it exists and is not deleted
  const current =
    await MyGlobal.prisma.healthcare_platform_technicians.findFirst({
      where: {
        id: technicianId,
        deleted_at: null,
      },
    });
  if (!current) {
    throw new Error("Technician not found or is deleted");
  }

  // Step 2: Update only mutable fields if provided, and always updated_at
  const updateResult =
    await MyGlobal.prisma.healthcare_platform_technicians.update({
      where: { id: technicianId },
      data: {
        ...(body.full_name !== undefined ? { full_name: body.full_name } : {}),
        ...(body.specialty !== undefined ? { specialty: body.specialty } : {}),
        ...(body.phone !== undefined ? { phone: body.phone } : {}),
        updated_at: toISOStringSafe(new Date()),
      },
    });

  // Step 3: Return technician as IHealthcarePlatformTechnician with proper date conversions
  return {
    id: updateResult.id,
    email: updateResult.email,
    full_name: updateResult.full_name,
    license_number: updateResult.license_number,
    specialty:
      updateResult.specialty !== null ? updateResult.specialty : undefined,
    phone: updateResult.phone !== null ? updateResult.phone : undefined,
    created_at: toISOStringSafe(updateResult.created_at),
    updated_at: toISOStringSafe(updateResult.updated_at),
    deleted_at: updateResult.deleted_at
      ? toISOStringSafe(updateResult.deleted_at)
      : undefined,
  };
}
