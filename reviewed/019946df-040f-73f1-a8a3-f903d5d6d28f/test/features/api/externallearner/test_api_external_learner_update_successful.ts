import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEnterpriseLmsExternalLearner } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsExternalLearner";

export async function test_api_external_learner_update_successful(
  connection: api.IConnection,
) {
  // 1. Register a new external learner using the join endpoint
  const joinBody = {
    tenant_id: typia.random<string & tags.Format<"uuid">>(),
    email: typia.random<string & tags.Format<"email">>(),
    password_hash: RandomGenerator.alphaNumeric(64),
    first_name: RandomGenerator.name(),
    last_name: RandomGenerator.name(),
    status: "active",
  } satisfies IEnterpriseLmsExternalLearner.IJoin;

  const authorized: IEnterpriseLmsExternalLearner.IAuthorized =
    await api.functional.auth.externalLearner.join.joinExternalLearner(
      connection,
      {
        body: joinBody,
      },
    );
  typia.assert(authorized);

  const externallearnerId = authorized.id;
  const tenantId = authorized.tenant_id;

  // 2. Prepare update data for external learner
  const updateBody = {
    email: typia.random<string & tags.Format<"email">>(),
    first_name: RandomGenerator.name(),
    last_name: RandomGenerator.name(),
    status: "active",
  } satisfies IEnterpriseLmsExternalLearner.IUpdate;

  // 3. Update external learner's profile
  const updated: IEnterpriseLmsExternalLearner =
    await api.functional.enterpriseLms.externalLearner.externallearners.update(
      connection,
      {
        externallearnerId,
        body: updateBody,
      },
    );
  typia.assert(updated);

  // 4. Verify id and tenant_id remain unchanged
  TestValidator.equals(
    "external learner ID should remain unchanged",
    updated.id,
    externallearnerId,
  );
  TestValidator.equals(
    "external learner tenant ID should remain unchanged",
    updated.tenant_id,
    tenantId,
  );
}
