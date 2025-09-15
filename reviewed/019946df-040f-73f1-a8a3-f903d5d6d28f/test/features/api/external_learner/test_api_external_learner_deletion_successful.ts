import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEnterpriseLmsExternalLearner } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsExternalLearner";

export async function test_api_external_learner_deletion_successful(
  connection: api.IConnection,
) {
  // 1. Register a new external learner
  const joinBody = {
    tenant_id: typia.random<string & tags.Format<"uuid">>(),
    email: `testuser+${RandomGenerator.alphaNumeric(6)}@example.com`,
    password_hash: RandomGenerator.alphaNumeric(64),
    first_name: RandomGenerator.name(1),
    last_name: RandomGenerator.name(1),
    status: "active",
  } satisfies IEnterpriseLmsExternalLearner.IJoin;

  const authorized: IEnterpriseLmsExternalLearner.IAuthorized =
    await api.functional.auth.externalLearner.join.joinExternalLearner(
      connection,
      { body: joinBody },
    );
  typia.assert(authorized);

  // 2. Delete the created external learner
  await api.functional.enterpriseLms.externalLearner.externallearners.erase(
    connection,
    { externallearnerId: authorized.id },
  );

  // 3. Verify that deleting again throws an error (already deleted)
  await TestValidator.error(
    "delete already deleted external learner",
    async () => {
      await api.functional.enterpriseLms.externalLearner.externallearners.erase(
        connection,
        { externallearnerId: authorized.id },
      );
    },
  );

  // 4. Verify that deleting a non-existent user throws an error
  await TestValidator.error(
    "delete non-existent external learner",
    async () => {
      await api.functional.enterpriseLms.externalLearner.externallearners.erase(
        connection,
        { externallearnerId: typia.random<string & tags.Format<"uuid">>() },
      );
    },
  );
}
