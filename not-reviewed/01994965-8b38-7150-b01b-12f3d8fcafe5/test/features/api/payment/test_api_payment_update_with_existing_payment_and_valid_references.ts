import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITelegramFileDownloaderAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ITelegramFileDownloaderAdministrator";
import type { ITelegramFileDownloaderPayment } from "@ORGANIZATION/PROJECT-api/lib/structures/ITelegramFileDownloaderPayment";
import type { ITelegramFileDownloaderPayments } from "@ORGANIZATION/PROJECT-api/lib/structures/ITelegramFileDownloaderPayments";
import type { ITelegramFileDownloaderSubscriptionPlans } from "@ORGANIZATION/PROJECT-api/lib/structures/ITelegramFileDownloaderSubscriptionPlans";

/**
 * End-to-end test validating administrator payment update scenario.
 *
 * This test covers full workflow from admin join, subscription plan
 * creation, followed by updating an existing payment record by providing
 * valid references.
 *
 * It ensures proper authorization, valid reference handling, and successful
 * persistence of updated payment details.
 */
export async function test_api_payment_update_with_existing_payment_and_valid_references(
  connection: api.IConnection,
) {
  // 1. Administrator joins to create an admin user and obtain authentication
  // context.
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const passwordHash = "P@ssw0rd!"; // In real test, should be hashed but plain string used.
  const administrator: ITelegramFileDownloaderAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: adminEmail,
        password_hash: passwordHash,
      },
    });
  typia.assert(administrator);

  // 2. Create a subscription plan to use in the payment update
  const subscriptionPlanCreateBody = {
    code: RandomGenerator.alphaNumeric(8).toUpperCase(),
    name: RandomGenerator.name(3),
    price: 299.99,
    max_files_per_day: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<1>
    >(),
    max_file_size_mb: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<10>
    >(),
    total_storage_mb: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<100>
    >(),
    status: "active",
  } satisfies ITelegramFileDownloaderSubscriptionPlans.ICreate;

  const subscriptionPlan: ITelegramFileDownloaderSubscriptionPlans =
    await api.functional.telegramFileDownloader.administrator.subscription.plans.create(
      connection,
      {
        body: subscriptionPlanCreateBody,
      },
    );
  typia.assert(subscriptionPlan);

  // 3. Generate random valid UUIDs for payment id and user id
  const paymentId: string = typia.random<string & tags.Format<"uuid">>();
  const userId: string = typia.random<string & tags.Format<"uuid">>();

  // 4. Compose a valid update payload, changing several fields including
  // subscription_plan_id, user_id, payment provider, status, amount, currency, reference id, date
  const updatedPaymentBody = {
    subscription_plan_id: subscriptionPlan.id,
    user_id: userId,
    payment_provider: "Stripe",
    payment_status: "succeeded",
    payment_amount: 499.99,
    payment_currency: "USD",
    payment_reference_id: RandomGenerator.alphaNumeric(12).toUpperCase(),
    payment_date: new Date().toISOString(),
  } satisfies ITelegramFileDownloaderPayments.IUpdate;

  // 5. Perform the update API call with payment id and update body
  const updatedPayment: ITelegramFileDownloaderPayments =
    await api.functional.telegramFileDownloader.administrator.payments.updatePayment(
      connection,
      {
        id: paymentId,
        body: updatedPaymentBody,
      },
    );
  typia.assert(updatedPayment);

  // 6. Verify updated fields match the update payload
  TestValidator.equals(
    "subscription_plan_id matches",
    updatedPayment.subscription_plan_id,
    updatedPaymentBody.subscription_plan_id,
  );
  TestValidator.equals(
    "user_id matches",
    updatedPayment.user_id,
    updatedPaymentBody.user_id,
  );
  TestValidator.equals(
    "payment_provider matches",
    updatedPayment.payment_provider,
    updatedPaymentBody.payment_provider,
  );
  TestValidator.equals(
    "payment_status matches",
    updatedPayment.payment_status,
    updatedPaymentBody.payment_status,
  );
  TestValidator.equals(
    "payment_amount matches",
    updatedPayment.payment_amount,
    updatedPaymentBody.payment_amount,
  );
  TestValidator.equals(
    "payment_currency matches",
    updatedPayment.payment_currency,
    updatedPaymentBody.payment_currency,
  );
  TestValidator.equals(
    "payment_reference_id matches",
    updatedPayment.payment_reference_id,
    updatedPaymentBody.payment_reference_id,
  );
  TestValidator.equals(
    "payment_date matches",
    updatedPayment.payment_date,
    updatedPaymentBody.payment_date,
  );
  // Skips verify created_at, updated_at, deleted_at because they are managed automatically
}
