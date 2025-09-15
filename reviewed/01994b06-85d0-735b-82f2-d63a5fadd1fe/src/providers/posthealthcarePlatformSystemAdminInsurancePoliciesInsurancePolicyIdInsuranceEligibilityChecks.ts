import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformInsuranceEligibilityCheck } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformInsuranceEligibilityCheck";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * Create a new insurance eligibility check entry
 * (healthcare_platform_insurance_eligibility_checks).
 *
 * Creates and logs a new eligibility check transaction for the specified
 * insurance policy, triggered by a system admin. The operation validates that
 * the target insurance policy exists and is active, then records the
 * eligibility check data for audit and compliance purposes. All fields are
 * properly converted and typed as required.
 *
 * @param props - Input containing the authenticated SystemadminPayload
 *   (`systemAdmin`), the target insurance policy id (`insurancePolicyId`), and
 *   the eligibility check creation body (`body`)
 * @returns The newly created eligibility check record, matching
 *   IHealthcarePlatformInsuranceEligibilityCheck
 * @throws Error if the insurance policy does not exist or is inactive
 */
export async function posthealthcarePlatformSystemAdminInsurancePoliciesInsurancePolicyIdInsuranceEligibilityChecks(props: {
  systemAdmin: SystemadminPayload;
  insurancePolicyId: string & tags.Format<"uuid">;
  body: IHealthcarePlatformInsuranceEligibilityCheck.ICreate;
}): Promise<IHealthcarePlatformInsuranceEligibilityCheck> {
  const { systemAdmin, insurancePolicyId, body } = props;

  // Verify that the insurance policy exists and is active
  await MyGlobal.prisma.healthcare_platform_insurance_policies.findFirstOrThrow(
    {
      where: { id: insurancePolicyId, policy_status: "active" },
      select: { id: true },
    },
  );

  // Prepare metadata
  const now = toISOStringSafe(new Date());

  // Insert eligibility check (append-only by design)
  const created =
    await MyGlobal.prisma.healthcare_platform_insurance_eligibility_checks.create(
      {
        data: {
          id: v4(),
          insurance_policy_id: insurancePolicyId,
          performed_by_id:
            body.performed_by_id !== undefined && body.performed_by_id !== null
              ? body.performed_by_id
              : systemAdmin.id,
          check_timestamp: toISOStringSafe(body.check_timestamp),
          status: body.status,
          payer_response_code:
            body.payer_response_code !== undefined
              ? body.payer_response_code
              : null,
          payer_response_description:
            body.payer_response_description !== undefined
              ? body.payer_response_description
              : null,
          created_at: now,
          updated_at: now,
        },
      },
    );

  // Return in API's required DTO structure
  return {
    id: created.id,
    insurance_policy_id: created.insurance_policy_id,
    performed_by_id: created.performed_by_id ?? undefined,
    check_timestamp: toISOStringSafe(created.check_timestamp),
    status: created.status,
    payer_response_code: created.payer_response_code ?? undefined,
    payer_response_description: created.payer_response_description ?? undefined,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
  };
}
