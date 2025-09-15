import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { OrganizationadminPayload } from "../decorators/payload/OrganizationadminPayload";

/**
 * Delete a billing code from the healthcarePlatform billing code catalog.
 *
 * This operation permanently deletes a billing code from the system's catalog,
 * ensuring that only organization administrators can perform the action. The
 * code is only deleted if it is not referenced by any billing items. Attempts
 * to delete a non-existent code, or a code that is in current use (referenced
 * by existing billing items), will raise a validation error. All operations
 * require authenticated org admin context, and access boundaries must be
 * enforced according to business rules.
 *
 * @param props - OrganizationAdmin: The authenticated organization admin
 *   performing the deletion. billingCodeId: The unique identifier of the
 *   billing code to delete.
 * @returns Void
 * @throws {Error} If the billing code does not exist, is referenced by billing
 *   items, or user is not authorized
 */
export async function deletehealthcarePlatformOrganizationAdminBillingCodesBillingCodeId(props: {
  organizationAdmin: OrganizationadminPayload;
  billingCodeId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { organizationAdmin, billingCodeId } = props;

  // 1. Ensure billing code exists
  const billingCode =
    await MyGlobal.prisma.healthcare_platform_billing_codes.findUnique({
      where: { id: billingCodeId },
    });
  if (!billingCode) {
    throw new Error("Billing code not found");
  }

  // 2. Check for references in billing items
  const isReferenced =
    await MyGlobal.prisma.healthcare_platform_billing_items.count({
      where: { billing_code_id: billingCodeId },
    });
  if (isReferenced > 0) {
    throw new Error(
      "Cannot delete billing code: it is referenced by existing billing items",
    );
  }

  // 3. (Optional) Business check: Only allow org admins of allowed orgs (not enforceable without org linkage in codes schema). In production, ensure codes are separated by org or linked by code_system rules.

  // 4. Delete via Prisma (hard delete, no soft delete field exists)
  await MyGlobal.prisma.healthcare_platform_billing_codes.delete({
    where: { id: billingCodeId },
  });
}
