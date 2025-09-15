import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformLabIntegration } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformLabIntegration";
import { OrganizationadminPayload } from "../decorators/payload/OrganizationadminPayload";

/**
 * Create a new lab provider integration configuration
 * (healthcare_platform_lab_integrations table).
 *
 * This operation creates a new laboratory integration configuration for an
 * organization. It allows an organization administrator to register a
 * connection to an external lab provider with required details such as provider
 * code, API endpoint URI, message format, and status. The integration is used
 * for lab order routing and result retrieval. Only organization admins should
 * invoke this function, as misconfiguration can impact compliance and security.
 * Provider code must be unique per organization (enforced at business logic).
 *
 * @param props - Parameters for the creation
 * @param props.organizationAdmin - Authenticated organization admin payload
 * @param props.body - Integration configuration (lab provider code, URI,
 *   format, status, and org ID)
 * @returns The complete details of the created laboratory integration
 *   configuration
 * @throws {Error} If an integration with the same provider code already exists
 *   for this organization
 */
export async function posthealthcarePlatformOrganizationAdminLabIntegrations(props: {
  organizationAdmin: OrganizationadminPayload;
  body: IHealthcarePlatformLabIntegration.ICreate;
}): Promise<IHealthcarePlatformLabIntegration> {
  const { organizationAdmin, body } = props;

  // Enforce uniqueness: no duplicate (org, lab_vendor_code) with active (not deleted) integration
  const duplicate =
    await MyGlobal.prisma.healthcare_platform_lab_integrations.findFirst({
      where: {
        healthcare_platform_organization_id:
          body.healthcare_platform_organization_id,
        lab_vendor_code: body.lab_vendor_code,
        deleted_at: null,
      },
    });
  if (duplicate) {
    throw new Error("Lab vendor code must be unique for this organization");
  }

  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());
  const created =
    await MyGlobal.prisma.healthcare_platform_lab_integrations.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        healthcare_platform_organization_id:
          body.healthcare_platform_organization_id,
        lab_vendor_code: body.lab_vendor_code,
        connection_uri: body.connection_uri,
        supported_message_format: body.supported_message_format,
        status: body.status,
        created_at: now,
        updated_at: now,
        deleted_at: null,
      },
    });

  // Prisma returns all fields as correct type except dates, which must be normalized
  return {
    id: created.id,
    healthcare_platform_organization_id:
      created.healthcare_platform_organization_id,
    lab_vendor_code: created.lab_vendor_code,
    connection_uri: created.connection_uri,
    supported_message_format: created.supported_message_format,
    status: created.status,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at: created.deleted_at ? toISOStringSafe(created.deleted_at) : null,
  };
}
