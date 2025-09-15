import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { OrganizationadminPayload } from "../decorators/payload/OrganizationadminPayload";

/**
 * Permanently erase an insurance policy record by its ID from the
 * insurance_policies table.
 *
 * This endpoint permanently deletes an insurance policy, removing it from the
 * healthcare_platform_insurance_policies database if allowed (no legal
 * constraints are currently represented in the schema). The action enforces
 * RBAC: only an admin for the same organization as the policy may delete. A
 * missing or out-of-scope policy results in an error. Hard delete is performed;
 * if a soft-delete marker exists, it is ignored and the row is removed. Audit
 * logging is assumed to be handled externally. No return body is provided.
 *
 * @param props -
 *
 *   - OrganizationAdmin: OrganizationadminPayload (the authenticated org admin
 *       context)
 *   - InsurancePolicyId: Unique identifier of the insurance policy to delete (UUID
 *       format)
 *
 * @returns Void
 * @throws {Error} When policy not found, not authorized, or not within org
 *   scope
 */
export async function deletehealthcarePlatformOrganizationAdminInsurancePoliciesInsurancePolicyId(props: {
  organizationAdmin: OrganizationadminPayload;
  insurancePolicyId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { organizationAdmin, insurancePolicyId } = props;

  // Find the policy by id
  const policy =
    await MyGlobal.prisma.healthcare_platform_insurance_policies.findFirst({
      where: { id: insurancePolicyId },
    });
  if (policy === null) {
    throw new Error("Insurance policy not found");
  }

  // Only allow delete if the admin matches the org scope
  if (policy.organization_id !== organizationAdmin.id) {
    throw new Error(
      "Not authorized: insurance policy does not belong to your organization",
    );
  }

  // Hard delete
  await MyGlobal.prisma.healthcare_platform_insurance_policies.delete({
    where: { id: insurancePolicyId },
  });
}
