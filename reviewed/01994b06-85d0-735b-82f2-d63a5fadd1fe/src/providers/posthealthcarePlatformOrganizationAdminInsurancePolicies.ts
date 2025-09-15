import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformInsurancePolicy } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformInsurancePolicy";
import { OrganizationadminPayload } from "../decorators/payload/OrganizationadminPayload";

/**
 * Create a new insurance policy record in the insurance_policies table.
 *
 * This endpoint allows authorized organization admins to create an insurance
 * policy for a patient. It validates foreign key references, enforces
 * uniqueness constraints, and only allows organization admins to create in
 * their own organization.
 *
 * @param props - Object containing the organization admin info and insurance
 *   policy creation payload
 * @param props.organizationAdmin - The authenticated organization admin making
 *   the request
 * @param props.body - Insurance policy details to create
 * @returns The newly created insurance policy object
 * @throws {Error} If unauthorized, patient does not exist, or policy violates
 *   uniqueness
 */
export async function posthealthcarePlatformOrganizationAdminInsurancePolicies(props: {
  organizationAdmin: OrganizationadminPayload;
  body: IHealthcarePlatformInsurancePolicy.ICreate;
}): Promise<IHealthcarePlatformInsurancePolicy> {
  const { organizationAdmin, body } = props;

  // Organization admin may only create for their own org
  if (body.organization_id !== organizationAdmin.id) {
    throw new Error(
      "Unauthorized: Organization admin may only create policy for their assigned organization",
    );
  }
  // Validate patient existence
  const patient = await MyGlobal.prisma.healthcare_platform_patients.findFirst({
    where: { id: body.patient_id },
  });
  if (!patient) {
    throw new Error("Patient not found");
  }
  // Enforce unique constraint
  const exists =
    await MyGlobal.prisma.healthcare_platform_insurance_policies.findFirst({
      where: {
        policy_number: body.policy_number,
        payer_name: body.payer_name,
        organization_id: body.organization_id,
      },
    });
  if (exists) {
    throw new Error(
      "Duplicate insurance policy for this organization, policy number, and payer",
    );
  }
  // Prepare system-managed fields
  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());
  const id: string & tags.Format<"uuid"> = v4();
  // Create policy
  const created =
    await MyGlobal.prisma.healthcare_platform_insurance_policies.create({
      data: {
        id,
        patient_id: body.patient_id,
        organization_id: body.organization_id,
        policy_number: body.policy_number,
        payer_name: body.payer_name,
        group_number: body.group_number ?? null,
        coverage_start_date: body.coverage_start_date,
        coverage_end_date: body.coverage_end_date ?? null,
        plan_type: body.plan_type,
        policy_status: body.policy_status,
        created_at: now,
        updated_at: now,
        deleted_at: null,
      },
    });
  // Return as API DTO; all date strings pass as-is except system fields
  return {
    id,
    patient_id: created.patient_id,
    organization_id: created.organization_id,
    policy_number: created.policy_number,
    payer_name: created.payer_name,
    group_number: created.group_number ?? null,
    coverage_start_date: created.coverage_start_date,
    coverage_end_date: created.coverage_end_date ?? null,
    plan_type: created.plan_type,
    policy_status: created.policy_status,
    created_at: created.created_at as string & tags.Format<"date-time">,
    updated_at: created.updated_at as string & tags.Format<"date-time">,
    deleted_at: created.deleted_at ?? null,
  };
}
