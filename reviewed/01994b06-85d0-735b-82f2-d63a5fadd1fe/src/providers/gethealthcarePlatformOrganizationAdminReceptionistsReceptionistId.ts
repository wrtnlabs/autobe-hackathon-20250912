import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformReceptionist } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformReceptionist";
import { OrganizationadminPayload } from "../decorators/payload/OrganizationadminPayload";

/**
 * Retrieve detailed information about a specific receptionist from the
 * healthcare_platform_receptionists table.
 *
 * This endpoint allows an authenticated organization admin to fetch the
 * complete profile and status of a receptionist in their own organization,
 * identified by the unique receptionistId. It enforces strict
 * organization-level access control, ensuring the admin can only view
 * receptionists assigned to their organization.
 *
 * @param props - The function parameters
 * @param props.organizationAdmin - The authenticated organization admin user
 *   payload (must be actively assigned to an org)
 * @param props.receptionistId - The unique receptionist ID to retrieve
 * @returns The receptionist's profile and account status information
 * @throws {Error} If not found, deleted, or organization access is not
 *   permitted
 */
export async function gethealthcarePlatformOrganizationAdminReceptionistsReceptionistId(props: {
  organizationAdmin: OrganizationadminPayload;
  receptionistId: string & tags.Format<"uuid">;
}): Promise<IHealthcarePlatformReceptionist> {
  const { organizationAdmin, receptionistId } = props;

  // Find the receptionist (only if not soft-deleted)
  const receptionist =
    await MyGlobal.prisma.healthcare_platform_receptionists.findFirst({
      where: {
        id: receptionistId,
        deleted_at: null,
      },
    });
  if (!receptionist)
    throw new Error("Receptionist not found, deleted, or inaccessible");

  // Get the admin's org assignment (must be active)
  const orgAssignment =
    await MyGlobal.prisma.healthcare_platform_user_org_assignments.findFirst({
      where: {
        user_id: organizationAdmin.id,
        assignment_status: "active",
        deleted_at: null,
      },
    });
  if (!orgAssignment)
    throw new Error(
      "Organization admin is not assigned to an active organization.",
    );

  // Ensure the receptionist belongs to the same organization
  const receptionistAssignment =
    await MyGlobal.prisma.healthcare_platform_user_org_assignments.findFirst({
      where: {
        user_id: receptionist.id,
        healthcare_platform_organization_id:
          orgAssignment.healthcare_platform_organization_id,
        assignment_status: "active",
        deleted_at: null,
      },
    });
  if (!receptionistAssignment)
    throw new Error("You do not have access to view this receptionist");

  return {
    id: receptionist.id,
    email: receptionist.email,
    full_name: receptionist.full_name,
    phone: receptionist.phone ?? null,
    created_at: toISOStringSafe(receptionist.created_at),
    updated_at: toISOStringSafe(receptionist.updated_at),
    deleted_at: receptionist.deleted_at
      ? toISOStringSafe(receptionist.deleted_at)
      : undefined,
  };
}
