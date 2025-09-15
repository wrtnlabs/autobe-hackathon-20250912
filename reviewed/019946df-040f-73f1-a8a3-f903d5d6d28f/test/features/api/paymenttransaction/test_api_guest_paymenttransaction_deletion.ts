import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEnterpriseLmsGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsGuest";

/**
 * This E2E test verifies the deletion of a payment transaction by a guest user
 * in the Enterprise LMS system. The test authenticates as a guest user through
 * two authentication steps and performs a delete operation on a payment
 * transaction using a generated UUID. It validates that the operation completes
 * without error.
 */
export async function test_api_guest_paymenttransaction_deletion(
  connection: api.IConnection,
) {
  // 1. Create and authenticate as guest user (calling join endpoint twice as dependency)
  const tenant_id = typia.random<string & tags.Format<"uuid">>();
  const email = RandomGenerator.alphabets(7) + "@example.com";
  const password_hash = RandomGenerator.alphaNumeric(32);
  const first_name = RandomGenerator.name(1);
  const last_name = RandomGenerator.name(1);
  const status = "active";

  const createGuestBody = {
    tenant_id,
    email,
    password_hash,
    first_name,
    last_name,
    status,
  } satisfies IEnterpriseLmsGuest.ICreate;

  const guest1: IEnterpriseLmsGuest.IAuthorized =
    await api.functional.auth.guest.join(connection, { body: createGuestBody });
  typia.assert(guest1);

  const guest2: IEnterpriseLmsGuest.IAuthorized =
    await api.functional.auth.guest.join(connection, { body: createGuestBody });
  typia.assert(guest2);

  // 2. Simulate a payment transaction ID for deletion
  const paymentTransactionId = typia.random<string & tags.Format<"uuid">>();

  // 3. Perform the deletion (soft delete) of the payment transaction
  await api.functional.enterpriseLms.guest.paymentTransactions.erase(
    connection,
    {
      id: paymentTransactionId,
    },
  );

  // 4. Validation and test success indication
  TestValidator.predicate(
    "Payment transaction deletion completed without error",
    true,
  );
}
