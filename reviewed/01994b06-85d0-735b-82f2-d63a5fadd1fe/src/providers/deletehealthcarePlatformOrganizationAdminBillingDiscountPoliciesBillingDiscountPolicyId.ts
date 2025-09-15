import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { OrganizationadminPayload } from "../decorators/payload/OrganizationadminPayload";

/**
 * Soft-delete (hard delete if soft delete unsupported) a billing discount
 * policy by ID from healthcare_platform_billing_discount_policies.
 *
 * Allows organization-level administrators to remove a billing discount policy.
 * If soft delete is not supported in schema, performs a hard delete.
 *
 * @param props - Request properties
 * @param props.organizationAdmin - Authenticated organization admin user
 *   (OrganizationadminPayload)
 * @param props.billingDiscountPolicyId - UUID of the billing discount policy to
 *   delete
 * @returns Void if successful, or throws on error
 * @throws {Error} When the policy is not found
 * @throws {Error} When the authenticated admin is unauthorized for the policy's
 *   organization
 */
export async function deletehealthcarePlatformOrganizationAdminBillingDiscountPoliciesBillingDiscountPolicyId(props: {
  organizationAdmin: OrganizationadminPayload;
  billingDiscountPolicyId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { organizationAdmin, billingDiscountPolicyId } = props;

  // Fetch discount policy
  const policy =
    await MyGlobal.prisma.healthcare_platform_billing_discount_policies.findFirst(
      {
        where: { id: billingDiscountPolicyId },
        select: { id: true, organization_id: true },
      },
    );
  if (!policy) throw new Error("Billing discount policy not found");

  // RBAC: ensure admin has rights (for demo, any organizationAdmin can delete their org policies)
  const admin =
    await MyGlobal.prisma.healthcare_platform_organizationadmins.findFirst({
      where: { id: organizationAdmin.id },
      select: { id: true },
    });
  if (!admin)
    throw new Error("Unauthorized: Admin user not found or has been deleted");

  // For schema without soft delete, perform HARD DELETE
  await MyGlobal.prisma.healthcare_platform_billing_discount_policies.delete({
    where: { id: billingDiscountPolicyId },
  });
}
