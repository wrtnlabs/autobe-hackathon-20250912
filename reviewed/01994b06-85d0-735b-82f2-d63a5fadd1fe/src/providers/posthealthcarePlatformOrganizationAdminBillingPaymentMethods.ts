import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformBillingPaymentMethod } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformBillingPaymentMethod";
import { OrganizationadminPayload } from "../decorators/payload/OrganizationadminPayload";

/**
 * Create a new billing payment method record
 * (healthcare_platform_billing_payment_methods) for an organization.
 *
 * This operation creates and registers a new billing payment method associated
 * with a specific organization in the healthcare platform. Supported method
 * types include credit card, ACH, insurance, check, in-person, and custom
 * payment channels. The API enforces organization-level uniqueness for
 * (organization_id, method_type, provider_name), rejecting duplicate entries.
 * Date/time values are handled as ISO 8601 strings. Only organization
 * administrators may call this endpoint.
 *
 * On success, returns the complete payment method details as stored in the
 * system. Attempts to create a duplicate payment method for the same
 * organization/method/provider will return a business validation error.
 *
 * @param props - Request props
 * @param props.organizationAdmin - The authenticated organization administrator
 *   payload
 * @param props.body - Payment method creation parameters conforming to
 *   IHealthcarePlatformBillingPaymentMethod.ICreate
 * @returns Newly created billing payment method record
 * @throws {Error} When a payment method with the same organization, type and
 *   provider already exists
 */
export async function posthealthcarePlatformOrganizationAdminBillingPaymentMethods(props: {
  organizationAdmin: OrganizationadminPayload;
  body: IHealthcarePlatformBillingPaymentMethod.ICreate;
}): Promise<IHealthcarePlatformBillingPaymentMethod> {
  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());
  const id: string & tags.Format<"uuid"> = v4();

  // Check for uniqueness constraint (organization_id, method_type, provider_name)
  const duplicate =
    await MyGlobal.prisma.healthcare_platform_billing_payment_methods.findFirst(
      {
        where: {
          organization_id: props.body.organization_id,
          method_type: props.body.method_type,
          // Prisma treats null and undefined differently for nullable fields
          provider_name: props.body.provider_name ?? undefined,
        },
      },
    );
  if (duplicate !== null) {
    throw new Error(
      "Duplicate payment method for this organization, method type, and provider",
    );
  }
  // Create new payment method record
  const created =
    await MyGlobal.prisma.healthcare_platform_billing_payment_methods.create({
      data: {
        id,
        organization_id: props.body.organization_id,
        method_type: props.body.method_type,
        provider_name: props.body.provider_name ?? undefined,
        details_json: props.body.details_json ?? undefined,
        is_active: props.body.is_active,
        created_at: now,
        updated_at: now,
      },
    });
  return {
    id: created.id,
    organization_id: created.organization_id,
    method_type: created.method_type,
    provider_name: created.provider_name ?? undefined,
    details_json: created.details_json ?? undefined,
    is_active: created.is_active,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
  };
}
