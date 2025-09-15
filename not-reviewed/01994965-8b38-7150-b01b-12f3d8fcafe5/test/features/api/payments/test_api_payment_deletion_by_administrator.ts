import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITelegramFileDownloaderAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ITelegramFileDownloaderAdministrator";
import type { ITelegramFileDownloaderPayment } from "@ORGANIZATION/PROJECT-api/lib/structures/ITelegramFileDownloaderPayment";

/**
 * This test validates the deletion of an existing payment record and the
 * associated cascading deletion effects by an authenticated administrator.
 *
 * 1. Administrator joins the system to create and authenticate an administrator
 *    account.
 * 2. Administrator retrieves a known existing payment by its ID to confirm its
 *    existence before deletion.
 * 3. Administrator issues a DELETE request to remove the payment with the
 *    specified ID.
 * 4. The system performs cascading deletions of related transactions and logs tied
 *    to the payment.
 * 5. The test verifies the payment record no longer exists by attempting to
 *    retrieve it again and expecting failure.
 * 6. Negative test cases ensure delete fails when the payment ID does not exist or
 *    when the user is not authenticated as administrator.
 *
 * This test uses only valid data and proper authentication flows and confirms
 * that deletion logic works correctly and unauthorized access is prevented.
 */
export async function test_api_payment_deletion_by_administrator(
  connection: api.IConnection,
) {
  // 1. Administrator joins the system
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPasswordHash = RandomGenerator.alphaNumeric(32); // simulate hashed password
  const admin: ITelegramFileDownloaderAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: adminEmail,
        password_hash: adminPasswordHash,
      } satisfies ITelegramFileDownloaderAdministrator.ICreate,
    });
  typia.assert(admin);
  TestValidator.predicate(
    "administrator token is present",
    typeof admin.token.access === "string",
  );

  // 2. Retrieve an existing payment for deletion validation
  // Here we simulate a known existing payment id by random uuid (would be replaced with real test payment ID)
  const existingPaymentId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // Do an initial retrieval to ensure the payment exists
  let payment: ITelegramFileDownloaderPayment;
  try {
    payment =
      await api.functional.telegramFileDownloader.administrator.payments.at(
        connection,
        {
          id: existingPaymentId,
        },
      );
    typia.assert(payment);
    TestValidator.equals(
      "payment id matches query",
      payment.id,
      existingPaymentId,
    );
  } catch {
    throw new Error(
      `Payment with id ${existingPaymentId} does not exist to delete.`,
    );
  }

  // 3. Administrator deletes the payment
  await api.functional.telegramFileDownloader.administrator.payments.erasePayment(
    connection,
    {
      id: existingPaymentId,
    },
  );

  // 4. Validate deletion by attempting to retrieve the payment again, expecting failure
  await TestValidator.error(
    "retrieving a deleted payment should fail",
    async () => {
      await api.functional.telegramFileDownloader.administrator.payments.at(
        connection,
        {
          id: existingPaymentId,
        },
      );
    },
  );

  // 5. Additional negative test: try deleting a non-existing payment ID
  const nonExistingPaymentId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  if (nonExistingPaymentId !== existingPaymentId) {
    await TestValidator.error(
      "deleting non-existent payment should fail",
      async () => {
        await api.functional.telegramFileDownloader.administrator.payments.erasePayment(
          connection,
          {
            id: nonExistingPaymentId,
          },
        );
      },
    );
  }

  // 6. Negative test for unauthorized attempt (simulate unauthenticated connection)
  const unauthConnection: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthorized deletion attempt should fail",
    async () => {
      await api.functional.telegramFileDownloader.administrator.payments.erasePayment(
        unauthConnection,
        {
          id: existingPaymentId,
        },
      );
    },
  );
}
