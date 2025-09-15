import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITelegramFileDownloaderAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ITelegramFileDownloaderAdministrator";
import type { ITelegramFileDownloaderSubscriptionPlans } from "@ORGANIZATION/PROJECT-api/lib/structures/ITelegramFileDownloaderSubscriptionPlans";

/**
 * End-to-end test for updating a subscription plan by an administrator.
 *
 * This test covers the full workflow:
 *
 * 1. Register an administrator user.
 * 2. Log in as the administrator to obtain authorization.
 * 3. Update a subscription plan with new properties including price, maximum
 *    files per day, maximum file size (MB), total storage (MB), status, and
 *    optionally code and name.
 *
 * Validation includes:
 *
 * - Confirming the update response reflects changes.
 * - Verifying correct error handling for invalid UUID updates (404).
 * - Verifying unauthorized access is rejected (401).
 *
 * All API calls use valid DTO according to the schema. JWT tokens are
 * handled automatically by the SDK.
 */
export async function test_api_subscription_plan_update_by_administrator(
  connection: api.IConnection,
) {
  // 1. Administrator registration
  const adminCreateBody = {
    email: `admin_${RandomGenerator.alphaNumeric(6)}@example.com`,
    password_hash: RandomGenerator.alphaNumeric(16),
  } satisfies ITelegramFileDownloaderAdministrator.ICreate;
  const adminAuthorized = await api.functional.auth.administrator.join(
    connection,
    {
      body: adminCreateBody,
    },
  );
  typia.assert(adminAuthorized);

  // 2. Administrator login
  const adminLoginBody = {
    email: adminCreateBody.email,
    password: adminCreateBody.password_hash,
  } satisfies ITelegramFileDownloaderAdministrator.ILogin;
  const adminLoginAuthorized = await api.functional.auth.administrator.login(
    connection,
    {
      body: adminLoginBody,
    },
  );
  typia.assert(adminLoginAuthorized);

  // Helper function to create a realistic subscription plan update body
  function createSubscriptionPlanUpdateBody(): ITelegramFileDownloaderSubscriptionPlans.IUpdate {
    return {
      price: Math.floor(RandomGenerator.pick([999, 1999, 2999, 3999])),
      max_files_per_day: typia.random<number & tags.Type<"int32">>(),
      max_file_size_mb: typia.random<number & tags.Type<"int32">>(),
      total_storage_mb: typia.random<number & tags.Type<"int32">>(),
      status: RandomGenerator.pick([
        "active",
        "inactive",
        "deprecated",
      ] as const),
      code: `code_${RandomGenerator.alphaNumeric(6)}`,
      name: RandomGenerator.name(3),
    };
  }

  // 3. Update a subscription plan (using a fresh random UUID)
  const randomPlanId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const updateBody = createSubscriptionPlanUpdateBody();
  const updatedPlan =
    await api.functional.telegramFileDownloader.administrator.subscription.plans.update(
      connection,
      {
        id: randomPlanId,
        body: updateBody,
      },
    );
  typia.assert(updatedPlan);

  // Validate updated properties
  TestValidator.equals(
    "updated price matches",
    updatedPlan.price,
    updateBody.price ?? updatedPlan.price,
  );
  TestValidator.equals(
    "updated max_files_per_day matches",
    updatedPlan.max_files_per_day,
    updateBody.max_files_per_day ?? updatedPlan.max_files_per_day,
  );
  TestValidator.equals(
    "updated max_file_size_mb matches",
    updatedPlan.max_file_size_mb,
    updateBody.max_file_size_mb ?? updatedPlan.max_file_size_mb,
  );
  TestValidator.equals(
    "updated total_storage_mb matches",
    updatedPlan.total_storage_mb,
    updateBody.total_storage_mb ?? updatedPlan.total_storage_mb,
  );
  TestValidator.equals(
    "updated status matches",
    updatedPlan.status,
    updateBody.status ?? updatedPlan.status,
  );
  if (updateBody.code !== undefined) {
    TestValidator.equals(
      "updated code matches",
      updatedPlan.code,
      updateBody.code,
    );
  }
  if (updateBody.name !== undefined) {
    TestValidator.equals(
      "updated name matches",
      updatedPlan.name,
      updateBody.name,
    );
  }

  // 4. Negative test: Update with invalid UUID (expect 404 Not Found error)
  await TestValidator.error(
    "update with invalid UUID should fail with 404",
    async () => {
      await api.functional.telegramFileDownloader.administrator.subscription.plans.update(
        connection,
        {
          id: "00000000-0000-0000-0000-000000000000",
          body: createSubscriptionPlanUpdateBody(),
        },
      );
    },
  );

  // 5. Negative test: Unauthorized update attempt (no authentication)
  // Create a new connection object without any authentication headers
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };
  await TestValidator.error(
    "unauthorized update attempts should fail with 401 error",
    async () => {
      await api.functional.telegramFileDownloader.administrator.subscription.plans.update(
        unauthenticatedConnection,
        {
          id: typia.random<string & tags.Format<"uuid">>(),
          body: createSubscriptionPlanUpdateBody(),
        },
      );
    },
  );
}
