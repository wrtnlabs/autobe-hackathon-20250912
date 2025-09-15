import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITelegramFileDownloaderEndUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITelegramFileDownloaderEndUser";
import type { ITelegramFileDownloaderPayment } from "@ORGANIZATION/PROJECT-api/lib/structures/ITelegramFileDownloaderPayment";

/**
 * End-to-end test for creating a payment record by an authenticated
 * endUser.
 *
 * This test performs the following sequence:
 *
 * 1. Registers a new endUser with a unique email and password_hash.
 * 2. Logs in as this endUser to obtain authorization context.
 * 3. Creates a payment record associated with the logged-in user with valid
 *    data, including subscription plan id and payment reference id.
 * 4. Validates all API responses with typia.assert and checks field integrity
 *    using TestValidator.
 *
 * No error scenarios or invalid data tests are included.
 */
export async function test_api_enduser_payment_creation_complete_flow(
  connection: api.IConnection,
) {
  // Step 1: Register a new endUser
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password_hash: RandomGenerator.alphaNumeric(16),
  } satisfies ITelegramFileDownloaderEndUser.ICreate;

  const joinedUser = await api.functional.auth.endUser.join(connection, {
    body: joinBody,
  });
  typia.assert(joinedUser);
  TestValidator.predicate(
    "joined user has id",
    typeof joinedUser.id === "string" && joinedUser.id.length > 0,
  );
  TestValidator.equals(
    "joined user email matches",
    joinedUser.email,
    joinBody.email,
  );

  // Step 2: Login with the registered endUser
  const loginBody = {
    email: joinBody.email,
    password: joinBody.password_hash,
  } satisfies ITelegramFileDownloaderEndUser.ILogin;

  const loggedInUser = await api.functional.auth.endUser.login(connection, {
    body: loginBody,
  });
  typia.assert(loggedInUser);
  TestValidator.equals(
    "logged in user email matches",
    loggedInUser.email,
    loginBody.email,
  );
  TestValidator.equals(
    "logged in user id matches joined user",
    loggedInUser.id,
    joinedUser.id,
  );

  // Step 3: Create payment record
  const paymentCreateBody = {
    subscription_plan_id: typia.random<string & tags.Format<"uuid">>(),
    user_id: loggedInUser.id,
    payment_provider: RandomGenerator.alphaNumeric(10),
    payment_status: "succeeded",
    payment_amount: Number((Math.random() * 100 + 1).toFixed(2)),
    payment_currency: "USD",
    payment_reference_id: typia.random<string & tags.Format<"uuid">>(),
    payment_date: new Date().toISOString(),
  } satisfies ITelegramFileDownloaderPayment.ICreate;

  const payment =
    await api.functional.telegramFileDownloader.endUser.payments.create(
      connection,
      {
        body: paymentCreateBody,
      },
    );
  typia.assert(payment);

  TestValidator.equals(
    "payment user_id matches logged in user",
    payment.user_id,
    loggedInUser.id,
  );
  TestValidator.equals(
    "payment subscription_plan_id matches request",
    payment.subscription_plan_id,
    paymentCreateBody.subscription_plan_id,
  );
  TestValidator.equals(
    "payment payment_reference_id matches request",
    payment.payment_reference_id,
    paymentCreateBody.payment_reference_id,
  );
  TestValidator.equals(
    "payment payment_provider matches request",
    payment.payment_provider,
    paymentCreateBody.payment_provider,
  );
  TestValidator.equals(
    "payment payment_status matches request",
    payment.payment_status,
    paymentCreateBody.payment_status,
  );
  TestValidator.equals(
    "payment payment_currency matches request",
    payment.payment_currency,
    paymentCreateBody.payment_currency,
  );
  TestValidator.predicate(
    "payment amount positive",
    payment.payment_amount > 0,
  );
  TestValidator.equals(
    "payment amount matches request",
    payment.payment_amount,
    paymentCreateBody.payment_amount,
  );
  TestValidator.predicate(
    "payment_date is valid ISO string",
    typeof payment.payment_date === "string" && payment.payment_date.length > 0,
  );
}
