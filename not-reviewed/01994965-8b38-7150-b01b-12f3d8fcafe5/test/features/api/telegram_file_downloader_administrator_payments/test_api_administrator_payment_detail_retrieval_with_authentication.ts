import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITelegramFileDownloaderAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ITelegramFileDownloaderAdministrator";
import type { ITelegramFileDownloaderPayment } from "@ORGANIZATION/PROJECT-api/lib/structures/ITelegramFileDownloaderPayment";

/**
 * Validate the administrator's payment detail retrieval with proper
 * authentication.
 *
 * This test ensures that only authenticated administrators can access detailed
 * payment records. It starts with administrator account registration and login
 * to obtain authorization tokens. Then, using a valid payment ID, it retrieves
 * the payment details and validates critical properties such as IDs, dates,
 * amounts, status, currency conformity, and ensures all properties conform to
 * the defined schema. All API responses are strictly validated with
 * typia.assert to verify type safety and format correctness.
 */
export async function test_api_administrator_payment_detail_retrieval_with_authentication(
  connection: api.IConnection,
) {
  // 1. Administrator Registration
  const administratorEmail: string = typia.random<
    string & tags.Format<"email">
  >();
  const passwordRaw: string = RandomGenerator.alphaNumeric(12);
  const administratorCreationData = {
    email: administratorEmail,
    password_hash: passwordRaw,
  } satisfies ITelegramFileDownloaderAdministrator.ICreate;

  const administrator: ITelegramFileDownloaderAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: administratorCreationData,
    });
  typia.assert(administrator);

  // 2. Administrator Login
  const administratorLoginData = {
    email: administratorEmail,
    password: passwordRaw,
  } satisfies ITelegramFileDownloaderAdministrator.ILogin;

  const loginResult: ITelegramFileDownloaderAdministrator.IAuthorized =
    await api.functional.auth.administrator.login(connection, {
      body: administratorLoginData,
    });
  typia.assert(loginResult);

  // 3. Retrieve existing payment information - simulate a valid UUID
  const paymentId: string = typia.random<string & tags.Format<"uuid">>();

  // 4. Retrieve detailed payment info by ID
  const paymentDetail: ITelegramFileDownloaderPayment =
    await api.functional.telegramFileDownloader.administrator.payments.at(
      connection,
      { id: paymentId },
    );
  typia.assert(paymentDetail);

  // 5. Validate critical payment record fields
  TestValidator.predicate(
    "payment id is UUID format",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      paymentDetail.id,
    ),
  );
  TestValidator.predicate(
    "subscription_plan_id is UUID format",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      paymentDetail.subscription_plan_id,
    ),
  );
  TestValidator.predicate(
    "user_id is UUID format",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      paymentDetail.user_id,
    ),
  );
  TestValidator.predicate(
    "payment date is ISO 8601",
    typeof paymentDetail.payment_date === "string" &&
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(
        paymentDetail.payment_date,
      ),
  );
  TestValidator.predicate(
    "created_at is ISO 8601",
    typeof paymentDetail.created_at === "string" &&
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(
        paymentDetail.created_at,
      ),
  );
  TestValidator.predicate(
    "updated_at is ISO 8601",
    typeof paymentDetail.updated_at === "string" &&
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(
        paymentDetail.updated_at,
      ),
  );
  TestValidator.predicate(
    "deleted_at is null or ISO 8601",
    paymentDetail.deleted_at === null ||
      (typeof paymentDetail.deleted_at === "string" &&
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(
          paymentDetail.deleted_at,
        )),
  );
  TestValidator.predicate(
    "payment amount is non-negative number",
    typeof paymentDetail.payment_amount === "number" &&
      paymentDetail.payment_amount >= 0,
  );
  TestValidator.equals(
    "payment_provider is non-empty string",
    typeof paymentDetail.payment_provider === "string" &&
      paymentDetail.payment_provider.length > 0,
    true,
  );
  TestValidator.equals(
    "payment_status is non-empty string",
    typeof paymentDetail.payment_status === "string" &&
      paymentDetail.payment_status.length > 0,
    true,
  );
  TestValidator.equals(
    "payment_currency should be USD",
    paymentDetail.payment_currency,
    "USD",
  );
  TestValidator.equals(
    "payment_reference_id is non-empty string",
    typeof paymentDetail.payment_reference_id === "string" &&
      paymentDetail.payment_reference_id.length > 0,
    true,
  );
}
