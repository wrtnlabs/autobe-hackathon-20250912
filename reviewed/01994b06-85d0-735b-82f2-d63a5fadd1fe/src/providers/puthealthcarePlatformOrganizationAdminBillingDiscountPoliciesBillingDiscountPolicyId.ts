import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformBillingDiscountPolicy } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformBillingDiscountPolicy";
import { OrganizationadminPayload } from "../decorators/payload/OrganizationadminPayload";

/**
 * Update an existing billing discount policy by ID in
 * healthcare_platform_billing_discount_policies.
 *
 * Allows an organization-level admin (organizationAdmin) to update an existing
 * billing discount policy, enforcing RBAC. Only policies belonging to the
 * admin's organization can be modified. Supports changing policy_name,
 * discount_type, description, is_active, and always updates the updated_at
 * timestamp. Will reject updates that violate uniqueness or ownership business
 * rules. All date/datetime values are formatted as string &
 * tags.Format<'date-time'>. Strictly avoids any native Date usage or type
 * assertions.
 *
 * @param props -
 * @param props.organizationAdmin OrganizationadminPayload - The authenticated
 *   admin making this request. Must be an active (not deleted) organization
 *   admin.
 * @param props.billingDiscountPolicyId String & tags.Format<'uuid'> - The
 *   unique discount policy id to update.
 * @param props.body IHealthcarePlatformBillingDiscountPolicy.IUpdate - DTO
 *   fields to update for the policy. All fields optional.
 * @returns The updated billing discount policy record as
 *   IHealthcarePlatformBillingDiscountPolicy.
 * @throws {Error} If admin does not exist, policy not found, not owned by
 *   admin, or policy name is not unique.
 */
export async function puthealthcarePlatformOrganizationAdminBillingDiscountPoliciesBillingDiscountPolicyId(props: {
  organizationAdmin: OrganizationadminPayload;
  billingDiscountPolicyId: string & tags.Format<"uuid">;
  body: IHealthcarePlatformBillingDiscountPolicy.IUpdate;
}): Promise<IHealthcarePlatformBillingDiscountPolicy> {
  const { organizationAdmin, billingDiscountPolicyId, body } = props;

  // Fetch the current admin user's organization
  const admin =
    await MyGlobal.prisma.healthcare_platform_organizationadmins.findFirst({
      where: {
        id: organizationAdmin.id,
        deleted_at: null,
      },
    });
  if (!admin)
    throw new Error("Organization admin does not exist or is deleted");

  // Find the target policy by id
  const policy =
    await MyGlobal.prisma.healthcare_platform_billing_discount_policies.findFirst(
      {
        where: {
          id: billingDiscountPolicyId,
        },
      },
    );
  if (!policy) throw new Error("Discount policy not found or inaccessible");

  // RBAC: Policy must belong to this admin's organization
  if (policy.organization_id !== admin.id)
    throw new Error(
      "Permission denied: Billing discount policy does not belong to your organization",
    );

  // If updating policy_name, check uniqueness in this org (excluding this id)
  if (
    body.policy_name !== undefined &&
    body.policy_name !== null &&
    body.policy_name !== policy.policy_name
  ) {
    const duplicate =
      await MyGlobal.prisma.healthcare_platform_billing_discount_policies.findFirst(
        {
          where: {
            organization_id: admin.id,
            policy_name: body.policy_name,
            NOT: { id: billingDiscountPolicyId },
          },
        },
      );
    if (duplicate)
      throw new Error(
        "A discount policy with this name already exists for your organization",
      );
  }

  // Prepare update data, setting updated_at to now
  const now = toISOStringSafe(new Date());
  const updateData = {
    policy_name: body.policy_name ?? undefined,
    discount_type: body.discount_type ?? undefined,
    description: body.description ?? undefined,
    is_active: body.is_active ?? undefined,
    updated_at: now,
  };

  const updated =
    await MyGlobal.prisma.healthcare_platform_billing_discount_policies.update({
      where: { id: billingDiscountPolicyId },
      data: updateData,
    });

  // Return the strict DTO-formatted record
  return {
    id: updated.id,
    organization_id: updated.organization_id,
    policy_name: updated.policy_name,
    discount_type: updated.discount_type,
    description: updated.description ?? undefined,
    is_active: updated.is_active,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
  };
}
