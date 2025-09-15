import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformInsuranceEligibilityCheck } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformInsuranceEligibilityCheck";
import { OrganizationadminPayload } from "../decorators/payload/OrganizationadminPayload";

/**
 * Create a new insurance eligibility check entry
 * (healthcare_platform_insurance_eligibility_checks).
 *
 * This endpoint allows an organization admin to record a new eligibility check
 * transaction for a specific insurance policy. It ensures the policy exists and
 * belongs to the admin's organization, prevents duplicate entries (by policy,
 * timestamp, and performer), and persists all audit-critical fields with
 * correct typing and timestamps.
 *
 * Authorization is enforced by cross-checking the admin and policy
 * organization. All created records are returned with strict compliance to the
 * structure, with all date and UUID fields properly formatted.
 *
 * @param props - The request properties for the eligibility check creation
 * @param props.organizationAdmin - The authenticated organization admin making
 *   the request
 * @param props.insurancePolicyId - The insurance policy under which to create
 *   the eligibility check
 * @param props.body - The eligibility check creation data (provider, timestamp,
 *   response, etc.)
 * @returns The stored IHealthcarePlatformInsuranceEligibilityCheck entity with
 *   all required properties
 * @throws {Error} When the insurance policy does not exist, the admin is not
 *   authorized, or the check would be a duplicate
 */
export async function posthealthcarePlatformOrganizationAdminInsurancePoliciesInsurancePolicyIdInsuranceEligibilityChecks(props: {
  organizationAdmin: OrganizationadminPayload;
  insurancePolicyId: string & tags.Format<"uuid">;
  body: IHealthcarePlatformInsuranceEligibilityCheck.ICreate;
}): Promise<IHealthcarePlatformInsuranceEligibilityCheck> {
  const { organizationAdmin, insurancePolicyId, body } = props;

  // Step 1: Validate the insurance policy exists and is active
  const policy =
    await MyGlobal.prisma.healthcare_platform_insurance_policies.findFirst({
      where: {
        id: insurancePolicyId,
        deleted_at: null,
      },
    });
  if (!policy) {
    throw new Error("Insurance policy not found.");
  }

  // Step 2: Authorization - Ensure the admin belongs to the policy organization
  if (policy.organization_id !== organizationAdmin.id) {
    throw new Error(
      "Forbidden: Admin does not have access to this insurance policy.",
    );
  }

  // Step 3: Prevent duplicate eligibility checks (by policy, timestamp, performer)
  const duplicate =
    await MyGlobal.prisma.healthcare_platform_insurance_eligibility_checks.findFirst(
      {
        where: {
          insurance_policy_id: insurancePolicyId,
          check_timestamp: body.check_timestamp,
          performed_by_id: body.performed_by_id ?? undefined,
        },
      },
    );
  if (duplicate) {
    throw new Error("Duplicate eligibility check entry.");
  }

  // Step 4: Prepare data for creation
  const isoNow = toISOStringSafe(new Date());
  const newId = v4();

  // Step 5: Create the eligibility check entry
  const created =
    await MyGlobal.prisma.healthcare_platform_insurance_eligibility_checks.create(
      {
        data: {
          id: newId,
          insurance_policy_id: insurancePolicyId,
          performed_by_id: body.performed_by_id ?? undefined,
          check_timestamp: body.check_timestamp,
          status: body.status,
          payer_response_code: body.payer_response_code ?? undefined,
          payer_response_description:
            body.payer_response_description ?? undefined,
          created_at: isoNow,
          updated_at: isoNow,
        },
      },
    );

  // Step 6: Return the full DTO with correct type branding
  return {
    id: created.id,
    insurance_policy_id: created.insurance_policy_id,
    performed_by_id: created.performed_by_id ?? undefined,
    check_timestamp: created.check_timestamp,
    status: created.status,
    payer_response_code: created.payer_response_code ?? undefined,
    payer_response_description: created.payer_response_description ?? undefined,
    created_at: created.created_at,
    updated_at: created.updated_at,
  };
}
