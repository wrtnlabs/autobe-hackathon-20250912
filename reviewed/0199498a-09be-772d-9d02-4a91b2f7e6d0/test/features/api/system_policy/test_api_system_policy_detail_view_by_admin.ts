import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IStoryfieldAiSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IStoryfieldAiSystemAdmin";
import type { IStoryfieldAiSystemPolicy } from "@ORGANIZATION/PROJECT-api/lib/structures/IStoryfieldAiSystemPolicy";

/**
 * Validates retrieval of a single system policy's details by a system
 * administrator.
 *
 * Scenarios tested:
 *
 * 1. Register a new system admin and obtain credentials
 * 2. As the admin, create a new system policy (ICreate)
 * 3. Retrieve the created policy with 'at' using its id
 * 4. All fields in the fetched result must match creation input plus audit info
 * 5. Edge: Reading with non-existent policyId should fail (TestValidator.error)
 * 6. Edge: [Soft delete simulation skipped; API does not provide delete]
 * 7. Edge: Unauthenticated/non-admin request for policy detail fails
 */
export async function test_api_system_policy_detail_view_by_admin(
  connection: api.IConnection,
) {
  // 1. Register a new system admin and obtain credentials
  const joinInput = {
    external_admin_id: RandomGenerator.alphaNumeric(12),
    email: `${RandomGenerator.alphaNumeric(8)}@company.com`,
    actor_type: "systemAdmin",
  } satisfies IStoryfieldAiSystemAdmin.IJoin;
  const admin = await api.functional.auth.systemAdmin.join(connection, {
    body: joinInput,
  });
  typia.assert(admin);

  // 2. As admin, create a new system policy for test
  const policyInput = {
    policy_code: RandomGenerator.alphaNumeric(10),
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.content({ paragraphs: 1 }),
    value: RandomGenerator.alphaNumeric(8),
    type: RandomGenerator.pick([
      "boolean",
      "int",
      "string",
      "duration",
      "json",
    ] as const),
    active: true,
  } satisfies IStoryfieldAiSystemPolicy.ICreate;
  const policy =
    await api.functional.storyfieldAi.systemAdmin.systemPolicies.create(
      connection,
      { body: policyInput },
    );
  typia.assert(policy);

  // 3. Retrieve the policy by id
  const fetched =
    await api.functional.storyfieldAi.systemAdmin.systemPolicies.at(
      connection,
      { policyId: policy.id },
    );
  typia.assert(fetched);

  // 4. Validate all fields (input match & audit fields present)
  TestValidator.equals(
    "policy_code matches",
    fetched.policy_code,
    policyInput.policy_code,
  );
  TestValidator.equals("name matches", fetched.name, policyInput.name);
  TestValidator.equals(
    "description matches",
    fetched.description,
    policyInput.description,
  );
  TestValidator.equals("value matches", fetched.value, policyInput.value);
  TestValidator.equals("type matches", fetched.type, policyInput.type);
  TestValidator.equals("active matches", fetched.active, policyInput.active);
  TestValidator.predicate(
    "created_at is ISO",
    typeof fetched.created_at === "string",
  );
  TestValidator.predicate(
    "updated_at is ISO",
    typeof fetched.updated_at === "string",
  );
  TestValidator.equals(
    "deleted_at is null or undefined",
    fetched.deleted_at,
    null,
  );

  // 5. Edge: Read policyId that does not exist
  const nonExistentId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "fetching non-existent policyId fails",
    async () => {
      await api.functional.storyfieldAi.systemAdmin.systemPolicies.at(
        connection,
        { policyId: nonExistentId },
      );
    },
  );

  // 6. [Soft delete simulation skipped: No policy delete endpoint]

  // 7. Edge: Unauthenticated access - get with empty headers
  const unauthConn = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthenticated user cannot fetch policy detail",
    async () => {
      await api.functional.storyfieldAi.systemAdmin.systemPolicies.at(
        unauthConn,
        { policyId: policy.id },
      );
    },
  );
}
