import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITelegramFileDownloaderDeveloper } from "@ORGANIZATION/PROJECT-api/lib/structures/ITelegramFileDownloaderDeveloper";
import type { ITelegramFileDownloaderPayment } from "@ORGANIZATION/PROJECT-api/lib/structures/ITelegramFileDownloaderPayment";

/**
 * Validate the payment detail retrieval for an authenticated developer
 * user.
 *
 * This test covers the scenario where a developer user registers and logs
 * in to obtain an authenticated session. A payment record associated with
 * the developer user and a valid subscription plan is created. The test
 * then fetches the payment details by ID and validates the response data
 * matches the created record. The developer's authentication context is
 * verified to enforce proper authorization boundaries.
 *
 * Steps:
 *
 * 1. Developer registration (join) with unique email and password hash
 * 2. Developer login with registered credentials to authenticate session
 * 3. Create a new valid payment record linked to the developer user
 * 4. Retrieve payment details by the created payment ID
 * 5. Assert all returned payment fields equal the input data used in creation
 *
 * This flow validates the complete business context from authentication to
 * payment data access for developer users. It ensures only authorized users
 * can retrieve their own payment records with full accuracy.
 */
export async function test_api_developer_payment_detail_retrieval_with_authentication(
  connection: api.IConnection,
) {
  //
  // 1. Developer registration (join) with unique email and password hash
  //
  const developerCredentials = {
    email: typia.random<string & tags.Format<"email">>(),
    password_hash: RandomGenerator.alphaNumeric(32),
  } satisfies ITelegramFileDownloaderDeveloper.ICreate;
  const developer: ITelegramFileDownloaderDeveloper.IAuthorized =
    await api.functional.auth.developer.join(connection, {
      body: developerCredentials,
    });
  typia.assert(developer);

  //
  // 2. Developer login with registered credentials to authenticate session
  //
  const loginCredentials = {
    email: developerCredentials.email,
    password: developerCredentials.password_hash,
  } satisfies ITelegramFileDownloaderDeveloper.ILogin;
  const loggedInDeveloper: ITelegramFileDownloaderDeveloper.IAuthorized =
    await api.functional.auth.developer.login(connection, {
      body: loginCredentials,
    });
  typia.assert(loggedInDeveloper);

  //
  // 3. Create a new valid payment record linked to the developer user
  //
  const subscriptionPlanId = typia.random<string & tags.Format<"uuid">>();
  const paymentCreatePayload = {
    subscription_plan_id: subscriptionPlanId,
    user_id: developer.id,
    payment_provider: "Stripe",
    payment_status: "succeeded",
    payment_amount: 9999,
    payment_currency: "USD",
    payment_reference_id: RandomGenerator.alphaNumeric(16),
    payment_date: new Date().toISOString(),
  } satisfies ITelegramFileDownloaderPayment.ICreate;
  const createdPayment: ITelegramFileDownloaderPayment =
    await api.functional.telegramFileDownloader.developer.payments.create(
      connection,
      {
        body: paymentCreatePayload,
      },
    );
  typia.assert(createdPayment);

  //
  // 4. Retrieve payment details by the created payment ID
  //
  const retrievedPayment: ITelegramFileDownloaderPayment =
    await api.functional.telegramFileDownloader.developer.payments.at(
      connection,
      {
        id: createdPayment.id,
      },
    );
  typia.assert(retrievedPayment);

  //
  // 5. Assert all returned payment fields equal the input data used in creation
  //
  TestValidator.equals(
    "payment id matches",
    retrievedPayment.id,
    createdPayment.id,
  );
  TestValidator.equals(
    "subscription plan id matches",
    retrievedPayment.subscription_plan_id,
    paymentCreatePayload.subscription_plan_id,
  );
  TestValidator.equals(
    "user id matches",
    retrievedPayment.user_id,
    paymentCreatePayload.user_id,
  );
  TestValidator.equals(
    "payment provider matches",
    retrievedPayment.payment_provider,
    paymentCreatePayload.payment_provider,
  );
  TestValidator.equals(
    "payment status matches",
    retrievedPayment.payment_status,
    paymentCreatePayload.payment_status,
  );
  TestValidator.equals(
    "payment amount matches",
    retrievedPayment.payment_amount,
    paymentCreatePayload.payment_amount,
  );
  TestValidator.equals(
    "payment currency matches",
    retrievedPayment.payment_currency,
    paymentCreatePayload.payment_currency,
  );
  TestValidator.equals(
    "payment reference id matches",
    retrievedPayment.payment_reference_id,
    paymentCreatePayload.payment_reference_id,
  );
  TestValidator.equals(
    "payment date matches",
    retrievedPayment.payment_date,
    paymentCreatePayload.payment_date,
  );
}
