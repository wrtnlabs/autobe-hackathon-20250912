import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformInsuranceApiIntegration } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformInsuranceApiIntegration";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * Create a new insurance API integration configuration for an organization
 *
 * This operation enables system administrators to create a new insurance API
 * integration configuration for a specific healthcare organization. The created
 * integration stores insurance vendor code, API connection URI, supported
 * transaction types, and operational status. The configuration enables
 * onboarding payers, automation of claims, and eligibility workflows while
 * enforcing organization boundaries and compliance requirements.
 *
 * Business rules handled:
 *
 * - Organization ID must exist and refer to an active (not deleted) organization.
 * - Only unique combinations of organization and vendor code are allowed
 *   (duplicate triggers clear error).
 * - All date/datetime fields are ISO 8601 strings (never uses Date type for any
 *   property).
 * - IDs are v4 UUIDs, type-safe.
 *
 * @param props - The request parameters
 * @param props.systemAdmin - The authenticated system administrator initiating
 *   the integration creation
 * @param props.body - The integration configuration details: organization,
 *   vendor code, endpoint URI, transaction types, status.
 * @returns The created insurance API integration configuration object
 * @throws {Error} If organization is not found or inactive, or uniqueness is
 *   violated
 */
export async function posthealthcarePlatformSystemAdminInsuranceApiIntegrations(props: {
  systemAdmin: SystemadminPayload;
  body: IHealthcarePlatformInsuranceApiIntegration.ICreate;
}): Promise<IHealthcarePlatformInsuranceApiIntegration> {
  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());
  // 1. Verify organization exists and is active
  const org = await MyGlobal.prisma.healthcare_platform_organizations.findFirst(
    {
      where: {
        id: props.body.organization_id,
        deleted_at: null,
      },
    },
  );
  if (!org) throw new Error("Organization not found or inactive");

  // 2. Attempt to create the new integration configuration
  let created;
  try {
    created =
      await MyGlobal.prisma.healthcare_platform_insurance_api_integrations.create(
        {
          data: {
            id: v4() as string & tags.Format<"uuid">,
            healthcare_platform_organization_id: props.body.organization_id,
            insurance_vendor_code: props.body.insurance_vendor_code,
            connection_uri: props.body.connection_uri,
            supported_transaction_types: props.body.supported_transaction_types,
            status: props.body.status,
            created_at: now,
            updated_at: now,
            deleted_at: null,
          },
        },
      );
  } catch (err) {
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2002"
    ) {
      throw new Error(
        "Duplicate integration for this organization and vendor code",
      );
    }
    throw err;
  }
  // 3. Return DTO strictly conforming to output interface
  return {
    id: created.id,
    healthcare_platform_organization_id:
      created.healthcare_platform_organization_id,
    insurance_vendor_code: created.insurance_vendor_code,
    connection_uri: created.connection_uri,
    supported_transaction_types: created.supported_transaction_types,
    status: created.status,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at:
      created.deleted_at == null ? null : toISOStringSafe(created.deleted_at),
  };
}
