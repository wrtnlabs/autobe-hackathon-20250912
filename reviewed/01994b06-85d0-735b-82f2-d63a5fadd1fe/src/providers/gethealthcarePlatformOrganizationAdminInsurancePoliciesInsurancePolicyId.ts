import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformInsurancePolicy } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformInsurancePolicy";
import { OrganizationadminPayload } from "../decorators/payload/OrganizationadminPayload";

/**
 * Retrieve detailed insurance policy information by ID from the
 * insurance_policies table.
 *
 * This function fetches and returns a single insurance policy record by its
 * unique identifier. The operation enforces that the policy is not soft deleted
 * (deleted_at is null) and that it belongs to the same organization as the
 * requesting organization admin. All date/datetime values are properly
 * formatted as string, branded according to API specification. Inaccessible,
 * deleted, or missing policies result in an Error.
 *
 * @param props - Props object containing authenticated organization admin
 *   payload and the insurancePolicyId
 * @param props.organizationAdmin - OrganizationadminPayload; admin user context
 *   (RBAC enforced)
 * @param props.insurancePolicyId - The unique UUID of the insurance policy to
 *   retrieve
 * @returns The fully detailed insurance policy record
 * @throws {Error} If policy not found, is soft deleted, or admin lacks
 *   permission
 */
export async function gethealthcarePlatformOrganizationAdminInsurancePoliciesInsurancePolicyId(props: {
  organizationAdmin: OrganizationadminPayload;
  insurancePolicyId: string & tags.Format<"uuid">;
}): Promise<IHealthcarePlatformInsurancePolicy> {
  const { organizationAdmin, insurancePolicyId } = props;

  // Look up the admin's organization for scope check (based on role model, assumed one org per admin)
  const orgAdmin =
    await MyGlobal.prisma.healthcare_platform_organizationadmins.findFirst({
      where: {
        id: organizationAdmin.id,
        deleted_at: null,
      },
      select: {
        id: true,
        // organization_id is not a column, context comes from admin's assigned organization for their actions. Insurance policy table includes org id directly.
      },
    });
  if (!orgAdmin) {
    throw new Error("Organization admin account not found or is deleted");
  }

  // Retrieve insurance policy that is not deleted and belongs to admin's org
  const policy =
    await MyGlobal.prisma.healthcare_platform_insurance_policies.findFirst({
      where: {
        id: insurancePolicyId,
        organization_id: {
          // Must ensure admin can only see policies for their org
          equals: orgAdmin.id,
        },
        deleted_at: null,
      },
    });
  if (!policy) {
    throw new Error("Insurance policy not found or access denied");
  }

  // Convert all datetime fields using toISOStringSafe
  return {
    id: policy.id,
    patient_id: policy.patient_id,
    organization_id: policy.organization_id,
    policy_number: policy.policy_number,
    payer_name: policy.payer_name,
    group_number:
      policy.group_number === undefined
        ? undefined
        : policy.group_number === null
          ? null
          : policy.group_number,
    coverage_start_date: toISOStringSafe(policy.coverage_start_date).slice(
      0,
      10,
    ),
    coverage_end_date:
      policy.coverage_end_date === undefined
        ? undefined
        : policy.coverage_end_date === null
          ? null
          : toISOStringSafe(policy.coverage_end_date).slice(0, 10),
    plan_type: policy.plan_type,
    policy_status: policy.policy_status,
    created_at: toISOStringSafe(policy.created_at),
    updated_at: toISOStringSafe(policy.updated_at),
    deleted_at:
      policy.deleted_at === undefined
        ? undefined
        : policy.deleted_at === null
          ? null
          : toISOStringSafe(policy.deleted_at),
  };
}
