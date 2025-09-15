import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITelegramFileDownloaderSubscriptionPlans } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITelegramFileDownloaderSubscriptionPlans";
import type { ITelegramFileDownloaderEndUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITelegramFileDownloaderEndUser";
import type { ITelegramFileDownloaderPayment } from "@ORGANIZATION/PROJECT-api/lib/structures/ITelegramFileDownloaderPayment";
import type { ITelegramFileDownloaderSubscriptionPlans } from "@ORGANIZATION/PROJECT-api/lib/structures/ITelegramFileDownloaderSubscriptionPlans";

/**
 * Test for detailed retrieval of a payment by ID for an authenticated end
 * user.
 *
 * The test proceeds as follows:
 *
 * 1. Register and authenticate an end user, capturing their user ID and token.
 * 2. Retrieve subscription plans with filtering for an active plan.
 * 3. Create a new payment record for the user associated with the selected
 *    subscription plan, providing realistic payment data.
 * 4. Retrieve the payment by its ID and validate that all returned fields
 *    match what was created.
 * 5. Attempt to retrieve a payment using a non-existent UUID to verify error
 *    handling.
 * 6. Register and authenticate a second end user.
 * 7. Attempt to retrieve the first user's payment by the second user to test
 *    access control (should result in error).
 */
export async function test_api_enduser_payment_detail_retrieval_by_id(
  connection: api.IConnection,
) {
  // 1. Register and authenticate an end user
  const userEmail1 = typia.random<string & tags.Format<"email">>();
  const user1 = await api.functional.auth.endUser.join(connection, {
    body: {
      email: userEmail1,
      password_hash: RandomGenerator.alphaNumeric(32),
    } satisfies ITelegramFileDownloaderEndUser.ICreate,
  });
  typia.assert(user1);

  // 2. Retrieve subscription plans with active status
  const plansPage =
    await api.functional.telegramFileDownloader.endUser.subscription.plans.index(
      connection,
      {
        body: {
          status: "active",
          page: 1,
          limit: 10,
        } satisfies ITelegramFileDownloaderSubscriptionPlans.IRequest,
      },
    );
  typia.assert(plansPage);
  TestValidator.predicate(
    "plansPage has active plans",
    plansPage.data.length > 0,
  );

  // Select the first active plan
  const plan = plansPage.data[0];

  // 3. Create a payment for user1 linked to the selected plan
  const paymentCreateBody = {
    subscription_plan_id: plan.id,
    user_id: user1.id,
    payment_provider: "Stripe",
    payment_status: "succeeded",
    payment_amount: plan.price,
    payment_currency: "USD",
    payment_reference_id: RandomGenerator.alphaNumeric(16),
    payment_date: new Date().toISOString(),
  } satisfies ITelegramFileDownloaderPayment.ICreate;

  const paymentCreated =
    await api.functional.telegramFileDownloader.endUser.payments.create(
      connection,
      {
        body: paymentCreateBody,
      },
    );
  typia.assert(paymentCreated);

  // 4. Retrieve the payment by ID
  const paymentRetrieved =
    await api.functional.telegramFileDownloader.endUser.payments.at(
      connection,
      {
        id: paymentCreated.id,
      },
    );
  typia.assert(paymentRetrieved);

  // Validate the retrieved payment matches the created payment
  TestValidator.equals(
    "payment id matches",
    paymentRetrieved.id,
    paymentCreated.id,
  );
  TestValidator.equals(
    "subscription_plan_id matches",
    paymentRetrieved.subscription_plan_id,
    plan.id,
  );
  TestValidator.equals("user_id matches", paymentRetrieved.user_id, user1.id);
  TestValidator.equals(
    "payment provider matches",
    paymentRetrieved.payment_provider,
    paymentCreateBody.payment_provider,
  );
  TestValidator.equals(
    "payment status matches",
    paymentRetrieved.payment_status,
    paymentCreateBody.payment_status,
  );
  TestValidator.equals(
    "payment amount matches",
    paymentRetrieved.payment_amount,
    paymentCreateBody.payment_amount,
  );
  TestValidator.equals(
    "payment currency matches",
    paymentRetrieved.payment_currency,
    paymentCreateBody.payment_currency,
  );
  TestValidator.equals(
    "payment reference id matches",
    paymentRetrieved.payment_reference_id,
    paymentCreateBody.payment_reference_id,
  );

  // 5. Attempt to retrieve non-existent payment (expect error)
  await TestValidator.error(
    "non-existent payment retrieval fails",
    async () => {
      await api.functional.telegramFileDownloader.endUser.payments.at(
        connection,
        {
          id: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );

  // 6. Register and authenticate a second user
  const userEmail2 = typia.random<string & tags.Format<"email">>();
  const user2 = await api.functional.auth.endUser.join(connection, {
    body: {
      email: userEmail2,
      password_hash: RandomGenerator.alphaNumeric(32),
    } satisfies ITelegramFileDownloaderEndUser.ICreate,
  });
  typia.assert(user2);

  // Switch authentication context to second user for authorization test
  await api.functional.auth.endUser.join(connection, {
    body: {
      email: userEmail2,
      password_hash: RandomGenerator.alphaNumeric(32),
    } satisfies ITelegramFileDownloaderEndUser.ICreate,
  });

  // 7. Attempt to access first user's payment by second user (expect error)
  await TestValidator.error(
    "unauthorized access to another user's payment fails",
    async () => {
      await api.functional.telegramFileDownloader.endUser.payments.at(
        connection,
        {
          id: paymentCreated.id,
        },
      );
    },
  );
}
