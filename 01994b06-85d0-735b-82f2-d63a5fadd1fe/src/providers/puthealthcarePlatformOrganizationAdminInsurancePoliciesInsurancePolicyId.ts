import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformInsurancePolicy } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformInsurancePolicy";
import { OrganizationadminPayload } from "../decorators/payload/OrganizationadminPayload";

/**
 * Update an existing insurance policy by ID, organization-authorized, with
 * strict field and audit validations.
 *
 * This operation allows an organization administrator to update permitted
 * fields (policy_number, payer_name, group_number, coverage dates, plan_type,
 * policy_status) of an insurance policy in their own organization. It strictly
 * enforces business validation for soft-delete, uniqueness, and field-level
 * mutability, records an audit event for compliance, and always conforms to
 * strong typing and date/time rules.
 *
 * @param props - Properties containing:
 *
 *   - OrganizationAdmin: The authenticated organization administrator performing
 *       the update
 *   - InsurancePolicyId: UUID identifier of the insurance policy to be updated
 *   - Body: The update DTO specifying mutable fields
 *
 * @returns The updated insurance policy entity, with all fields safely
 *   formatted for API contracts
 * @throws {Error} If the insurance policy does not exist, has been deleted, is
 *   not in admin's org, or uniqueness would be violated
 */
export async function puthealthcarePlatformOrganizationAdminInsurancePoliciesInsurancePolicyId(props: {
  organizationAdmin: OrganizationadminPayload;
  insurancePolicyId: string & tags.Format<"uuid">;
  body: IHealthcarePlatformInsurancePolicy.IUpdate;
}): Promise<IHealthcarePlatformInsurancePolicy> {
  const { organizationAdmin, insurancePolicyId, body } = props;
  // 1. Fetch admin user to get assigned organization_id
  const adminRecord =
    await MyGlobal.prisma.healthcare_platform_organizationadmins.findFirst({
      where: {
        id: organizationAdmin.id,
        deleted_at: null,
      },
      select: { id: true /* possibly add org assignment if schema allowed */ },
    });
  if (!adminRecord) throw new Error("Admin user not found or is deleted.");
  // Lookup allowed org_ids from org assignment table (user-org assignments)
  const orgAssignment =
    await MyGlobal.prisma.healthcare_platform_user_org_assignments.findFirst({
      where: {
        user_id: adminRecord.id,
        deleted_at: null,
      },
      select: {
        healthcare_platform_organization_id: true,
      },
    });
  if (!orgAssignment)
    throw new Error("Admin user has no active organization assignment.");
  const orgId = orgAssignment.healthcare_platform_organization_id;
  // 2. Fetch insurance policy by ID, soft delete, and organization check
  const policy =
    await MyGlobal.prisma.healthcare_platform_insurance_policies.findFirst({
      where: {
        id: insurancePolicyId,
        organization_id: orgId,
        deleted_at: null,
      },
    });
  if (!policy)
    throw new Error(
      "Insurance policy not found or is deleted or not in your organization.",
    );
  // 3. If changing policy_number or payer_name, enforce uniqueness constraint
  const needUniqCheck =
    (body.policy_number !== undefined &&
      body.policy_number !== policy.policy_number) ||
    (body.payer_name !== undefined && body.payer_name !== policy.payer_name);
  if (needUniqCheck) {
    const dup =
      await MyGlobal.prisma.healthcare_platform_insurance_policies.findFirst({
        where: {
          organization_id: orgId,
          policy_number: body.policy_number ?? policy.policy_number,
          payer_name: body.payer_name ?? policy.payer_name,
          id: { not: insurancePolicyId },
          deleted_at: null,
        },
      });
    if (dup)
      throw new Error(
        "Duplicate policy_number + payer_name exists for this organization.",
      );
  }
  // 4. Prepare update object for all allowed fields
  const now = toISOStringSafe(new Date());
  const updated =
    await MyGlobal.prisma.healthcare_platform_insurance_policies.update({
      where: { id: insurancePolicyId },
      data: {
        policy_number: body.policy_number ?? undefined,
        payer_name: body.payer_name ?? undefined,
        group_number: "group_number" in body ? body.group_number : undefined,
        coverage_start_date: body.coverage_start_date ?? undefined,
        coverage_end_date:
          "coverage_end_date" in body ? body.coverage_end_date : undefined,
        plan_type: body.plan_type ?? undefined,
        policy_status: body.policy_status ?? undefined,
        updated_at: now,
      },
    });
  // 5. Insert audit log entry for update for regulatory compliance
  await MyGlobal.prisma.healthcare_platform_audit_logs.create({
    data: {
      user_id: organizationAdmin.id,
      organization_id: orgId,
      action_type: "INSURANCE_POLICY_UPDATE",
      event_context: JSON.stringify({
        insurance_policy_id: insurancePolicyId,
        changed_fields: Object.keys(body),
        new_values: body,
      }),
      created_at: now,
    },
  });
  // 6. Return API object, converting all Date fields safely
  return {
    id: updated.id,
    patient_id: updated.patient_id,
    organization_id: updated.organization_id,
    policy_number: updated.policy_number,
    payer_name: updated.payer_name,
    group_number:
      typeof updated.group_number !== "undefined"
        ? updated.group_number
        : undefined,
    coverage_start_date: toISOStringSafe(updated.coverage_start_date),
    coverage_end_date:
      typeof updated.coverage_end_date === "undefined" ||
      updated.coverage_end_date === null
        ? undefined
        : toISOStringSafe(updated.coverage_end_date),
    plan_type: updated.plan_type,
    policy_status: updated.policy_status,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at:
      typeof updated.deleted_at === "undefined" || updated.deleted_at === null
        ? undefined
        : toISOStringSafe(updated.deleted_at),
  };
}
