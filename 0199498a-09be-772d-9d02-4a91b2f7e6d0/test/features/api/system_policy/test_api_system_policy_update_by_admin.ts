import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IStoryfieldAiSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IStoryfieldAiSystemAdmin";
import type { IStoryfieldAiSystemPolicy } from "@ORGANIZATION/PROJECT-api/lib/structures/IStoryfieldAiSystemPolicy";

/**
 * E2E test: update system policy as admin
 *
 * 1. Register and authenticate a new system admin (receiving a fresh JWT session).
 * 2. Create a new system policy as this admin, saving the result and its id for
 *    subsequent update.
 * 3. Update the policy (change updatable fields: name, description, value, type,
 *    active). Validate changes are applied: fetch result matches new values,
 *    timestamps updated.
 * 4. Edge: Attempt to update a deleted/non-existent policy (should result in
 *    error).
 * 5. Edge: Attempt to update policy as non-admin user (should be denied).
 * 6. Business: Policy_code remains globally unique and unchanged.
 */
export async function test_api_system_policy_update_by_admin(
  connection: api.IConnection,
) {
  // 1. Register/authenticate as system admin
  const joinInput = {
    external_admin_id: RandomGenerator.alphaNumeric(16),
    email: `${RandomGenerator.alphaNumeric(10)}@admin.test.com`,
    actor_type: "systemAdmin" as const,
  } satisfies IStoryfieldAiSystemAdmin.IJoin;
  const admin: IStoryfieldAiSystemAdmin.IAuthorized =
    await api.functional.auth.systemAdmin.join(connection, { body: joinInput });
  typia.assert(admin);

  // 2. Create a system policy as admin
  const createInput = {
    policy_code: RandomGenerator.alphaNumeric(16),
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    value: RandomGenerator.alphaNumeric(12),
    type: RandomGenerator.pick([
      "boolean",
      "int",
      "duration",
      "string",
      "json",
    ] as const),
    active: true,
  } satisfies IStoryfieldAiSystemPolicy.ICreate;
  const policy: IStoryfieldAiSystemPolicy =
    await api.functional.storyfieldAi.systemAdmin.systemPolicies.create(
      connection,
      { body: createInput },
    );
  typia.assert(policy);
  TestValidator.equals(
    "created policy matches input name",
    policy.name,
    createInput.name,
  );
  TestValidator.equals(
    "created policy matches input code",
    policy.policy_code,
    createInput.policy_code,
  );

  // 3. Update this policy: change all updatable fields
  const updateInput = {
    name: RandomGenerator.paragraph({ sentences: 1 }),
    description: RandomGenerator.content({ paragraphs: 1 }),
    value: RandomGenerator.alphaNumeric(20),
    type: RandomGenerator.pick([
      "boolean",
      "int",
      "duration",
      "string",
      "json",
    ] as const),
    active: false,
  } satisfies IStoryfieldAiSystemPolicy.IUpdate;
  const updated: IStoryfieldAiSystemPolicy =
    await api.functional.storyfieldAi.systemAdmin.systemPolicies.update(
      connection,
      { policyId: policy.id, body: updateInput },
    );
  typia.assert(updated);
  TestValidator.equals(
    "policy update: name changed",
    updated.name,
    updateInput.name,
  );
  TestValidator.equals(
    "policy update: description changed",
    updated.description,
    updateInput.description,
  );
  TestValidator.equals(
    "policy update: value changed",
    updated.value,
    updateInput.value,
  );
  TestValidator.equals(
    "policy update: type changed",
    updated.type,
    updateInput.type,
  );
  TestValidator.equals(
    "policy update: active changed",
    updated.active,
    updateInput.active,
  );
  TestValidator.equals(
    "policy_code remains unchanged",
    updated.policy_code,
    policy.policy_code,
  );
  TestValidator.notEquals(
    "updated_at has changed",
    updated.updated_at,
    policy.updated_at,
  );

  // 4. Edge: Update non-existent policy
  await TestValidator.error(
    "update non-existent policy should fail",
    async () => {
      await api.functional.storyfieldAi.systemAdmin.systemPolicies.update(
        connection,
        {
          policyId: typia.random<string & tags.Format<"uuid">>(),
          body: updateInput,
        },
      );
    },
  );

  // 5. Edge: Update as non-admin -- simulate by creating a fresh connection with empty headers
  const noAuthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error("update policy as non-admin denied", async () => {
    await api.functional.storyfieldAi.systemAdmin.systemPolicies.update(
      noAuthConn,
      {
        policyId: policy.id,
        body: updateInput,
      },
    );
  });

  // 6. Uniqueness: policy_code is unique and unchanged
  TestValidator.equals(
    "updated policy_code matches original",
    updated.policy_code,
    policy.policy_code,
  );
}
