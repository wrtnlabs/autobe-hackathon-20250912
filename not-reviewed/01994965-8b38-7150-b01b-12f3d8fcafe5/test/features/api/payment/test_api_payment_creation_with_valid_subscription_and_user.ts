import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITelegramFileDownloaderAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ITelegramFileDownloaderAdministrator";
import type { ITelegramFileDownloaderAdministrators } from "@ORGANIZATION/PROJECT-api/lib/structures/ITelegramFileDownloaderAdministrators";
import type { ITelegramFileDownloaderPayment } from "@ORGANIZATION/PROJECT-api/lib/structures/ITelegramFileDownloaderPayment";
import type { ITelegramFileDownloaderSubscriptionPlans } from "@ORGANIZATION/PROJECT-api/lib/structures/ITelegramFileDownloaderSubscriptionPlans";

/**
 * End-to-End test for payment creation by administrator with valid
 * subscription plan and user.
 *
 * This test covers:
 *
 * 1. Administrator registration and auth via join API.
 * 2. Administrator user creation.
 * 3. Subscription plan creation with detailed properties.
 * 4. Payment record creation linked to subscription plan and administrator
 *    user.
 *
 * Validates all steps using typia assertions and test validators, ensures
 * type safety, format correctness, and business logic alignment.
 */
export async function test_api_payment_creation_with_valid_subscription_and_user(
  connection: api.IConnection,
) {
  // 1. Administrator registration and authentication
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(16);

  const adminAuthorized: ITelegramFileDownloaderAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: adminEmail,
        password_hash: adminPassword,
      } satisfies ITelegramFileDownloaderAdministrator.ICreate,
    });
  typia.assert(adminAuthorized);

  // 2. Create an administrator user
  const administratorUser: ITelegramFileDownloaderAdministrators =
    await api.functional.telegramFileDownloader.administrator.administrators.create(
      connection,
      {
        body: {
          email: typia.random<string & tags.Format<"email">>(),
          password_hash: RandomGenerator.alphaNumeric(16),
        } satisfies ITelegramFileDownloaderAdministrators.ICreate,
      },
    );
  typia.assert(administratorUser);

  // 3. Create a subscription plan
  const subPlanCode = `plan_${RandomGenerator.alphaNumeric(6)}`;
  const subPlanName = `Subscription ${RandomGenerator.name()}`;

  const subscriptionPlan: ITelegramFileDownloaderSubscriptionPlans =
    await api.functional.telegramFileDownloader.administrator.subscription.plans.create(
      connection,
      {
        body: {
          code: subPlanCode,
          name: subPlanName,
          price: 100, // USD
          max_files_per_day: 1000,
          max_file_size_mb: 500,
          total_storage_mb: 10000,
          status: "active",
        } satisfies ITelegramFileDownloaderSubscriptionPlans.ICreate,
      },
    );
  typia.assert(subscriptionPlan);

  // 4. Create a payment record linked to subscription plan and administrator user
  const paymentReferenceId = `ref_${RandomGenerator.alphaNumeric(12)}`;
  const currentPaymentDateISO = new Date().toISOString();

  const paymentCreated: ITelegramFileDownloaderPayment =
    await api.functional.telegramFileDownloader.administrator.payments.create(
      connection,
      {
        body: {
          subscription_plan_id: subscriptionPlan.id,
          user_id: administratorUser.id,
          payment_provider: "Stripe",
          payment_status: "succeeded",
          payment_amount: subscriptionPlan.price,
          payment_currency: "USD",
          payment_reference_id: paymentReferenceId,
          payment_date: currentPaymentDateISO,
        } satisfies ITelegramFileDownloaderPayment.ICreate,
      },
    );
  typia.assert(paymentCreated);

  // Verify that paymentCreated references correct subscription plan and user ids
  TestValidator.equals(
    "payment subscription_plan_id matches created plan",
    paymentCreated.subscription_plan_id,
    subscriptionPlan.id,
  );
  TestValidator.equals(
    "payment user_id matches created administrator user",
    paymentCreated.user_id,
    administratorUser.id,
  );
  TestValidator.equals(
    "payment reference id matches input",
    paymentCreated.payment_reference_id,
    paymentReferenceId,
  );
}
