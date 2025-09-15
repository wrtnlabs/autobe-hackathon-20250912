import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformTechnician } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformTechnician";
import { OrganizationadminPayload } from "../decorators/payload/OrganizationadminPayload";

/**
 * Retrieve a technician record in healthcare_platform_technicians by ID.
 *
 * This operation retrieves the full profile for a specific technician, as
 * identified by the provided UUID technicianId. The profile includes fields for
 * identity, credentials, contact info, and audit timestamps, as defined in the
 * API contract and Prisma schema.
 *
 * Authorization: Only accessible to users authenticated as organizationAdmin.
 * Business rules require that admins may access only technicians belonging to
 * their own organization. However, the current Prisma schema for
 * healthcare_platform_technicians provides NO field or mapping that indicates
 * which organization a technician belongs to, making enforcement of this
 * boundary impossible without additional schema/tables.
 *
 * If the technician record does not exist OR is soft-deleted (deleted_at is not
 * null), a 404 (not found) error is thrown. In all other cases, the complete
 * technician record is returned.
 *
 * @param props -
 *
 *   - OrganizationAdmin: OrganizationadminPayload (authenticated admin)
 *   - TechnicianId: UUID of the technician to retrieve
 *
 * @returns The technician's full profile as IHealthcarePlatformTechnician
 * @throws {Error} If technicianId does not exist or is soft-deleted
 * @throws {Error} If organization membership boundaries must be enforced but
 *   cannot be validated (see below)
 */
export async function gethealthcarePlatformOrganizationAdminTechniciansTechnicianId(props: {
  organizationAdmin: OrganizationadminPayload;
  technicianId: string & tags.Format<"uuid">;
}): Promise<IHealthcarePlatformTechnician> {
  // SCHEMA-API CONTRADICTION: No organization linkage in healthcare_platform_technicians model,
  // so cannot enforce org boundaries as required by scenario/test scope. If this is needed,
  // you must add org_id or equivalent mapping to schema.

  // Fetch the technician (must not be soft-deleted)
  const technician =
    await MyGlobal.prisma.healthcare_platform_technicians.findFirst({
      where: {
        id: props.technicianId,
        deleted_at: null,
      },
    });
  if (!technician) throw new Error("Technician not found");

  // Map to DTO shape, using correct null/undefined and date formatting per API contract
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
