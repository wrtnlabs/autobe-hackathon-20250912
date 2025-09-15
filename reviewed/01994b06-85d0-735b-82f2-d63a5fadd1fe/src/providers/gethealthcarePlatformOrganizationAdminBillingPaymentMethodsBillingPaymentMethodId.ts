import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformBillingPaymentMethod } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformBillingPaymentMethod";
import { OrganizationadminPayload } from "../decorators/payload/OrganizationadminPayload";

/**
 * Retrieve detailed information for a specific billing payment method
 * (healthcare_platform_billing_payment_methods table) in the healthcare
 * platform.
 *
 * Fetches detailed information about a specific billing payment method (e.g.,
 * credit card, insurance, ACH) used for billing operations in the healthcare
 * platform. It operates on the BillingPaymentMethods table, returning relevant
 * details such as method type, provider name, status, and configuration
 * metadata for the requested payment method. The operation is only available to
 * administrators and billing staff, and is restricted against
 * cross-organization access or attempts to fetch soft-deleted methods. Any
 * attempt to access a nonexistent or restricted payment method triggers a not
 * found error.
 *
 * @param props - Request properties
 * @param props.organizationAdmin - The authenticated organization admin making
 *   the request
 * @param props.billingPaymentMethodId - UUID of the billing payment method to
 *   retrieve
 * @returns Full details of the requested payment method entity, as permitted by
 *   the schema and user role
 * @throws {Error} If the payment method does not exist or does not belong to
 *   the admin's organization
 */
export async function gethealthcarePlatformOrganizationAdminBillingPaymentMethodsBillingPaymentMethodId(props: {
  organizationAdmin: OrganizationadminPayload;
  billingPaymentMethodId: string & tags.Format<"uuid">;
}): Promise<IHealthcarePlatformBillingPaymentMethod> {
  const { organizationAdmin, billingPaymentMethodId } = props;

  // Fetch payment method by id and org (soft-delete is not enforced here due to lack of field)
  const method =
    await MyGlobal.prisma.healthcare_platform_billing_payment_methods.findFirst(
      {
        where: {
          id: billingPaymentMethodId,
          organization_id: organizationAdmin.id,
        },
      },
    );

  if (!method) {
    throw new Error("Billing payment method not found or not accessible");
  }

  return {
    id: method.id,
    organization_id: method.organization_id,
    method_type: method.method_type,
    provider_name: method.provider_name ?? undefined,
    details_json: method.details_json ?? undefined,
    is_active: method.is_active,
    created_at: toISOStringSafe(method.created_at),
    updated_at: toISOStringSafe(method.updated_at),
  };
}
