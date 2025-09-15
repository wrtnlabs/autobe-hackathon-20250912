import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformInsuranceEligibilityCheck } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformInsuranceEligibilityCheck";
import { IPageIHealthcarePlatformInsuranceEligibilityCheck } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHealthcarePlatformInsuranceEligibilityCheck";
import { OrganizationadminPayload } from "../decorators/payload/OrganizationadminPayload";

/**
 * Search and retrieve all insurance eligibility checks for a policy
 * (healthcare_platform_insurance_eligibility_checks).
 *
 * This operation retrieves a filtered, paginated list of insurance eligibility
 * checks for a specific insurance policy. It enables authorized staff to search
 * and review eligibility transactions to support compliance, audit, and
 * workflow monitoring.
 *
 * - Only records for the given policy are shown, soft-deleted rows are excluded.
 * - Results may be filtered by status, performed_by_id, check timestamp range,
 *   and payer response details.
 * - Results are paginated and sorted for easy review.
 * - Only organization admins with proper access may use this function.
 *
 * @param props - All properties required for this operation
 * @param props.organizationAdmin - The authenticated organization admin
 *   (OrganizationadminPayload)
 * @param props.insurancePolicyId - The UUID of the insurance policy being
 *   queried
 * @param props.body - Search/filter, sort, and pagination criteria
 * @returns A page of IHealthcarePlatformInsuranceEligibilityCheck records
 *   matching the filter criteria
 * @throws {Error} When invalid parameters are found or database issues occur
 */
export async function patchhealthcarePlatformOrganizationAdminInsurancePoliciesInsurancePolicyIdInsuranceEligibilityChecks(props: {
  organizationAdmin: OrganizationadminPayload;
  insurancePolicyId: string & tags.Format<"uuid">;
  body: IHealthcarePlatformInsuranceEligibilityCheck.IRequest;
}): Promise<IPageIHealthcarePlatformInsuranceEligibilityCheck> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const safePage = typeof page === "number" && page > 0 ? page : 1;
  const safeLimit =
    typeof limit === "number" && limit > 0 && limit <= 100 ? limit : 20;
  const skip = (safePage - 1) * safeLimit;

  const where = {
    insurance_policy_id: props.insurancePolicyId,
    deleted_at: null,
    ...(props.body.status !== undefined &&
      props.body.status !== null && { status: props.body.status }),
    ...(props.body.performed_by_id !== undefined &&
      props.body.performed_by_id !== null && {
        performed_by_id: props.body.performed_by_id,
      }),
    ...(props.body.payer_response_code !== undefined &&
      props.body.payer_response_code !== null && {
        payer_response_code: props.body.payer_response_code,
      }),
    ...((props.body.check_timestamp_from !== undefined &&
      props.body.check_timestamp_from !== null) ||
    (props.body.check_timestamp_to !== undefined &&
      props.body.check_timestamp_to !== null)
      ? {
          check_timestamp: {
            ...(props.body.check_timestamp_from !== undefined &&
              props.body.check_timestamp_from !== null && {
                gte: props.body.check_timestamp_from,
              }),
            ...(props.body.check_timestamp_to !== undefined &&
              props.body.check_timestamp_to !== null && {
                lte: props.body.check_timestamp_to,
              }),
          },
        }
      : {}),
  };

  const [rows, total] = await Promise.all([
    MyGlobal.prisma.healthcare_platform_insurance_eligibility_checks.findMany({
      where,
      orderBy: { created_at: "desc" },
      skip,
      take: safeLimit,
    }),
    MyGlobal.prisma.healthcare_platform_insurance_eligibility_checks.count({
      where,
    }),
  ]);

  return {
    pagination: {
      current: Number(safePage),
      limit: Number(safeLimit),
      records: Number(total),
      pages: Number(Math.ceil(total / safeLimit)),
    },
    data: rows.map((row) => ({
      id: row.id,
      insurance_policy_id: row.insurance_policy_id,
      performed_by_id: row.performed_by_id ?? undefined,
      check_timestamp: toISOStringSafe(row.check_timestamp),
      status: row.status,
      payer_response_code: row.payer_response_code ?? undefined,
      payer_response_description: row.payer_response_description ?? undefined,
      created_at: toISOStringSafe(row.created_at),
      updated_at: toISOStringSafe(row.updated_at),
    })),
  };
}
