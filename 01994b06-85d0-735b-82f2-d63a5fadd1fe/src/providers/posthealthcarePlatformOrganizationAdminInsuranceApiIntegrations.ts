import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformInsuranceApiIntegration } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformInsuranceApiIntegration";
import { OrganizationadminPayload } from "../decorators/payload/OrganizationadminPayload";

/**
 * Create a new insurance API integration configuration for an organization
 *
 * This function inserts a new configuration record into the insurance API
 * integrations table, enabling a healthcare organization to connect with an
 * external insurance payer or clearinghouse for real-time eligibility
 * verification and claims submission. Organization administrators must belong
 * to the organization to create a new integration. Duplicate integrations for
 * the same org and vendor combination are prevented. All date fields use ISO
 * string format, and no native Date type or assertions are used.
 *
 * Authorization: Only active org admins of the specific organization may create
 * integrations for that organization. Enforces uniqueness of (organization,
 * insurance_vendor_code).
 *
 * @param props.organizationAdmin - The authenticated organization admin
 *   performing the operation
 * @param props.body - Request body containing integration configuration details
 *   (organization_id, vendor code, URI, transactions, status)
 * @returns The created insurance API integration configuration object
 * @throws {Error} If authorization fails or a duplicate integration exists
 */
export async function posthealthcarePlatformOrganizationAdminInsuranceApiIntegrations(props: {
  organizationAdmin: OrganizationadminPayload;
  body: IHealthcarePlatformInsuranceApiIntegration.ICreate;
}): Promise<IHealthcarePlatformInsuranceApiIntegration> {
  const { organizationAdmin, body } = props;

  // 1. Authorization: must be active admin for the target org
  const orgAssignment =
    await MyGlobal.prisma.healthcare_platform_user_org_assignments.findFirst({
      where: {
        user_id: organizationAdmin.id,
        healthcare_platform_organization_id: body.organization_id,
        assignment_status: "active",
        deleted_at: null,
      },
    });
  if (!orgAssignment) {
    throw new Error(
      "You are not authorized to create integrations for this organization.",
    );
  }

  // 2. Uniqueness: must not exist already (org + vendor code)
  const duplicate =
    await MyGlobal.prisma.healthcare_platform_insurance_api_integrations.findFirst(
      {
        where: {
          healthcare_platform_organization_id: body.organization_id,
          insurance_vendor_code: body.insurance_vendor_code,
          deleted_at: null,
        },
      },
    );
  if (duplicate) {
    throw new Error(
      "This insurance API integration (organization + vendor code) already exists.",
    );
  }

  // 3. Insert new API integration
  const now = toISOStringSafe(new Date());
  const created =
    await MyGlobal.prisma.healthcare_platform_insurance_api_integrations.create(
      {
        data: {
          id: v4(),
          healthcare_platform_organization_id: body.organization_id,
          insurance_vendor_code: body.insurance_vendor_code,
          connection_uri: body.connection_uri,
          supported_transaction_types: body.supported_transaction_types,
          status: body.status,
          created_at: now,
          updated_at: now,
          deleted_at: null,
        },
      },
    );

  // 4. Return DTO with strict ISO string types, no Date usages
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
      created.deleted_at === null
        ? undefined
        : toISOStringSafe(created.deleted_at),
  };
}
