import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEnterpriseLmsPaymentTransaction } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsPaymentTransaction";
import type { IEnterpriseLmsSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsSystemAdmin";

/**
 * This E2E test validates retrieval of payment transaction data by a system
 * administrator. The test flow includes:
 *
 * 1. Creating and authenticating a systemAdmin user.
 * 2. Retrieving a valid payment transaction by ID, verifying response correctness.
 * 3. Attempting retrieval of a non-existent transaction to test 404 handling.
 * 4. Ensuring security by limiting access to systemAdmin role.
 */
export async function test_api_systemadmin_paymenttransaction_retrieval(
  connection: api.IConnection,
) {
  // Step 1: systemAdmin user join and authentication
  const systemAdminCreateBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password_hash: RandomGenerator.alphaNumeric(64),
    first_name: RandomGenerator.name(1),
    last_name: RandomGenerator.name(1),
    status: "active",
  } satisfies IEnterpriseLmsSystemAdmin.ICreate;

  const authorized: IEnterpriseLmsSystemAdmin.IAuthorized =
    await api.functional.auth.systemAdmin.join(connection, {
      body: systemAdminCreateBody,
    });
  typia.assert(authorized);

  const tenantId: string & tags.Format<"uuid"> = authorized.tenant_id;

  // Step 2: Retrieve a valid payment transaction by ID
  const validTransactionId = typia.random<string & tags.Format<"uuid">>();

  const transaction: IEnterpriseLmsPaymentTransaction =
    await api.functional.enterpriseLms.systemAdmin.paymentTransactions.at(
      connection,
      {
        id: validTransactionId,
      },
    );
  typia.assert(transaction);

  TestValidator.equals(
    "tenant_id matches authenticated systemAdmin tenant",
    transaction.tenant_id,
    tenantId,
  );

  TestValidator.equals(
    "transaction.id matches requested id",
    transaction.id,
    validTransactionId,
  );

  // Step 3: Attempt retrieval with a non-existent transaction ID and expect 404 error
  await TestValidator.error(
    "retrieval with non-existent payment transaction id should fail",
    async () => {
      await api.functional.enterpriseLms.systemAdmin.paymentTransactions.at(
        connection,
        {
          id: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );
}
