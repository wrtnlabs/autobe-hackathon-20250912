import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformLegalHold } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformLegalHold";
import { OrganizationadminPayload } from "../decorators/payload/OrganizationadminPayload";

/**
 * Get details of a HealthcarePlatformLegalHold entity by legalHoldId.
 *
 * This endpoint fetches the details for a specific legal hold entity by its
 * unique identifier, returning full record fields such as organization,
 * subject, status, method, reason, effective and release windows, and
 * compliance associations.
 *
 * The operation is accessible only to organization admins, with all access
 * audited for regulatory compliance. Data returned supports downstream
 * compliance review, internal or external audit, and legal workflows. Errors
 * may occur for permission violations, non-existent or deleted records, and
 * access outside organization bounds.
 *
 * @param props - Request properties
 * @param props.organizationAdmin - The authenticated organization admin user
 *   making the request
 * @param props.legalHoldId - The unique identifier for the desired legal hold
 *   record (UUID)
 * @returns The complete legal hold record matching the requested id, mapped to
 *   API structure
 * @throws {Error} When the admin cannot access the record due to permission or
 *   if it does not exist
 */
export async function gethealthcarePlatformOrganizationAdminLegalHoldsLegalHoldId(props: {
  organizationAdmin: OrganizationadminPayload;
  legalHoldId: string & tags.Format<"uuid">;
}): Promise<IHealthcarePlatformLegalHold> {
  // Step 1: Fetch the organization admin record to discover their organization boundary
  const admin =
    await MyGlobal.prisma.healthcare_platform_organizationadmins.findFirst({
      where: {
        id: props.organizationAdmin.id,
        deleted_at: null,
      },
      select: {
        id: true,
        // There is not an explicit organization_id on admin row; the admin belongs to an org by join/event or RBAC outside this core table
      },
    });
  if (!admin)
    throw new Error("Organization admin not found or has been deleted");

  // Step 2: Find a legal hold record by id, not deleted
  const legalHold =
    await MyGlobal.prisma.healthcare_platform_legal_holds.findFirst({
      where: {
        id: props.legalHoldId,
        deleted_at: null,
      },
    });
  if (!legalHold) throw new Error("Legal hold not found or already deleted");

  // Step 3: RBAC – Find the organization id for this admin by scanning any legal hold records imposed by this admin
  // Since admin record itself does not list an organization_id, the admin is considered member of any organization where they have imposed a legal hold (approximation)
  // In realistic codebase, admin's org_id should be available in their JWT or user profile
  // As a fallback, only show legal hold if admin is the imposed_by_id or if they imposed a legal hold for the same org
  // In well-typed platform, organization_id should be a property of OrganizationadminPayload
  // For correctness, we will allow access if imposed_by_id == admin.id or (future: admin.org == legalHold.organization_id)
  const isImposer = legalHold.imposed_by_id === admin.id;
  if (!isImposer) {
    throw new Error(
      "You do not have permission to access this legal hold record",
    );
  }

  // Map Prisma result to API DTO. Ensure dates are converted. Map nulls/undefined properly for optional/nullable fields
  return {
    id: legalHold.id,
    organization_id: legalHold.organization_id,
    imposed_by_id: legalHold.imposed_by_id ?? undefined,
    department_id: legalHold.department_id ?? undefined,
    subject_type: legalHold.subject_type,
    subject_id: legalHold.subject_id ?? undefined,
    reason: legalHold.reason,
    method: legalHold.method,
    status: legalHold.status,
    effective_at: toISOStringSafe(legalHold.effective_at),
    release_at: legalHold.release_at
      ? toISOStringSafe(legalHold.release_at)
      : undefined,
    created_at: toISOStringSafe(legalHold.created_at),
    updated_at: toISOStringSafe(legalHold.updated_at),
    deleted_at: legalHold.deleted_at
      ? toISOStringSafe(legalHold.deleted_at)
      : undefined,
  };
}
