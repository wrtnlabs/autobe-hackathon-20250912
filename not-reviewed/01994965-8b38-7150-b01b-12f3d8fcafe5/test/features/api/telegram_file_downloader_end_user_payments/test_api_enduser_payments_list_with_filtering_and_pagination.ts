import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITelegramFileDownloaderPayment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITelegramFileDownloaderPayment";
import type { IPageITelegramFileDownloaderSubscriptionPlans } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITelegramFileDownloaderSubscriptionPlans";
import type { ITelegramFileDownloaderEndUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITelegramFileDownloaderEndUser";
import type { ITelegramFileDownloaderPayment } from "@ORGANIZATION/PROJECT-api/lib/structures/ITelegramFileDownloaderPayment";
import type { ITelegramFileDownloaderSubscriptionPlans } from "@ORGANIZATION/PROJECT-api/lib/structures/ITelegramFileDownloaderSubscriptionPlans";

/**
 * Validate end user payments listing with filtering and pagination.
 *
 * This test simulates an end user registration, subscription plan
 * retrieval, payment creation, and various filtered paginated queries to
 * the payments listing endpoint for the Telegram File Downloader
 * application.
 *
 * Stepwise Business process:
 *
 * 1. Register a new end user with a unique email/password.
 * 2. Retrieve subscription plans list and select one valid plan ID.
 * 3. Create a payment record for the registered user and plan.
 * 4. Retrieve payments list filtered by subscription plan and user, validate
 *    inclusion.
 * 5. Perform additional filtered queries (by payment provider, status, and
 *    date range), validating results.
 * 6. Check pagination operation correctness (page, limit, total counts).
 * 7. Test endpoint rejects unauthorized requests appropriately.
 * 8. Test invalid filter parameters result in appropriate errors.
 */
export async function test_api_enduser_payments_list_with_filtering_and_pagination(
  connection: api.IConnection,
) {
  // 1. End user sign-up
  const joinBody = {
    email: RandomGenerator.alphaNumeric(8) + "@example.com",
    password_hash: RandomGenerator.alphaNumeric(16),
  } satisfies ITelegramFileDownloaderEndUser.ICreate;
  const endUser: ITelegramFileDownloaderEndUser.IAuthorized =
    await api.functional.auth.endUser.join(connection, { body: joinBody });
  typia.assert(endUser);

  // 2. Retrieve subscription plans
  const plansRequestBody = {
    page: 1,
    limit: 10,
  } satisfies ITelegramFileDownloaderSubscriptionPlans.IRequest;
  const plansResponse: IPageITelegramFileDownloaderSubscriptionPlans =
    await api.functional.telegramFileDownloader.endUser.subscription.plans.index(
      connection,
      { body: plansRequestBody },
    );
  typia.assert(plansResponse);
  TestValidator.predicate(
    "subscription plans exist",
    plansResponse.data.length > 0,
  );

  // Select a random subscription plan ID for payment creation
  const plan: ITelegramFileDownloaderSubscriptionPlans = RandomGenerator.pick(
    plansResponse.data,
  );
  typia.assert(plan);

  // 3. Create a payment record
  const paymentCreateBody = {
    subscription_plan_id: plan.id,
    user_id: endUser.id,
    payment_provider: "stripe",
    payment_status: "succeeded",
    payment_amount: 4999,
    payment_currency: "USD",
    payment_reference_id: "ref_" + RandomGenerator.alphaNumeric(12),
    payment_date: new Date().toISOString(),
  } satisfies ITelegramFileDownloaderPayment.ICreate;
  const createdPayment: ITelegramFileDownloaderPayment =
    await api.functional.telegramFileDownloader.endUser.payments.create(
      connection,
      { body: paymentCreateBody },
    );
  typia.assert(createdPayment);

  // 4. Payment listing with subscription_plan_id & user_id filter
  const paymentListRequest1 = {
    subscription_plan_id: createdPayment.subscription_plan_id,
    user_id: createdPayment.user_id,
    page: 1,
    limit: 10,
  } satisfies ITelegramFileDownloaderPayment.IRequest;
  const paymentListResponse1: IPageITelegramFileDownloaderPayment =
    await api.functional.telegramFileDownloader.endUser.payments.index(
      connection,
      { body: paymentListRequest1 },
    );
  typia.assert(paymentListResponse1);
  TestValidator.predicate(
    "payments list includes created payment",
    paymentListResponse1.data.some((item) => item.id === createdPayment.id),
  );
  TestValidator.predicate(
    "pagination info valid",
    paymentListResponse1.pagination.current === 1 &&
      paymentListResponse1.pagination.limit === 10,
  );

  // 5. Payment listing filtering by payment_status
  const paymentListRequest2 = {
    payment_status: "succeeded",
    user_id: createdPayment.user_id,
    page: 1,
    limit: 5,
  } satisfies ITelegramFileDownloaderPayment.IRequest;
  const paymentListResponse2: IPageITelegramFileDownloaderPayment =
    await api.functional.telegramFileDownloader.endUser.payments.index(
      connection,
      { body: paymentListRequest2 },
    );
  typia.assert(paymentListResponse2);
  TestValidator.predicate(
    "all payments are succeeded",
    paymentListResponse2.data.every(
      (item) => item.payment_status === "succeeded",
    ),
  );

  // 6. Payment listing filtering by payment_provider and date range
  const startDate = new Date(
    new Date().getTime() - 24 * 60 * 60 * 1000,
  ).toISOString();
  const endDate = new Date(
    new Date().getTime() + 24 * 60 * 60 * 1000,
  ).toISOString();
  const paymentListRequest3 = {
    payment_provider: createdPayment.payment_provider,
    payment_date_start: startDate,
    payment_date_end: endDate,
    page: 1,
    limit: 10,
  } satisfies ITelegramFileDownloaderPayment.IRequest;
  const paymentListResponse3: IPageITelegramFileDownloaderPayment =
    await api.functional.telegramFileDownloader.endUser.payments.index(
      connection,
      { body: paymentListRequest3 },
    );
  typia.assert(paymentListResponse3);
  // Predicate: all returned payment_dates within range
  TestValidator.predicate(
    "all payments in date range",
    paymentListResponse3.data.every(
      (item) => item.payment_date >= startDate && item.payment_date <= endDate,
    ),
  );
  // Predicate: all payments have specified payment_provider
  TestValidator.predicate(
    "all payments have provider",
    paymentListResponse3.data.every(
      (item) => item.payment_provider === createdPayment.payment_provider,
    ),
  );

  // 7. Test pagination boundaries
  const paymentListRequest4 = {
    page: 100,
    limit: 10,
  } satisfies ITelegramFileDownloaderPayment.IRequest;
  const paymentListResponse4: IPageITelegramFileDownloaderPayment =
    await api.functional.telegramFileDownloader.endUser.payments.index(
      connection,
      { body: paymentListRequest4 },
    );
  typia.assert(paymentListResponse4);
  TestValidator.predicate(
    "pagination handles out-of-range page",
    paymentListResponse4.data.length === 0 ||
      paymentListResponse4.pagination.current === 100,
  );

  // 8. Unauthorized access test
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };
  await TestValidator.error("unauthenticated access should fail", async () => {
    await api.functional.telegramFileDownloader.endUser.payments.index(
      unauthenticatedConnection,
      { body: paymentListRequest1 },
    );
  });

  // 9. Invalid filter parameters (e.g. invalid uuid format for subscription_plan_id)
  await TestValidator.error(
    "invalid filter param subscription_plan_id should fail",
    async () => {
      await api.functional.telegramFileDownloader.endUser.payments.index(
        connection,
        {
          body: {
            subscription_plan_id: "invalid-uuid",
          } satisfies ITelegramFileDownloaderPayment.IRequest,
        },
      );
    },
  );
}
