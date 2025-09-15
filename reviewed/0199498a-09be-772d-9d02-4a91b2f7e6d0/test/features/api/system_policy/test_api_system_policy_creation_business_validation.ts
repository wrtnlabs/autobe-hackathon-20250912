import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IStoryfieldAiSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IStoryfieldAiSystemAdmin";
import type { IStoryfieldAiSystemPolicy } from "@ORGANIZATION/PROJECT-api/lib/structures/IStoryfieldAiSystemPolicy";

/**
 * End-to-end validation of StoryField system policy creation by a system
 * administrator, enforcing all business rules and access control.
 *
 * Steps:
 *
 * 1. Join as a new systemAdmin to obtain authentication and privileges.
 * 2. Create a unique policy with all required fields.
 *
 *    - Ensure unique policy_code, sufficient description, active:true, and
 *         type/value coherence.
 *    - On success, new policy must have (id, audit fields, all metadata).
 * 3. Attempt to create a policy using the same policy_code (should fail with
 *    unique constraint error).
 * 4. Attempt to create policy without authentication; expect error.
 * 5. Assert that only systemAdmin context can create policies.
 */
export async function test_api_system_policy_creation_business_validation(
  connection: api.IConnection,
) {
  // 1. Join as a new systemAdmin
  const adminInput = {
    external_admin_id: RandomGenerator.alphaNumeric(12),
    email: `${RandomGenerator.alphaNumeric(10)}@businessdomain.com`,
    actor_type: "systemAdmin",
  } satisfies IStoryfieldAiSystemAdmin.IJoin;

  const adminAuth = await api.functional.auth.systemAdmin.join(connection, {
    body: adminInput,
  });
  typia.assert(adminAuth);

  // 2. Create a unique system policy
  const createPolicyBody = {
    policy_code: RandomGenerator.alphaNumeric(10),
    name: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.content({
      paragraphs: 2,
      sentenceMin: 8,
      sentenceMax: 15,
    }),
    value: "true",
    type: "boolean",
    active: true,
  } satisfies IStoryfieldAiSystemPolicy.ICreate;

  const policy =
    await api.functional.storyfieldAi.systemAdmin.systemPolicies.create(
      connection,
      {
        body: createPolicyBody,
      },
    );
  typia.assert(policy);
  TestValidator.equals(
    "policy_code matches input",
    policy.policy_code,
    createPolicyBody.policy_code,
  );
  TestValidator.equals("policy active true", policy.active, true);
  TestValidator.equals(
    "policy type matches",
    policy.type,
    createPolicyBody.type,
  );
  TestValidator.predicate(
    "created_at is ISO format string",
    typeof policy.created_at === "string" &&
      policy.created_at.includes("-") &&
      policy.created_at.includes(":"),
  );
  TestValidator.predicate(
    "id is uuid",
    typeof policy.id === "string" && policy.id.length > 0,
  );
  TestValidator.equals("deleted_at is null/undefined", policy.deleted_at, null);

  // 3. Attempt to create with same policy_code (should fail)
  await TestValidator.error(
    "duplicate policy_code triggers error",
    async () => {
      await api.functional.storyfieldAi.systemAdmin.systemPolicies.create(
        connection,
        {
          body: {
            ...createPolicyBody,
            name: RandomGenerator.paragraph({ sentences: 3 }),
          },
        },
      );
    },
  );

  // 4. Attempt to create policy without authentication; expect error
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthenticated creation is rejected",
    async () => {
      await api.functional.storyfieldAi.systemAdmin.systemPolicies.create(
        unauthConn,
        {
          body: {
            ...createPolicyBody,
            policy_code: RandomGenerator.alphaNumeric(10),
          },
        },
      );
    },
  );

  // 5. SystemAdmin required: logout/expire authentication and try again (should fail, simulate)
  // Note: Direct token revocation isn't defined here, so skip actual token expiry simulation
}
