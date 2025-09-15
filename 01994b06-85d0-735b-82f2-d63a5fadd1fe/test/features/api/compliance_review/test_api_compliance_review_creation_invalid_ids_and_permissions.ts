import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformComplianceReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformComplianceReview";
import type { IHealthcarePlatformSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformSystemAdmin";

/**
 * Tests invalid creation of compliance review referencing non-existent
 * dependency IDs and permission scenarios.
 *
 * Steps:
 *
 * 1. Register a system administrator for permission tests.
 * 2. Attempt compliance review creation with non-existent (random) hold_id.
 * 3. Attempt with non-existent risk_assessment_id.
 * 4. Attempt with non-existent reviewer_id.
 * 5. Attempt creation without being authenticated (should fail).
 * 6. Attempt creation with missing required fields (should fail), using an
 *    authenticated admin for permission.
 * 7. (Control check) Valid creation with all required fields for completeness.
 */
export async function test_api_compliance_review_creation_invalid_ids_and_permissions(
  connection: api.IConnection,
) {
  // Step 1: Register as a system admin for permissioned operations
  const adminJoin = {
    email: typia.random<string & tags.Format<"email">>(),
    full_name: RandomGenerator.name(),
    provider: "local",
    provider_key: RandomGenerator.alphaNumeric(10),
    password: RandomGenerator.alphaNumeric(12),
    phone: RandomGenerator.mobile(),
  } satisfies IHealthcarePlatformSystemAdmin.IJoin;

  const admin: IHealthcarePlatformSystemAdmin.IAuthorized =
    await api.functional.auth.systemAdmin.join(connection, { body: adminJoin });
  typia.assert(admin);

  // Step 2: Attempt creating review with fake/non-existent hold_id
  const reviewBody_invalidHold = {
    organization_id: typia.random<string & tags.Format<"uuid">>(),
    hold_id: typia.random<string & tags.Format<"uuid">>(),
    review_type: RandomGenerator.pick([
      "periodic",
      "incident",
      "external_audit",
      "follow_up",
    ] as const),
    method: RandomGenerator.pick([
      "manual audit",
      "external audit",
      "compliance script",
    ] as const),
    status: RandomGenerator.pick([
      "scheduled",
      "in_progress",
      "completed",
      "approved",
    ] as const),
  } satisfies IHealthcarePlatformComplianceReview.ICreate;
  await TestValidator.error("rejects non-existent hold_id", async () => {
    await api.functional.healthcarePlatform.systemAdmin.complianceReviews.create(
      connection,
      { body: reviewBody_invalidHold },
    );
  });

  // Step 3: Attempt creating review with non-existent risk_assessment_id
  const reviewBody_invalidRisk = {
    ...reviewBody_invalidHold,
    hold_id: undefined,
    risk_assessment_id: typia.random<string & tags.Format<"uuid">>(),
  } satisfies IHealthcarePlatformComplianceReview.ICreate;
  await TestValidator.error(
    "rejects non-existent risk_assessment_id",
    async () => {
      await api.functional.healthcarePlatform.systemAdmin.complianceReviews.create(
        connection,
        { body: reviewBody_invalidRisk },
      );
    },
  );

  // Step 4: Attempt with non-existent reviewer_id
  const reviewBody_invalidReviewer = {
    organization_id: typia.random<string & tags.Format<"uuid">>(),
    reviewer_id: typia.random<string & tags.Format<"uuid">>(),
    review_type: "incident",
    method: "manual audit",
    status: "scheduled",
  } satisfies IHealthcarePlatformComplianceReview.ICreate;
  await TestValidator.error("rejects non-existent reviewer_id", async () => {
    await api.functional.healthcarePlatform.systemAdmin.complianceReviews.create(
      connection,
      { body: reviewBody_invalidReviewer },
    );
  });

  // Step 5: Attempt to create compliance review as unauthenticated user (no token)
  const unauthConnection: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "rejects unauthenticated user compliance review creation",
    async () => {
      await api.functional.healthcarePlatform.systemAdmin.complianceReviews.create(
        unauthConnection,
        {
          body: reviewBody_invalidHold,
        },
      );
    },
  );

  // Step 6: Attempt with missing required field (simulate with empty string for organization_id)
  const reviewBody_missingFields = {
    organization_id: "",
    review_type: "",
    method: "manual audit",
    status: "scheduled",
  } satisfies IHealthcarePlatformComplianceReview.ICreate;
  await TestValidator.error(
    "rejects missing required fields (empty organization_id/review_type)",
    async () => {
      await api.functional.healthcarePlatform.systemAdmin.complianceReviews.create(
        connection,
        { body: reviewBody_missingFields },
      );
    },
  );

  // Step 7: Valid creation control check
  const reviewBody_valid = {
    organization_id: typia.random<string & tags.Format<"uuid">>(),
    review_type: "periodic",
    method: "manual audit",
    status: "scheduled",
  } satisfies IHealthcarePlatformComplianceReview.ICreate;
  const created =
    await api.functional.healthcarePlatform.systemAdmin.complianceReviews.create(
      connection,
      { body: reviewBody_valid },
    );
  typia.assert(created);
}
