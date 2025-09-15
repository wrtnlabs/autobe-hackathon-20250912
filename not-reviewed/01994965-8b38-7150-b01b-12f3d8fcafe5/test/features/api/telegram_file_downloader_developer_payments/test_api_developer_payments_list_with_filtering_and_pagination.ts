import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITelegramFileDownloaderPayment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITelegramFileDownloaderPayment";
import type { IPageITelegramFileDownloaderSubscriptionPlans } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITelegramFileDownloaderSubscriptionPlans";
import type { ITelegramFileDownloaderDeveloper } from "@ORGANIZATION/PROJECT-api/lib/structures/ITelegramFileDownloaderDeveloper";
import type { ITelegramFileDownloaderEndUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITelegramFileDownloaderEndUser";
import type { ITelegramFileDownloaderPayment } from "@ORGANIZATION/PROJECT-api/lib/structures/ITelegramFileDownloaderPayment";
import type { ITelegramFileDownloaderSubscriptionPlans } from "@ORGANIZATION/PROJECT-api/lib/structures/ITelegramFileDownloaderSubscriptionPlans";

export async function test_api_developer_payments_list_with_filtering_and_pagination(
  connection: api.IConnection,
) {
  // 1. Developer registration and authentication
  const developerEmail: string = typia.random<string & tags.Format<"email">>();
  const developer: ITelegramFileDownloaderDeveloper.IAuthorized =
    await api.functional.auth.developer.join(connection, {
      body: {
        email: developerEmail,
        password_hash: RandomGenerator.alphaNumeric(32),
      } satisfies ITelegramFileDownloaderDeveloper.ICreate,
    });
  typia.assert(developer);

  // 2. Retrieve subscription plans
  const subscriptionPlansPage: IPageITelegramFileDownloaderSubscriptionPlans =
    await api.functional.telegramFileDownloader.endUser.subscription.plans.index(
      connection,
      {
        body: {},
      },
    );
  typia.assert(subscriptionPlansPage);
  TestValidator.predicate(
    "subscription plans exist",
    subscriptionPlansPage.data.length > 0,
  );

  // Choose a subscription plan for payment creation
  const subscriptionPlan = RandomGenerator.pick(subscriptionPlansPage.data);

  // 3. Create a payment for the developer
  const paymentCreateRequest = {
    subscription_plan_id: typia.assert<string & tags.Format<"uuid">>(
      subscriptionPlan.id,
    ),
    user_id: typia.assert<string & tags.Format<"uuid">>(developer.id),
    payment_provider: "Stripe",
    payment_status: "succeeded",
    payment_amount: RandomGenerator.pick([1000, 2000, 3000]),
    payment_currency: "USD",
    payment_reference_id: RandomGenerator.alphaNumeric(16),
    payment_date: new Date().toISOString(),
  } satisfies ITelegramFileDownloaderPayment.ICreate;

  const payment: ITelegramFileDownloaderPayment =
    await api.functional.telegramFileDownloader.developer.payments.create(
      connection,
      {
        body: paymentCreateRequest,
      },
    );
  typia.assert(payment);

  // 4. List payments with filtering and pagination - success case
  const paymentsListRequest = {
    subscription_plan_id: payment.subscription_plan_id,
    user_id: payment.user_id,
    payment_provider: payment.payment_provider,
    payment_status: payment.payment_status,
    payment_date_start: new Date(
      new Date(payment.payment_date).getTime() - 1000 * 60 * 60,
    ).toISOString(), // 1 hour before
    payment_date_end: new Date(
      new Date(payment.payment_date).getTime() + 1000 * 60 * 60,
    ).toISOString(), // 1 hour after
    page: 1,
    limit: 10,
  } satisfies ITelegramFileDownloaderPayment.IRequest;

  const paymentsPage: IPageITelegramFileDownloaderPayment =
    await api.functional.telegramFileDownloader.developer.payments.index(
      connection,
      {
        body: paymentsListRequest,
      },
    );
  typia.assert(paymentsPage);

  TestValidator.predicate(
    "payments list is not empty",
    paymentsPage.data.length > 0,
  );

  // Validate all payments in the page match the filter criteria
  paymentsPage.data.forEach((p) => {
    TestValidator.equals(
      "subscription_plan_id matches filter",
      p.subscription_plan_id,
      paymentsListRequest.subscription_plan_id,
    );
    TestValidator.equals(
      "user_id matches filter",
      p.user_id,
      paymentsListRequest.user_id,
    );
    TestValidator.equals(
      "payment_provider matches filter",
      p.payment_provider,
      paymentsListRequest.payment_provider,
    );
    TestValidator.equals(
      "payment_status matches filter",
      p.payment_status,
      paymentsListRequest.payment_status,
    );
    TestValidator.predicate(
      "payment_date in range",
      new Date(p.payment_date).getTime() >=
        new Date(paymentsListRequest.payment_date_start!).getTime() &&
        new Date(p.payment_date).getTime() <=
          new Date(paymentsListRequest.payment_date_end!).getTime(),
    );
  });

  // 5. Test unauthorized access - create an unauthenticated connection
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  await TestValidator.error(
    "unauthorized access to payments list should fail",
    async () => {
      await api.functional.telegramFileDownloader.developer.payments.index(
        unauthenticatedConnection,
        {
          body: {},
        },
      );
    },
  );
}
