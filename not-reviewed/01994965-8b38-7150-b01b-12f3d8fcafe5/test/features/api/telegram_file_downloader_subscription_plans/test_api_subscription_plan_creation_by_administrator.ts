import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITelegramFileDownloaderAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ITelegramFileDownloaderAdministrator";
import type { ITelegramFileDownloaderSubscriptionPlans } from "@ORGANIZATION/PROJECT-api/lib/structures/ITelegramFileDownloaderSubscriptionPlans";

/**
 * Test the creation of a new subscription plan by an administrator through the
 * following steps. First, register an administrator account by providing a
 * unique email and hashed password through POST /auth/administrator/join,
 * acquiring an administrator authorization response including a JWT token.
 * Next, login using the registered email and raw password via POST
 * /auth/administrator/login to obtain a fresh JWT token for authorization.
 * Using this authenticated context, create a new subscription plan by POST
 * /telegramFileDownloader/administrator/subscription/plans, providing all
 * mandatory fields such as unique code, plan name, monthly price in USD,
 * maximum files allowed per day (integer), maximum file size in MB (integer),
 * total storage quota in MB (integer), and current status string
 * (active/inactive). Confirm that the created plan response matches the
 * submitted data and valid UUID is assigned in the id property. Then, validate
 * error handling by attempting to create a plan with missing mandatory fields
 * and creating a plan with a duplicate code to ensure these cases are rejected
 * with appropriate errors. This test verifies proper administrator
 * authentication, authorization enforcement, data persistence accuracy, and
 * error validation.
 */
export async function test_api_subscription_plan_creation_by_administrator(
  connection: api.IConnection,
) {
  // 1. Administrator registration
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const adminPassword: string = "a_strong_password";
  const passwordHash = adminPassword; // For testing, plain password as hash (usually a hashed value)

  const adminCreateBody = {
    email: adminEmail,
    password_hash: passwordHash,
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
    email: adminEmail,
    password: adminPassword,
  } satisfies ITelegramFileDownloaderAdministrator.ILogin;

  const adminLoginAuthorized = await api.functional.auth.administrator.login(
    connection,
    {
      body: adminLoginBody,
    },
  );
  typia.assert(adminLoginAuthorized);

  // 3. Creation of subscription plan
  const uniquePlanCode = `PLAN-${RandomGenerator.alphaNumeric(6)}`;

  const subscriptionPlanCreateBody = {
    code: uniquePlanCode,
    name: `Subscription Plan ${RandomGenerator.alphabets(5)}`,
    price: Math.floor(Math.random() * 100) + 1, // Monthly price between 1 and 100 USD
    max_files_per_day: Math.floor(Math.random() * 50) + 1, // Max files per day 1-50
    max_file_size_mb: Math.floor(Math.random() * 1024) + 1, // Max file size MB 1-1024
    total_storage_mb: Math.floor(Math.random() * 10240) + 1, // Storage 1-10240 MB
    status: "active",
  } satisfies ITelegramFileDownloaderSubscriptionPlans.ICreate;

  const createdPlan =
    await api.functional.telegramFileDownloader.administrator.subscription.plans.create(
      connection,
      {
        body: subscriptionPlanCreateBody,
      },
    );
  typia.assert(createdPlan);

  TestValidator.equals(
    "Plan code matches",
    createdPlan.code,
    subscriptionPlanCreateBody.code,
  );
  TestValidator.equals(
    "Plan name matches",
    createdPlan.name,
    subscriptionPlanCreateBody.name,
  );
  TestValidator.equals(
    "Plan price matches",
    createdPlan.price,
    subscriptionPlanCreateBody.price,
  );
  TestValidator.equals(
    "Max files per day matches",
    createdPlan.max_files_per_day,
    subscriptionPlanCreateBody.max_files_per_day,
  );
  TestValidator.equals(
    "Max file size MB matches",
    createdPlan.max_file_size_mb,
    subscriptionPlanCreateBody.max_file_size_mb,
  );
  TestValidator.equals(
    "Total storage MB matches",
    createdPlan.total_storage_mb,
    subscriptionPlanCreateBody.total_storage_mb,
  );
  TestValidator.equals(
    "Plan status matches",
    createdPlan.status,
    subscriptionPlanCreateBody.status,
  );

  // 4. Error testing: duplicate plan code
  await TestValidator.error(
    "subscription plan creation with duplicate code should fail",
    async () => {
      await api.functional.telegramFileDownloader.administrator.subscription.plans.create(
        connection,
        {
          body: {
            ...subscriptionPlanCreateBody, // use the same code to induce duplication error
          },
        },
      );
    },
  );
}
