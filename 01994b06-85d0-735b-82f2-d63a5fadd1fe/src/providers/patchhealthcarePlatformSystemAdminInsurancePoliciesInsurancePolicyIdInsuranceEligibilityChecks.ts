import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformInsuranceEligibilityCheck } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformInsuranceEligibilityCheck";
import { IPageIHealthcarePlatformInsuranceEligibilityCheck } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHealthcarePlatformInsuranceEligibilityCheck";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * Search and retrieve all insurance eligibility checks for a policy
 * (healthcare_platform_insurance_eligibility_checks).
 *
 * Retrieve a paginated, filtered list of insurance eligibility checks
 * associated with a single insurance policy. This enables billing staff,
 * admins, or authorized users to review all eligibility verification
 * transactions for a patient or payer within a particular policy, supporting
 * regulatory audits and appeals.
 *
 * Results can be filtered by status, performed_by_id, check timestamp range,
 * and payer response details. Pagination and sorting allow practical review of
 * large eligibility check histories. Security enforces that only users with the
 * proper billing, admin, or compliance roles can access the detailed
 * eligibility check data for the given insurance policy.
 *
 * This query joins the insurance policy context for data isolation and
 * compliance enforcement and draws on
 * healthcare_platform_insurance_eligibility_checks (filtered by
 * insurancePolicyId).
 *
 * @param props - Request properties
 * @param props.systemAdmin - The authenticated system admin making the request
 * @param props.insurancePolicyId - Unique identifier of the insurance policy
 *   whose eligibility checks are being searched
 * @param props.body - Search parameters, filters, sort, and pagination criteria
 *   for eligibility checks under the policy
 * @returns Paginated list of eligibility checks matching query and policy
 *   context
 * @throws {Error} When Prisma fails, or if input constraints/securities are
 *   violated
 */
export async function patchhealthcarePlatformSystemAdminInsurancePoliciesInsurancePolicyIdInsuranceEligibilityChecks(props: {
  systemAdmin: SystemadminPayload;
  insurancePolicyId: string & tags.Format<"uuid">;
  body: IHealthcarePlatformInsuranceEligibilityCheck.IRequest;
}): Promise<IPageIHealthcarePlatformInsuranceEligibilityCheck> {
  const { insurancePolicyId, body } = props;
  // Default to page 1 and limit 20 if not specified
  const page = body.page ?? 1;
  const limit = body.limit ?? 20;
  const skip = (page - 1) * limit;

  // Build where clause with only provided filters
  const where = {
    insurance_policy_id: insurancePolicyId,
    ...(body.status !== undefined &&
      body.status !== null && { status: body.status }),
    ...(body.performed_by_id !== undefined &&
      body.performed_by_id !== null && {
        performed_by_id: body.performed_by_id,
      }),
    ...(body.payer_response_code !== undefined &&
      body.payer_response_code !== null && {
        payer_response_code: body.payer_response_code,
      }),
    ...((body.check_timestamp_from !== undefined &&
      body.check_timestamp_from !== null) ||
    (body.check_timestamp_to !== undefined && body.check_timestamp_to !== null)
      ? {
          check_timestamp: {
            ...(body.check_timestamp_from !== undefined &&
              body.check_timestamp_from !== null && {
                gte: body.check_timestamp_from,
              }),
            ...(body.check_timestamp_to !== undefined &&
              body.check_timestamp_to !== null && {
                lte: body.check_timestamp_to,
              }),
          },
        }
      : {}),
  };

  // Fetch paged results and total count
  const [rows, total] = await Promise.all([
    MyGlobal.prisma.healthcare_platform_insurance_eligibility_checks.findMany({
      where,
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
    }),
    MyGlobal.prisma.healthcare_platform_insurance_eligibility_checks.count({
      where,
    }),
  ]);

  // Transform records to strict DTO; convert all date fields to string & tags.Format<'date-time'>
  const data = rows.map((row) => ({
    id: row.id,
    insurance_policy_id: row.insurance_policy_id,
    performed_by_id: row.performed_by_id ?? undefined,
    check_timestamp: toISOStringSafe(row.check_timestamp),
    status: row.status,
    payer_response_code: row.payer_response_code ?? undefined,
    payer_response_description: row.payer_response_description ?? undefined,
    created_at: toISOStringSafe(row.created_at),
    updated_at: toISOStringSafe(row.updated_at),
  }));

  // Prepare pagination info with branding-compatible number stripping
  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: Number(total),
      pages: Math.ceil(Number(total) / Number(limit)),
    },
    data,
  };
}
