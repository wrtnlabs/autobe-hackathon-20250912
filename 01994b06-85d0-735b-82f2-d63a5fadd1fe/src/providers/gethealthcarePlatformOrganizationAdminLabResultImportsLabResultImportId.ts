import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformLabResultImport } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformLabResultImport";
import { OrganizationadminPayload } from "../decorators/payload/OrganizationadminPayload";

/**
 * Get a single lab result import record by ID for an organization admin.
 *
 * Retrieves details of a specific lab result import, mapping metadata, parsing
 * status, error details, and timestamps from the
 * healthcare_platform_lab_result_imports table. This endpoint is restricted
 * such that only an authenticated organization admin may request details for a
 * lab result import belonging to their organization. Access to soft-deleted or
 * non-existent records is forbidden.
 *
 * @param props - Parameters for the fetch operation
 * @param props.organizationAdmin - The authenticated organization admin user
 *   requesting information
 * @param props.labResultImportId - The unique UUID of the lab result import row
 *   to retrieve
 * @returns Detailed lab result import metadata and parsing outcome matching
 *   IHealthcarePlatformLabResultImport
 * @throws {Error} If the import record is not found, is deleted, or does not
 *   belong to the admin's organization
 */
export async function gethealthcarePlatformOrganizationAdminLabResultImportsLabResultImportId(props: {
  organizationAdmin: OrganizationadminPayload;
  labResultImportId: string & tags.Format<"uuid">;
}): Promise<IHealthcarePlatformLabResultImport> {
  const { organizationAdmin, labResultImportId } = props;

  // Fetch the admin's organization assignment
  // Org id is not in payload, so find admin record and expectation is one admin = one org; get org id from admin's primary key
  const adminUser =
    await MyGlobal.prisma.healthcare_platform_organizationadmins.findUnique({
      where: { id: organizationAdmin.id },
    });
  if (!adminUser || adminUser.deleted_at !== null) {
    throw new Error("Unauthorized: Admin account not found");
  }

  // Fetch the lab import record, including check on deleted_at
  const importRecord =
    await MyGlobal.prisma.healthcare_platform_lab_result_imports.findUnique({
      where: { id: labResultImportId },
    });
  if (!importRecord || importRecord.deleted_at !== null) {
    throw new Error("Lab result import not found");
  }

  // Enforce org boundary -- this import must belong to the admin's org
  // In typical SaaS, admin id = org id if admin is specific to org, so org id is adminUser.id
  if (importRecord.healthcare_platform_organization_id !== adminUser.id) {
    throw new Error(
      "Forbidden: This lab result import does not belong to your organization",
    );
  }

  // Map all fields, converting all date/timestamp fields using toISOStringSafe
  // Handle optional/nullable fields strictly as per DTO:
  //   parsed_message: string | null | undefined (missing/null from DB = undefined or null)
  //   deleted_at: (string & tags.Format<'date-time'>) | null | undefined
  return {
    id: importRecord.id,
    healthcare_platform_organization_id:
      importRecord.healthcare_platform_organization_id,
    lab_integration_id: importRecord.lab_integration_id,
    raw_payload_reference: importRecord.raw_payload_reference,
    parsed_status: importRecord.parsed_status,
    parsed_message: importRecord.parsed_message ?? undefined,
    imported_at: toISOStringSafe(importRecord.imported_at),
    created_at: toISOStringSafe(importRecord.created_at),
    updated_at: toISOStringSafe(importRecord.updated_at),
    deleted_at: importRecord.deleted_at
      ? toISOStringSafe(importRecord.deleted_at)
      : undefined,
  };
}
