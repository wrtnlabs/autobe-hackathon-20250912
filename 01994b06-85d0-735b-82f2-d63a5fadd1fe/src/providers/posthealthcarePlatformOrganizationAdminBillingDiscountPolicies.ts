import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformBillingDiscountPolicy } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformBillingDiscountPolicy";
import { OrganizationadminPayload } from "../decorators/payload/OrganizationadminPayload";

/**
 * Create a new billing discount policy in
 * healthcare_platform_billing_discount_policies.
 *
 * This function allows an authenticated organization admin to create a new
 * discount policy scoped to their organization. Policies define business logic
 * for discounts such as charity care, employee benefits, and sliding-scale
 * reductions, and are critical for financial and compliance workflows. The
 * implementation enforces that only admins can create policies for their own
 * organization, and policy names are unique within each organization (Prisma
 * uniqueness constraint).
 *
 * Validation steps:
 *
 * - OrganizationadminPayload 'id' (top-level admin user UUID, which matches org
 *   id) must match organization_id in the input.
 * - Duplicate creation (same policy_name for the same organization_id) results in
 *   error (handled via Prisma constraint).
 *
 * @param props - The props object containing authentication and request body
 * @param props.organizationAdmin - The authenticated organization admin user
 *   performing the action (OrganizationadminPayload)
 * @param props.body - The ICreate DTO for the new billing discount policy
 * @returns The newly created billing discount policy (strictly matching
 *   IHealthcarePlatformBillingDiscountPolicy)
 * @throws {Error} If organization_id does not match admin, or duplication
 *   constraint violated
 */
export async function posthealthcarePlatformOrganizationAdminBillingDiscountPolicies(props: {
  organizationAdmin: OrganizationadminPayload;
  body: IHealthcarePlatformBillingDiscountPolicy.ICreate;
}): Promise<IHealthcarePlatformBillingDiscountPolicy> {
  const { organizationAdmin, body } = props;
  // Security: Only allow organizationAdmin to create policies for their org
  if (organizationAdmin.id !== body.organization_id) {
    throw new Error(
      "Forbidden: Organization admin can only create policies for their own organization.",
    );
  }
  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());
  try {
    const created =
      await MyGlobal.prisma.healthcare_platform_billing_discount_policies.create(
        {
          data: {
            id: v4() as string & tags.Format<"uuid">,
            organization_id: body.organization_id,
            policy_name: body.policy_name,
            discount_type: body.discount_type,
            description: body.description ?? undefined,
            is_active: body.is_active,
            created_at: now,
            updated_at: now,
          },
        },
      );
    return {
      id: created.id,
      organization_id: created.organization_id,
      policy_name: created.policy_name,
      discount_type: created.discount_type,
      description: created.description ?? undefined,
      is_active: created.is_active,
      created_at: toISOStringSafe(created.created_at),
      updated_at: toISOStringSafe(created.updated_at),
    };
  } catch (err) {
    if (
      typeof err === "object" &&
      err !== null &&
      "code" in err &&
      (err as { code: string }).code === "P2002"
    ) {
      throw new Error(
        "A billing discount policy with this name already exists for this organization.",
      );
    }
    throw err;
  }
}
