import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEnterpriseLmsExternalLearner } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsExternalLearner";

export async function test_api_externallearner_paymenttransaction_deletion(
  connection: api.IConnection,
) {
  // 1. External learner joins and authenticates
  const joinBody = {
    tenant_id: typia.random<string & tags.Format<"uuid">>(),
    email: `test${RandomGenerator.alphaNumeric(6)}@example.com`,
    password_hash: RandomGenerator.alphaNumeric(16),
    first_name: RandomGenerator.name(1),
    last_name: RandomGenerator.name(1),
    status: "active",
  } satisfies IEnterpriseLmsExternalLearner.IJoin;
  const authorizedLearner =
    await api.functional.auth.externalLearner.join.joinExternalLearner(
      connection,
      { body: joinBody },
    );
  typia.assert(authorizedLearner);

  // 2. Generate a fake external learner payment transaction ID
  const paymentTransactionId = typia.random<string & tags.Format<"uuid">>();
  typia.assert(paymentTransactionId);

  // 3. Delete the payment transaction by this external learner
  await api.functional.enterpriseLms.externalLearner.paymentTransactions.erase(
    connection,
    { id: paymentTransactionId },
  );

  // 4. Test deletion of non-existent payment transaction - expect error
  await TestValidator.error(
    "deleting non-existent payment transaction should fail",
    async () => {
      await api.functional.enterpriseLms.externalLearner.paymentTransactions.erase(
        connection,
        {
          id: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );

  // 5. Another external learner unauthorized to delete this payment transaction
  const otherJoinBody = {
    tenant_id: typia.random<string & tags.Format<"uuid">>(),
    email: `test${RandomGenerator.alphaNumeric(6)}@example.com`,
    password_hash: RandomGenerator.alphaNumeric(16),
    first_name: RandomGenerator.name(1),
    last_name: RandomGenerator.name(1),
    status: "active",
  } satisfies IEnterpriseLmsExternalLearner.IJoin;
  const otherAuthorizedLearner =
    await api.functional.auth.externalLearner.join.joinExternalLearner(
      connection,
      { body: otherJoinBody },
    );
  typia.assert(otherAuthorizedLearner);

  await TestValidator.error(
    "unauthorized external learner cannot delete another's payment transaction",
    async () => {
      await api.functional.enterpriseLms.externalLearner.paymentTransactions.erase(
        connection,
        { id: paymentTransactionId },
      );
    },
  );
}
