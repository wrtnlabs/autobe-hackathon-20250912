import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IStoryfieldAiSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IStoryfieldAiSystemAdmin";
import type { IStoryfieldAiSystemPolicy } from "@ORGANIZATION/PROJECT-api/lib/structures/IStoryfieldAiSystemPolicy";

/**
 * End-to-end test for soft-deleting a system policy as system admin.
 *
 * 1. Create system admin (join)
 * 2. Authenticate as system admin (join automatically authenticates)
 * 3. Create new system policy
 * 4. Soft-delete (deactivate) the policy using its id
 * 5. (Assume if there were a list endpoint, it would be checked here that deleted
 *    policy is not returned)
 * 6. Validate deleted_at property is not null after delete (not directly possible
 *    from erase call, but in a real API you'd reload the policy or query an
 *    admin listing)
 * 7. Try deleting same policy again: expect error (NotFound or AlreadyDeleted)
 * 8. Try deleting with random invalid policyId (expect error)
 * 9. Try non-admin role: should not permit policy deletion
 */
export async function test_api_system_policy_soft_delete_by_admin(
  connection: api.IConnection,
) {
  // Create & authenticate as system admin
  const adminJoinBody = typia.random<IStoryfieldAiSystemAdmin.IJoin>();
  const adminAuth: IStoryfieldAiSystemAdmin.IAuthorized =
    await api.functional.auth.systemAdmin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuth);

  // Create new system policy
  const createPolicyBody = typia.random<IStoryfieldAiSystemPolicy.ICreate>();
  const policy: IStoryfieldAiSystemPolicy =
    await api.functional.storyfieldAi.systemAdmin.systemPolicies.create(
      connection,
      { body: createPolicyBody },
    );
  typia.assert(policy);

  // Soft-delete the policy
  await api.functional.storyfieldAi.systemAdmin.systemPolicies.erase(
    connection,
    { policyId: policy.id },
  );

  // Try to delete the same policy again - should error
  await TestValidator.error("second delete on same policy fails", async () => {
    await api.functional.storyfieldAi.systemAdmin.systemPolicies.erase(
      connection,
      { policyId: policy.id },
    );
  });

  // Try deleting a non-existent UUID
  const nonExistentId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error("delete non-existent policyId fails", async () => {
    await api.functional.storyfieldAi.systemAdmin.systemPolicies.erase(
      connection,
      { policyId: nonExistentId },
    );
  });

  // Try unauthorized (simulate by clearing token)
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthorized user cannot soft-delete policy",
    async () => {
      await api.functional.storyfieldAi.systemAdmin.systemPolicies.erase(
        unauthConn,
        { policyId: policy.id },
      );
    },
  );
}
