import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformPharmacyIntegration } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformPharmacyIntegration";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * Create a new pharmacy integration for the organization
 * (healthcare_platform_pharmacy_integrations)
 *
 * This endpoint creates a new pharmacy network or e-prescribing integration row
 * for a given organization. All connection metadata is stored, after validating
 * protocol type and uniqueness for (organization, vendor code). This is
 * restricted to authenticated system administrators, who may onboard new
 * pharmacy partners via this operation. If a duplicate integration exists or if
 * protocol/permission constraints are violated, a precise error is thrown.
 *
 * @param props - Provider parameters (systemAdmin authentication and pharmacy
 *   integration configuration body)
 * @param props.systemAdmin - The authenticated SystemadminPayload (must have
 *   platform-wide privileges)
 * @param props.body - The IHealthcarePlatformPharmacyIntegration.ICreate
 *   payload
 * @returns The newly created IHealthcarePlatformPharmacyIntegration row, with
 *   all current field values.
 * @throws {Error} 400 - Invalid protocol; 409 - Duplicate integration; 403 -
 *   Insufficient permissions
 */
export async function posthealthcarePlatformSystemAdminPharmacyIntegrations(props: {
  systemAdmin: SystemadminPayload;
  body: IHealthcarePlatformPharmacyIntegration.ICreate;
}): Promise<IHealthcarePlatformPharmacyIntegration> {
  const { systemAdmin, body } = props;
  if (!systemAdmin)
    throw new Error(
      "403: Insufficient permission: requires systemAdmin access",
    );

  // Allowed protocol values for regulatory use (expand if business evolves)
  const allowedProtocols = ["NCPDP", "FHIR", "HL7"];
  if (!allowedProtocols.includes(body.supported_protocol)) {
    throw new Error(
      `400: Invalid supported_protocol: only one of ${allowedProtocols.join(", ")}`,
    );
  }

  // Uniqueness check (enforced by Prisma/DB, but checked here to provide clear 409)
  const exists =
    await MyGlobal.prisma.healthcare_platform_pharmacy_integrations.findFirst({
      where: {
        healthcare_platform_organization_id:
          body.healthcare_platform_organization_id,
        pharmacy_vendor_code: body.pharmacy_vendor_code,
      },
    });
  if (exists) {
    throw new Error(
      "409: Duplicate pharmacy_vendor_code already registered for this organization",
    );
  }

  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());
  const created =
    await MyGlobal.prisma.healthcare_platform_pharmacy_integrations.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        healthcare_platform_organization_id:
          body.healthcare_platform_organization_id,
        pharmacy_vendor_code: body.pharmacy_vendor_code,
        connection_uri: body.connection_uri,
        supported_protocol: body.supported_protocol,
        status: body.status,
        created_at: now,
        updated_at: now,
        deleted_at: null,
      },
    });

  return {
    id: created.id,
    healthcare_platform_organization_id:
      created.healthcare_platform_organization_id,
    pharmacy_vendor_code: created.pharmacy_vendor_code,
    connection_uri: created.connection_uri,
    supported_protocol: created.supported_protocol,
    status: created.status,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at:
      created.deleted_at === null
        ? undefined
        : toISOStringSafe(created.deleted_at),
  };
}
