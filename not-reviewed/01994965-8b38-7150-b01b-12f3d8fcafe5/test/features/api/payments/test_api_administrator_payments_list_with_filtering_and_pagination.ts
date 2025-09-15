import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITelegramFileDownloaderPayment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITelegramFileDownloaderPayment";
import type { IPageITelegramFileDownloaderSubscriptionPlans } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITelegramFileDownloaderSubscriptionPlans";
import type { ITelegramFileDownloaderAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ITelegramFileDownloaderAdministrator";
import type { ITelegramFileDownloaderEndUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITelegramFileDownloaderEndUser";
import type { ITelegramFileDownloaderPayment } from "@ORGANIZATION/PROJECT-api/lib/structures/ITelegramFileDownloaderPayment";
import type { ITelegramFileDownloaderSubscriptionPlans } from "@ORGANIZATION/PROJECT-api/lib/structures/ITelegramFileDownloaderSubscriptionPlans";

/**
 * This E2E test validates the administrator's capability to list and filter
 * payment records with paging support in the Telegram File Downloader system.
 * It simulates a real usage flow starting from administrator account
 * registration and authentication, acquiring subscription plans, creating an
 * end user subscription payment record, and then exercising payment listing
 * APIs with various filters and paginated requests. It also confirms the
 * payment records comply with the applied filters, the pagination info is
 * correct, and unauthorized access is restricted.
 *
 * The test ensures overall system integration from authentication through
 * payment creation and filtered listing with pagination, reflecting a
 * real-world administrative workflow to manage payment data securely and
 * reliably.
 */
export async function test_api_administrator_payments_list_with_filtering_and_pagination(
  connection: api.IConnection,
) {
  // 1. Administrator user registration
  const adminEmail = RandomGenerator.alphaNumeric(10) + "@admin.test";
  const adminPassword = RandomGenerator.alphaNumeric(16);
  const adminJoinBody = {
    email: adminEmail,
    password_hash: adminPassword,
  } satisfies ITelegramFileDownloaderAdministrator.ICreate;

  const admin: ITelegramFileDownloaderAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(admin);

  // 2. Administrator login
  const adminLoginBody = {
    email: adminEmail,
    password: adminPassword,
  } satisfies ITelegramFileDownloaderAdministrator.ILogin;

  const adminLoggedIn: ITelegramFileDownloaderAdministrator.IAuthorized =
    await api.functional.auth.administrator.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminLoggedIn);

  // 3. End user registration
  const endUserEmail = RandomGenerator.alphaNumeric(10) + "@enduser.test";
  const endUserPassword = RandomGenerator.alphaNumeric(16);
  const endUserJoinBody = {
    email: endUserEmail as string & tags.Format<"email">,
    password_hash: endUserPassword,
  } satisfies ITelegramFileDownloaderEndUser.ICreate;

  const endUser: ITelegramFileDownloaderEndUser.IAuthorized =
    await api.functional.auth.endUser.join(connection, {
      body: endUserJoinBody,
    });
  typia.assert(endUser);

  // 4. End user login
  const endUserLoginBody = {
    email: endUserEmail as string & tags.Format<"email">,
    password: endUserPassword,
  } satisfies ITelegramFileDownloaderEndUser.ILogin;

  const endUserLoggedIn: ITelegramFileDownloaderEndUser.IAuthorized =
    await api.functional.auth.endUser.login(connection, {
      body: endUserLoginBody,
    });
  typia.assert(endUserLoggedIn);

  // 5. Retrieve subscription plans
  const subscriptionPlansRequestBody =
    {} satisfies ITelegramFileDownloaderSubscriptionPlans.IRequest;

  const subscriptionPlansPage: IPageITelegramFileDownloaderSubscriptionPlans =
    await api.functional.telegramFileDownloader.endUser.subscription.plans.index(
      connection,
      {
        body: subscriptionPlansRequestBody,
      },
    );
  typia.assert(subscriptionPlansPage);
  TestValidator.predicate(
    "subscription plans data not empty",
    subscriptionPlansPage.data.length > 0,
  );

  // Pick a valid subscription plan id
  const subscriptionPlan = RandomGenerator.pick(subscriptionPlansPage.data);
  typia.assert(subscriptionPlan);

  // 6. Create a payment record as admin
  const paymentCreateBody = {
    subscription_plan_id: subscriptionPlan.id,
    user_id: endUser.id,
    payment_provider: "stripe",
    payment_status: "succeeded",
    payment_amount: 100.0,
    payment_currency: "USD",
    payment_reference_id: `payref-${RandomGenerator.alphaNumeric(8)}`,
    payment_date: new Date().toISOString(),
  } satisfies ITelegramFileDownloaderPayment.ICreate;

  const payment: ITelegramFileDownloaderPayment =
    await api.functional.telegramFileDownloader.administrator.payments.create(
      connection,
      {
        body: paymentCreateBody,
      },
    );
  typia.assert(payment);

  // 7. List payments with filtering, pagination as admin
  // Define various filter test cases

  // Base filter: user_id
  const baseFilter = {
    user_id: endUser.id,
    page: 1 as number & tags.Type<"int32">,
    limit: 10 as number & tags.Type<"int32">,
  } satisfies ITelegramFileDownloaderPayment.IRequest;

  async function testListFiltered(
    filter: ITelegramFileDownloaderPayment.IRequest,
    expectedPredicate: (item: ITelegramFileDownloaderPayment) => boolean,
  ) {
    const listResponse: IPageITelegramFileDownloaderPayment =
      await api.functional.telegramFileDownloader.administrator.payments.index(
        connection,
        {
          body: filter,
        },
      );
    typia.assert(listResponse);

    // Validate pagination object
    testPagination(listResponse.pagination, filter.page!, filter.limit!);

    // Validate each data item matches expected predicate
    for (const item of listResponse.data) {
      TestValidator.predicate(
        `payment matches filter predicate id=${item.id}`,
        expectedPredicate(item),
      );
    }
  }

  function testPagination(
    pagination: IPage.IPagination,
    expectedPage: number,
    expectedLimit: number,
  ) {
    TestValidator.equals(
      "current page equals expected",
      pagination.current,
      expectedPage,
    );
    TestValidator.equals(
      "limit equals expected",
      pagination.limit,
      expectedLimit,
    );
    TestValidator.predicate(
      "pages count matches records and limit",
      pagination.records <= pagination.limit * pagination.pages &&
        (pagination.pages === 0 ||
          Math.ceil(pagination.records / pagination.limit) ===
            pagination.pages),
    );
  }

  // 7.1 Filter by subscription_plan_id
  await testListFiltered(
    {
      subscription_plan_id: subscriptionPlan.id,
      page: 1 as number & tags.Type<"int32">,
      limit: 10 as number & tags.Type<"int32">,
    },
    (item) => item.subscription_plan_id === subscriptionPlan.id,
  );

  // 7.2 Filter by user_id
  await testListFiltered(baseFilter, (item) => item.user_id === endUser.id);

  // 7.3 Filter by payment_provider
  await testListFiltered(
    {
      payment_provider: "stripe",
      page: 1 as number & tags.Type<"int32">,
      limit: 10 as number & tags.Type<"int32">,
    },
    (item) => item.payment_provider === "stripe",
  );

  // 7.4 Filter by payment_status
  await testListFiltered(
    {
      payment_status: "succeeded",
      page: 1 as number & tags.Type<"int32">,
      limit: 10 as number & tags.Type<"int32">,
    },
    (item) => item.payment_status === "succeeded",
  );

  // 7.5 Filter by payment_date range
  // Define start date as yesterday
  const dayMillis = 24 * 60 * 60 * 1000;
  const paymentDateStart = new Date(Date.now() - dayMillis).toISOString();
  const paymentDateEnd = new Date(Date.now() + dayMillis).toISOString();

  await testListFiltered(
    {
      payment_date_start: paymentDateStart as string & tags.Format<"date-time">,
      payment_date_end: paymentDateEnd as string & tags.Format<"date-time">,
      page: 1 as number & tags.Type<"int32">,
      limit: 10 as number & tags.Type<"int32">,
    },
    (item) =>
      item.payment_date >= paymentDateStart &&
      item.payment_date <= paymentDateEnd,
  );

  // 7.6 Test pagination - request page 1, limit 1 should return at most 1 record
  await testListFiltered(
    {
      page: 1 as number & tags.Type<"int32">,
      limit: 1 as number & tags.Type<"int32">,
    },
    () => true,
  );

  // 8. Attempt to list payments without admin token
  // Use a fresh unauthenticated connection (no token)

  const unauthConn: api.IConnection = { ...connection, headers: {} };

  await TestValidator.error(
    "payment listing without authorization should fail",
    async () => {
      await api.functional.telegramFileDownloader.administrator.payments.index(
        unauthConn,
        {
          body: {
            page: 1 as number & tags.Type<"int32">,
            limit: 10 as number & tags.Type<"int32">,
          },
        },
      );
    },
  );
}
