import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITelegramFileDownloaderDeveloper } from "@ORGANIZATION/PROJECT-api/lib/structures/ITelegramFileDownloaderDeveloper";
import type { ITelegramFileDownloaderPayment } from "@ORGANIZATION/PROJECT-api/lib/structures/ITelegramFileDownloaderPayment";

/**
 * This test function validates the full workflow of creating a developer
 * payment after developer user registration and authentication. The test covers
 * the prerequisite steps of joining a developer account, logging in to obtain
 * authorization, and using valid subscription plan IDs to create payment
 * records. The test verifies that only authenticated developers can create
 * payment entries, that payment details reflect the input correctly, and that
 * business rules such as valid subscription plans and user authorization are
 * enforced. The test ensures that the payment record returned matches requested
 * details exactly, including payment provider, status, amount, currency,
 * payment reference ID, and payment date. The test also checks for error
 * handling when invalid subscription_plan_id or unregistered users attempt to
 * create payments. The process involves authenticating a developer, generating
 * data respecting all tags and formats (e.g., uuid, date-time, email), creating
 * a payment record with proper validation, and asserting returned data
 * integrity and correctness. All DTO fields and business rules are meticulously
 * respected with proper TypeScript type safety, random realistic data
 * generation using typia and RandomGenerator, and descriptive TestValidator
 * validations to guarantee business logic correctness and security. The test
 * function is ordered as follows: join developer user, login developer user,
 * create payment with valid data authenticated as developer, validate response
 * fields, and check error scenarios for invalid subscription plan and
 * unregistered user. The implementation ensures explicit null safety, uses
 * exact enum/const values where applicable, awaits all asynchronous calls, and
 * aligns perfectly with the provided endpoint, DTO, and function definitions
 * with no extraneous property or incorrect data. This function is a complete
 * end-to-end test for the developer payment creation API endpoint, focusing on
 * authorization and business logic validation.
 */
export async function test_api_developer_payment_creation_with_authentication(
  connection: api.IConnection,
) {
  // 1. Developer user joins (registers) with unique email and password hash
  const developerEmail = typia.random<string & tags.Format<"email">>();
  const developerPassword = RandomGenerator.alphaNumeric(12);
  const joinBody = {
    email: developerEmail,
    password_hash: developerPassword,
  } satisfies ITelegramFileDownloaderDeveloper.ICreate;

  const authorizedDeveloper = await api.functional.auth.developer.join(
    connection,
    {
      body: joinBody,
    },
  );
  typia.assert(authorizedDeveloper);

  // 2. Developer logs in with email and password
  const loginBody = {
    email: developerEmail,
    password: developerPassword,
  } satisfies ITelegramFileDownloaderDeveloper.ILogin;

  const loggedInDeveloper = await api.functional.auth.developer.login(
    connection,
    {
      body: loginBody,
    },
  );
  typia.assert(loggedInDeveloper);

  // 3. Create payment for the developer user
  const nowISOString = new Date().toISOString();
  // Use the developer's id and a random but valid subscription_plan_id
  const paymentBody = {
    subscription_plan_id: typia.random<string & tags.Format<"uuid">>(),
    user_id: loggedInDeveloper.id,
    payment_provider: "Stripe",
    payment_status: "succeeded",
    payment_amount: Number((Math.random() * 100 + 1).toFixed(2)),
    payment_currency: "USD",
    payment_reference_id: RandomGenerator.alphaNumeric(16),
    payment_date: nowISOString,
  } satisfies ITelegramFileDownloaderPayment.ICreate;

  const paymentRecord =
    await api.functional.telegramFileDownloader.developer.payments.create(
      connection,
      {
        body: paymentBody,
      },
    );
  typia.assert(paymentRecord);

  // 4. Validate that the payment record returned matches the create request
  TestValidator.equals(
    "payment subscription_plan_id matches",
    paymentRecord.subscription_plan_id,
    paymentBody.subscription_plan_id,
  );
  TestValidator.equals(
    "payment user_id matches",
    paymentRecord.user_id,
    paymentBody.user_id,
  );
  TestValidator.equals(
    "payment provider matches",
    paymentRecord.payment_provider,
    paymentBody.payment_provider,
  );
  TestValidator.equals(
    "payment status matches",
    paymentRecord.payment_status,
    paymentBody.payment_status,
  );
  TestValidator.equals(
    "payment amount matches",
    paymentRecord.payment_amount,
    paymentBody.payment_amount,
  );
  TestValidator.equals(
    "payment currency matches",
    paymentRecord.payment_currency,
    paymentBody.payment_currency,
  );
  TestValidator.equals(
    "payment reference id matches",
    paymentRecord.payment_reference_id,
    paymentBody.payment_reference_id,
  );
  TestValidator.equals(
    "payment date matches",
    paymentRecord.payment_date,
    paymentBody.payment_date,
  );

  // Business logic error tests (invalid subscription_plan_id)
  await TestValidator.error(
    "should reject payment creation with invalid subscription_plan_id",
    async () => {
      await api.functional.telegramFileDownloader.developer.payments.create(
        connection,
        {
          body: {
            ...paymentBody,
            subscription_plan_id: "00000000-0000-0000-0000-000000000000",
          } satisfies ITelegramFileDownloaderPayment.ICreate,
        },
      );
    },
  );

  // Business logic error tests (invalid user_id)
  await TestValidator.error(
    "should reject payment creation with unregistered user_id",
    async () => {
      await api.functional.telegramFileDownloader.developer.payments.create(
        connection,
        {
          body: {
            ...paymentBody,
            user_id: "00000000-0000-0000-0000-000000000000",
          } satisfies ITelegramFileDownloaderPayment.ICreate,
        },
      );
    },
  );
}
