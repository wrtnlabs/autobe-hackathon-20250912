import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEnterpriseLmsCorporateLearner } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsCorporateLearner";
import type { IEnterpriseLmsProgressTracking } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsProgressTracking";

/**
 * Test retrieving detailed progress tracking information for a specific
 * learner's content interaction by its unique ID.
 *
 * This test performs the complete authentication flow of a corporate
 * learner, then fetches a progress tracking record detail by its unique ID,
 * validating the response content for correctness and error handling.
 *
 * Steps:
 *
 * 1. Register a new corporate learner account with required tenant
 *    information.
 * 2. Login to obtain JWT authorization.
 * 3. Retrieve a progress tracking record by a valid ID.
 * 4. Validate the returned metrics and data structure.
 * 5. Attempt retrieval with an invalid ID and confirm error is thrown.
 *
 * This ensures that progress tracking retrieval is protected by proper
 * authentication, returns accurate learner progress data, and securely
 * handles invalid queries.
 */
export async function test_api_progress_tracking_retrieve_detail_success(
  connection: api.IConnection,
) {
  // 1. Register a new corporate learner account
  const tenantId = typia.random<string & tags.Format<"uuid">>();
  const email = typia.random<string & tags.Format<"email">>();
  const firstName = RandomGenerator.name(1);
  const lastName = RandomGenerator.name(1);
  const password = "strongPassword123!";

  const joinOutput: IEnterpriseLmsCorporateLearner.IAuthorized =
    await api.functional.auth.corporateLearner.join(connection, {
      body: {
        tenant_id: tenantId,
        email: email,
        password: password,
        first_name: firstName,
        last_name: lastName,
      } satisfies IEnterpriseLmsCorporateLearner.ICreate,
    });
  typia.assert(joinOutput);

  // 2. Login with the new corporate learner account
  const loginOutput: IEnterpriseLmsCorporateLearner.IAuthorized =
    await api.functional.auth.corporateLearner.login(connection, {
      body: {
        email: email,
        password: password,
      } satisfies IEnterpriseLmsCorporateLearner.ILogin,
    });
  typia.assert(loginOutput);

  // 3. Retrieve progress tracking detail by a valid ID
  const validProgressTrackingId = typia.random<string & tags.Format<"uuid">>();
  const progressTracking: IEnterpriseLmsProgressTracking =
    await api.functional.enterpriseLms.corporateLearner.progressTracking.atProgressTracking(
      connection,
      {
        id: validProgressTrackingId,
      },
    );
  typia.assert(progressTracking);

  TestValidator.equals(
    "progress tracking ID matches request",
    progressTracking.id,
    validProgressTrackingId,
  );

  // 4. Validate key metrics presence and types
  TestValidator.predicate(
    "time_spent_seconds is non-negative integer",
    ((): boolean => {
      return (
        Number.isInteger(progressTracking.time_spent_seconds) &&
        progressTracking.time_spent_seconds >= 0
      );
    })(),
  );
  TestValidator.predicate(
    "assessment_attempts is non-negative integer",
    ((): boolean => {
      return (
        Number.isInteger(progressTracking.assessment_attempts) &&
        progressTracking.assessment_attempts >= 0
      );
    })(),
  );
  TestValidator.predicate(
    "engagement_score is a number",
    typeof progressTracking.engagement_score === "number",
  );

  // 5. Test error handling: invalid ID should cause error
  await TestValidator.error(
    "invalid progress tracking ID throws error",
    async () => {
      await api.functional.enterpriseLms.corporateLearner.progressTracking.atProgressTracking(
        connection,
        {
          id: typia.random<string & tags.Format<"uuid">>(), // randomized but invalid ID
        },
      );
    },
  );
}
