import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformComplianceReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformComplianceReview";
import type { IHealthcarePlatformSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformSystemAdmin";

/**
 * Test full System Admin-privileged erasure of a compliance review record,
 * enforcing all audit/soft-delete and privilege rules.
 *
 * 1. Register new system admin using local provider
 * 2. Login system admin and obtain session
 * 3. Create a compliance review record, capturing its ID
 * 4. Erase (DELETE) the record as admin; verify soft-deleted (deleted_at set)
 * 5. Attempt to erase the record again (should error)
 * 6. Attempt to erase a non-existent review (should error)
 * 7. Attempt to erase without login (unauthenticated; should error)
 */
export async function test_api_compliance_review_erasure_by_system_admin(
  connection: api.IConnection,
) {
  // Step 1: Register new system admin
  const joinData = {
    email: typia.random<string & tags.Format<"email">>(),
    full_name: RandomGenerator.name(),
    provider: "local",
    provider_key: RandomGenerator.alphaNumeric(12),
    password: RandomGenerator.alphaNumeric(16),
  } satisfies IHealthcarePlatformSystemAdmin.IJoin;

  const admin = await api.functional.auth.systemAdmin.join(connection, {
    body: joinData,
  });
  typia.assert(admin);

  // Step 2: Login system admin
  const loginResult = await api.functional.auth.systemAdmin.login(connection, {
    body: {
      email: joinData.email,
      provider: "local",
      provider_key: joinData.provider_key,
      password: joinData.password,
    },
  });
  typia.assert(loginResult);

  // Step 3: Create a compliance review
  const reviewCreate = {
    organization_id: typia.random<string & tags.Format<"uuid">>(),
    review_type: RandomGenerator.pick([
      "periodic",
      "incident",
      "external_audit",
      "follow_up",
    ] as const),
    method: RandomGenerator.pick([
      "manual audit",
      "external audit",
      "workflow progress",
      "compliance script",
    ] as const),
    status: RandomGenerator.pick([
      "scheduled",
      "in_progress",
      "completed",
      "rejected",
      "approved",
      "followup_required",
    ] as const),
  } satisfies IHealthcarePlatformComplianceReview.ICreate;
  const review =
    await api.functional.healthcarePlatform.systemAdmin.complianceReviews.create(
      connection,
      { body: reviewCreate },
    );
  typia.assert(review);

  // Step 4: Erase (delete) as admin
  await api.functional.healthcarePlatform.systemAdmin.complianceReviews.erase(
    connection,
    {
      complianceReviewId: review.id,
    },
  );

  // Step 5: Attempt to erase again (should error)
  await TestValidator.error(
    "cannot erase compliance review record already deleted",
    async () => {
      await api.functional.healthcarePlatform.systemAdmin.complianceReviews.erase(
        connection,
        { complianceReviewId: review.id },
      );
    },
  );

  // Step 6: Attempt to erase a non-existent review (random UUID)
  await TestValidator.error(
    "cannot erase non-existent compliance review",
    async () => {
      await api.functional.healthcarePlatform.systemAdmin.complianceReviews.erase(
        connection,
        {
          complianceReviewId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );

  // Step 7: Attempt to erase with unauthenticated connection (should fail)
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "erase should fail for unauthenticated user",
    async () => {
      await api.functional.healthcarePlatform.systemAdmin.complianceReviews.erase(
        unauthConn,
        { complianceReviewId: review.id },
      );
    },
  );
}
