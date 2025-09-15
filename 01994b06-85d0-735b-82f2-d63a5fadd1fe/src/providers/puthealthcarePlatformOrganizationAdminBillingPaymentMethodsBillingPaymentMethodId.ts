import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformBillingPaymentMethod } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformBillingPaymentMethod";
import { OrganizationadminPayload } from "../decorators/payload/OrganizationadminPayload";

/**
 * Update details or activation status of a billing payment method
 * (healthcare_platform_billing_payment_methods) by ID.
 *
 * Updates provider name, integration parameters, or active status for the
 * specified payment method record. Only organization administrators may update
 * payment methods in their organization. Attempts to mutate non-existent,
 * deleted, or cross-organization records will throw an error.
 *
 * @param props - Request properties
 * @param props.organizationAdmin - Authenticated organization admin performing
 *   update
 * @param props.billingPaymentMethodId - Unique payment method UUID to update
 * @param props.body - Patch data matching
 *   IHealthcarePlatformBillingPaymentMethod.IUpdate (any field may be omitted)
 * @returns The updated billing payment method object, with all fields
 * @throws {Error} If not found or update attempted on method outside admin's
 *   organization
 */
export async function puthealthcarePlatformOrganizationAdminBillingPaymentMethodsBillingPaymentMethodId(props: {
  organizationAdmin: OrganizationadminPayload;
  billingPaymentMethodId: string & tags.Format<"uuid">;
  body: IHealthcarePlatformBillingPaymentMethod.IUpdate;
}): Promise<IHealthcarePlatformBillingPaymentMethod> {
  const { organizationAdmin, billingPaymentMethodId, body } = props;
  // Step 1: Retrieve existing payment method, enforce org membership
  const existing =
    await MyGlobal.prisma.healthcare_platform_billing_payment_methods.findFirst(
      {
        where: { id: billingPaymentMethodId },
      },
    );
  if (!existing || existing.organization_id !== organizationAdmin.id) {
    throw new Error("Payment method not found or not in your organization");
  }
  // Step 2: Update only allowed fields (leave non-patchable untouched)
  const updateData = {
    ...(body.method_type !== undefined && { method_type: body.method_type }),
    ...(body.provider_name !== undefined && {
      provider_name: body.provider_name,
    }),
    ...(body.details_json !== undefined && { details_json: body.details_json }),
    ...(body.is_active !== undefined && { is_active: body.is_active }),
    updated_at: toISOStringSafe(new Date()),
  };
  const updated =
    await MyGlobal.prisma.healthcare_platform_billing_payment_methods.update({
      where: { id: billingPaymentMethodId },
      data: updateData,
    });
  return {
    id: updated.id,
    organization_id: updated.organization_id,
    method_type: updated.method_type,
    provider_name: updated.provider_name ?? undefined,
    details_json: updated.details_json ?? undefined,
    is_active: updated.is_active,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
  };
}
