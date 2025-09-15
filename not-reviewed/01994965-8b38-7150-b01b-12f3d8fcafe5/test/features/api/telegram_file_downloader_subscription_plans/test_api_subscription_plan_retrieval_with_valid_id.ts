import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITelegramFileDownloaderEndUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITelegramFileDownloaderEndUser";
import type { ITelegramFileDownloaderSubscriptionPlans } from "@ORGANIZATION/PROJECT-api/lib/structures/ITelegramFileDownloaderSubscriptionPlans";

/**
 * Test retrieval of subscription plan details for an authenticated end
 * user.
 *
 * Scenario steps:
 *
 * 1. Register a new end user with unique email and plaintext password.
 * 2. Login the registered end user and obtain JWT authentication tokens.
 * 3. Retrieve a subscription plan by a valid existing plan ID.
 * 4. Verify the subscription plan properties conform to the business rules:
 *
 *    - Price is a non-negative number
 *    - Max_files_per_day, max_file_size_mb, total_storage_mb are positive
 *         integers
 *    - Status is a non-empty string
 * 5. Attempt retrieving a subscription plan by a non-existent ID; expect a 404
 *    error.
 * 6. Attempt retrieving a subscription plan without authorization; expect a
 *    401 error.
 *
 * All API calls use the SDK with automatic token handling. Responses are
 * validated with typia.assert and business logic assertions with
 * TestValidator.
 */
export async function test_api_subscription_plan_retrieval_with_valid_id(
  connection: api.IConnection,
) {
  // 1. Generate plaintext password for user
  const password = RandomGenerator.alphaNumeric(16);

  // 2. Register new end user
  const createBody = {
    email: `user_${Date.now()}_${RandomGenerator.alphaNumeric(6).toLowerCase()}@example.com`,
    password_hash: password, // assume API hashes internally
  } satisfies ITelegramFileDownloaderEndUser.ICreate;

  const user: ITelegramFileDownloaderEndUser.IAuthorized =
    await api.functional.auth.endUser.join(connection, { body: createBody });
  typia.assert(user);
  TestValidator.predicate(
    "new end user has UUID format id",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      user.id,
    ),
  );

  // 3. Login the user with plaintext password
  const loginBody = {
    email: createBody.email,
    password,
  } satisfies ITelegramFileDownloaderEndUser.ILogin;
  const loginUser: ITelegramFileDownloaderEndUser.IAuthorized =
    await api.functional.auth.endUser.login(connection, { body: loginBody });
  typia.assert(loginUser);
  TestValidator.equals(
    "login user id matches created user id",
    loginUser.id,
    user.id,
  );

  // 4. Retrieve a subscription plan using mocked valid id from simulation
  // Use at.simulate to get simulated plan with valid id
  const simulatedPlan: ITelegramFileDownloaderSubscriptionPlans =
    api.functional.telegramFileDownloader.endUser.subscription.plans.at.simulate(
      connection,
      { id: typia.random<string & tags.Format<"uuid">>() },
    );
  typia.assert(simulatedPlan);

  // Retrieve the plan using the valid simulated id
  const plan: ITelegramFileDownloaderSubscriptionPlans =
    await api.functional.telegramFileDownloader.endUser.subscription.plans.at(
      connection,
      { id: simulatedPlan.id },
    );
  typia.assert(plan);

  // 5. Validate retrieved plan business rules
  TestValidator.predicate(
    "subscription plan price is non-negative",
    plan.price >= 0,
  );
  TestValidator.predicate(
    "subscription plan max_files_per_day is positive integer",
    Number.isInteger(plan.max_files_per_day) && plan.max_files_per_day > 0,
  );
  TestValidator.predicate(
    "subscription plan max_file_size_mb is positive integer",
    Number.isInteger(plan.max_file_size_mb) && plan.max_file_size_mb > 0,
  );
  TestValidator.predicate(
    "subscription plan total_storage_mb is positive integer",
    Number.isInteger(plan.total_storage_mb) && plan.total_storage_mb > 0,
  );
  TestValidator.predicate(
    "subscription plan status is non-empty string",
    typeof plan.status === "string" && plan.status.length > 0,
  );

  // 6. Attempt to retrieve a subscription plan with a non-existent ID - expect error
  await TestValidator.error(
    "retrieving non-existent subscription plan should fail with 404",
    async () => {
      const fakeId = typia.random<string & tags.Format<"uuid">>();
      await api.functional.telegramFileDownloader.endUser.subscription.plans.at(
        connection,
        { id: fakeId },
      );
    },
  );

  // 7. Attempt retrieval without authentication - expect 401
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "retrieving subscription plan without auth should fail with 401",
    async () => {
      await api.functional.telegramFileDownloader.endUser.subscription.plans.at(
        unauthConn,
        { id: simulatedPlan.id },
      );
    },
  );
}
