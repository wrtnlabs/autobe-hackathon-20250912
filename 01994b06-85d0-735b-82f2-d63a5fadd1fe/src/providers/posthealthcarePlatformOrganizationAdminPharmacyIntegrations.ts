import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformPharmacyIntegration } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformPharmacyIntegration";
import { OrganizationadminPayload } from "../decorators/payload/OrganizationadminPayload";

/**
 * Create a new pharmacy integration for the organization
 * (healthcare_platform_pharmacy_integrations)
 *
 * This endpoint creates a new pharmacy integration configuration for the
 * specified healthcare organization. Only authenticated organization admins can
 * use this operation. It enforces duplicate prevention for active integrations
 * (same pharmacy_vendor_code + organization). All connection, protocol, and
 * status configuration fields are required. Timestamp and id fields are
 * generated automatically per system policy.
 *
 * @param props - Object containing the authenticated organization admin and
 *   integration creation details
 * @param props.organizationAdmin - Authenticated organization admin payload
 *   (validated by decorator)
 * @param props.body - Required configuration for the pharmacy integration
 *   (pharmacy_vendor_code, connection_uri, protocol, status)
 * @returns The created pharmacy integration object with all configuration and
 *   system fields populated.
 * @throws {Error} If an active integration record for the same
 *   organization/vendor code already exists (409 conflict).
 * @throws {Error} If any required field is missing or validation fails (400).
 * @throws {Error} If the acting user is not permitted (403) [authorization is
 *   enforced by decorator]
 */
export async function posthealthcarePlatformOrganizationAdminPharmacyIntegrations(props: {
  organizationAdmin: OrganizationadminPayload;
  body: IHealthcarePlatformPharmacyIntegration.ICreate;
}): Promise<IHealthcarePlatformPharmacyIntegration> {
  const { organizationAdmin, body } = props;

  // Enforce uniqueness (active = deleted_at is null)
  const duplicate =
    await MyGlobal.prisma.healthcare_platform_pharmacy_integrations.findFirst({
      where: {
        healthcare_platform_organization_id:
          body.healthcare_platform_organization_id,
        pharmacy_vendor_code: body.pharmacy_vendor_code,
        deleted_at: null,
      },
    });
  if (duplicate) {
    const conflict = new Error(
      "A pharmacy integration with this organization and vendor code already exists and is active.",
    );
    // Set HTTP status if available/util (optional)
    (conflict as any).status = 409;
    throw conflict;
  }

  const id: string & tags.Format<"uuid"> = v4();
  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());

  const created =
    await MyGlobal.prisma.healthcare_platform_pharmacy_integrations.create({
      data: {
        id,
        healthcare_platform_organization_id:
          body.healthcare_platform_organization_id,
        pharmacy_vendor_code: body.pharmacy_vendor_code,
        connection_uri: body.connection_uri,
        supported_protocol: body.supported_protocol,
        status: body.status,
        created_at: now,
        updated_at: now,
        // deleted_at: not set on creation
      },
    });

  // Map fields to DTO, deleted_at is optional/nullable.
  const result: IHealthcarePlatformPharmacyIntegration = {
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
      created.deleted_at !== null && created.deleted_at !== undefined
        ? toISOStringSafe(created.deleted_at)
        : undefined,
  };
  return result;
}
