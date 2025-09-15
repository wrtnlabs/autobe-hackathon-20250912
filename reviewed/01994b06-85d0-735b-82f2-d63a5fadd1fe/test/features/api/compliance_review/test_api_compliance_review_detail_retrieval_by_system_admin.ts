import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformComplianceReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformComplianceReview";
import type { IHealthcarePlatformSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformSystemAdmin";

/**
 * Validates that a system administrator can retrieve the full details for a
 * specific compliance review by ID, confirming correct RBAC, data isolation,
 * and return structure.
 *
 * Steps:
 *
 * 1. Register and authenticate a new system admin using the join flow with all
 *    required business fields.
 * 2. Assume a compliance review exists; create a candidate review ID using random
 *    UUID.
 * 3. Attempt to retrieve the compliance review using the GET endpoint as system
 *    admin and validate all fields and type.
 * 4. Attempt to retrieve a non-existent review, expect error and ensure no data is
 *    leaked.
 * 5. Confirm the returned review (if any) matches the requested ID.
 *
 * Error handling: checks that clear error is thrown for non-existent reviews,
 * and only system admin RBAC is exercised due to available auth APIs.
 */
export async function test_api_compliance_review_detail_retrieval_by_system_admin(
  connection: api.IConnection,
) {
  // 1. Register and authenticate as system admin
  const adminJoinInput = {
    email: `admin+${RandomGenerator.alphaNumeric(8)}@enterprise-corp.com`,
    full_name: RandomGenerator.name(),
    provider: "local",
    provider_key: RandomGenerator.alphaNumeric(12),
    password: "SuperSecure!2024",
  } satisfies IHealthcarePlatformSystemAdmin.IJoin;
  const admin = await api.functional.auth.systemAdmin.join(connection, {
    body: adminJoinInput,
  });
  typia.assert(admin);

  // 2. Assume an existing compliance review by generating a UUID (no create API available)
  const complianceReviewId = typia.random<string & tags.Format<"uuid">>();

  // 3. Retrieve compliance review as system admin
  const review =
    await api.functional.healthcarePlatform.systemAdmin.complianceReviews.at(
      connection,
      { complianceReviewId },
    );
  typia.assert<IHealthcarePlatformComplianceReview>(review);

  // 4. Attempt to retrieve non-existent review - expect error
  const nonExistentReviewId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "accessing non-existent compliance review throws error",
    async () => {
      await api.functional.healthcarePlatform.systemAdmin.complianceReviews.at(
        connection,
        { complianceReviewId: nonExistentReviewId },
      );
    },
  );

  // 5. Confirm review.id matches the requested ID
  TestValidator.equals(
    "review id returned matches requested id",
    review.id,
    complianceReviewId,
  );
}
