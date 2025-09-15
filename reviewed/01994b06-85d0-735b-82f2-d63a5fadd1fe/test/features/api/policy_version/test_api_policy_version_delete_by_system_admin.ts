import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformPolicyVersion } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformPolicyVersion";
import type { IHealthcarePlatformSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformSystemAdmin";

/**
 * Validate system admin can delete a policy version entry, ensure deletion
 * works, and validate business rules around permissions and non-existent
 * deletes.
 *
 * Steps:
 *
 * 1. Register and login as a system admin (admin1)
 * 2. Create a new policy version for that admin
 * 3. Delete it and check no error thrown (void return)
 * 4. Attempt to delete it again (should error)
 * 5. Register/login as a different system admin (admin2) and attempt to delete a
 *    version created by admin1 (should fail if business logic restricts,
 *    otherwise succeed)
 * 6. Attempt to delete a non-existent policy version ID (random uuid, expect
 *    error) Note: There is no explicit API to read/list policy versions, so
 *    after deletion, absence can only be checked by error on repeated delete.
 */
export async function test_api_policy_version_delete_by_system_admin(
  connection: api.IConnection,
) {
  // 1. System admin 1 registration & login
  const admin1Email = typia.random<string & tags.Format<"email">>();
  const admin1Password = RandomGenerator.alphaNumeric(12);
  const admin1Join = await api.functional.auth.systemAdmin.join(connection, {
    body: {
      email: admin1Email,
      full_name: RandomGenerator.name(),
      provider: "local",
      provider_key: admin1Email,
      password: admin1Password,
      phone: RandomGenerator.mobile(),
    } satisfies IHealthcarePlatformSystemAdmin.IJoin,
  });
  typia.assert(admin1Join);

  // (login not strictly necessary, join sets session)

  // 2. Create policy version as admin1
  const policyVersionReq = {
    organization_id: typia.random<string & tags.Format<"uuid">>(),
    policy_type: RandomGenerator.pick([
      "privacy",
      "terms",
      "compliance",
    ] as const),
    version: RandomGenerator.alphaNumeric(6),
    effective_at: new Date().toISOString(),
    title: RandomGenerator.paragraph({ sentences: 3 }),
    document_uri: `https://docs.example.com/${RandomGenerator.alphaNumeric(8)}`,
    document_hash: RandomGenerator.alphaNumeric(32),
  } satisfies IHealthcarePlatformPolicyVersion.ICreate;
  const createdPolicy =
    await api.functional.healthcarePlatform.systemAdmin.policyVersions.create(
      connection,
      { body: policyVersionReq },
    );
  typia.assert(createdPolicy);
  TestValidator.equals(
    "policy version organization_id matches",
    createdPolicy.organization_id,
    policyVersionReq.organization_id,
  );

  // 3. Delete created policy version
  await api.functional.healthcarePlatform.systemAdmin.policyVersions.erase(
    connection,
    {
      policyVersionId: createdPolicy.id,
    },
  );

  // 4. Attempt delete again: should error
  await TestValidator.error(
    "delete already-deleted policy version errors",
    async () => {
      await api.functional.healthcarePlatform.systemAdmin.policyVersions.erase(
        connection,
        {
          policyVersionId: createdPolicy.id,
        },
      );
    },
  );

  // 5. Register/login as a different system admin and try delete
  const admin2Email = typia.random<string & tags.Format<"email">>();
  const admin2Password = RandomGenerator.alphaNumeric(12);
  const admin2Join = await api.functional.auth.systemAdmin.join(connection, {
    body: {
      email: admin2Email,
      full_name: RandomGenerator.name(),
      provider: "local",
      provider_key: admin2Email,
      password: admin2Password,
      phone: RandomGenerator.mobile(),
    } satisfies IHealthcarePlatformSystemAdmin.IJoin,
  });
  typia.assert(admin2Join);

  // Create a policy version as admin2, then logout admin2, login as admin1 and try to delete admin2's version
  const policyVersionReq2 = {
    organization_id: typia.random<string & tags.Format<"uuid">>(),
    policy_type: RandomGenerator.pick([
      "privacy",
      "terms",
      "compliance",
    ] as const),
    version: RandomGenerator.alphaNumeric(6),
    effective_at: new Date().toISOString(),
    title: RandomGenerator.paragraph({ sentences: 3 }),
    document_uri: `https://docs.example.com/${RandomGenerator.alphaNumeric(8)}`,
    document_hash: RandomGenerator.alphaNumeric(32),
  } satisfies IHealthcarePlatformPolicyVersion.ICreate;
  const createdPolicy2 =
    await api.functional.healthcarePlatform.systemAdmin.policyVersions.create(
      connection,
      { body: policyVersionReq2 },
    );
  typia.assert(createdPolicy2);

  // Switch admin context back to admin1
  await api.functional.auth.systemAdmin.login(connection, {
    body: {
      email: admin1Email,
      provider: "local",
      provider_key: admin1Email,
      password: admin1Password,
    } satisfies IHealthcarePlatformSystemAdmin.ILogin,
  });

  // Try deleting admin2's policy as admin1
  await api.functional.healthcarePlatform.systemAdmin.policyVersions.erase(
    connection,
    {
      policyVersionId: createdPolicy2.id,
    },
  );
  // If business logic should restrict (e.g., only creator can delete), this should error. As there's no evidence of org/scope enforcement, just perform delete.

  // 6. Attempt to delete a non-existent policy version
  await TestValidator.error(
    "delete non-existent policy version should error",
    async () => {
      await api.functional.healthcarePlatform.systemAdmin.policyVersions.erase(
        connection,
        {
          policyVersionId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );
}
