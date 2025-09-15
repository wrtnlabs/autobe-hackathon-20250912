import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformOrganization";
import type { IHealthcarePlatformPolicyVersion } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformPolicyVersion";
import type { IHealthcarePlatformSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformSystemAdmin";

/**
 * Test creating a new policy version by system administrator:
 *
 * 1. Register/login as system admin (with business email, password, provider:
 *    "local").
 * 2. Create an organization (unique code, name, status).
 * 3. Create a policy version by providing organization_id, policy_type, version,
 *    title, document_uri, effective_at/expire_at.
 *
 *    - Validate policy version is persisted, all fields match input.
 * 4. Check that duplicate version number with the same org/policy_type is
 *    rejected.
 * 5. Attempt unauthorized creation (as anonymous), expect failure.
 */
export async function test_api_policy_version_creation_system_admin(
  connection: api.IConnection,
) {
  // 1. Register and login as system admin
  const sysadminEmail: string = `admin_${RandomGenerator.alphaNumeric(8)}@enterprise-corp.com`;
  const sysadminPassword = RandomGenerator.alphaNumeric(10);
  const sysadminJoin: IHealthcarePlatformSystemAdmin.IAuthorized =
    await api.functional.auth.systemAdmin.join(connection, {
      body: {
        email: sysadminEmail,
        full_name: RandomGenerator.name(),
        provider: "local",
        provider_key: sysadminEmail,
        password: sysadminPassword,
        phone: RandomGenerator.mobile(),
      } satisfies IHealthcarePlatformSystemAdmin.IJoin,
    });
  typia.assert(sysadminJoin);

  // 2. Login as system admin (ensure token)
  const sysadminAuth: IHealthcarePlatformSystemAdmin.IAuthorized =
    await api.functional.auth.systemAdmin.login(connection, {
      body: {
        email: sysadminEmail,
        provider: "local",
        provider_key: sysadminEmail,
        password: sysadminPassword,
      } satisfies IHealthcarePlatformSystemAdmin.ILogin,
    });
  typia.assert(sysadminAuth);

  // 3. Create organization
  const orgCreate = {
    code: `ORG-${RandomGenerator.alphaNumeric(6)}`,
    name: RandomGenerator.name(),
    status: "active",
  } satisfies IHealthcarePlatformOrganization.ICreate;
  const org: IHealthcarePlatformOrganization =
    await api.functional.healthcarePlatform.systemAdmin.organizations.create(
      connection,
      { body: orgCreate },
    );
  typia.assert(org);

  // 4. Create policy version
  const now = Date.now();
  const dtEffective = new Date(now + 60 * 1000).toISOString();
  const dtExpire = new Date(now + 60 * 60 * 1000).toISOString();
  const policyInput = {
    organization_id: org.id,
    policy_type: RandomGenerator.name(1).replace(/\s+/g, "_").toLowerCase(),
    version: "v1.0",
    title: `Policy: ${RandomGenerator.name(2)}`,
    document_uri: `https://docs.enterprise.com/policies/${RandomGenerator.alphaNumeric(10)}`,
    effective_at: dtEffective,
    expires_at: dtExpire,
    document_hash: RandomGenerator.alphaNumeric(20),
  } satisfies IHealthcarePlatformPolicyVersion.ICreate;

  const policy: IHealthcarePlatformPolicyVersion =
    await api.functional.healthcarePlatform.systemAdmin.policyVersions.create(
      connection,
      { body: policyInput },
    );
  typia.assert(policy);
  TestValidator.equals(
    "policy version org matches",
    policy.organization_id,
    org.id,
  );
  TestValidator.equals(
    "policy type matches",
    policy.policy_type,
    policyInput.policy_type,
  );
  TestValidator.equals("version matches", policy.version, policyInput.version);
  TestValidator.equals("title matches", policy.title, policyInput.title);
  TestValidator.equals(
    "effective_at matches",
    policy.effective_at,
    policyInput.effective_at,
  );
  TestValidator.equals(
    "expires_at matches",
    policy.expires_at,
    policyInput.expires_at,
  );
  TestValidator.equals(
    "document_uri matches",
    policy.document_uri,
    policyInput.document_uri,
  );
  TestValidator.equals(
    "document_hash matches",
    policy.document_hash,
    policyInput.document_hash,
  );

  // 5. Attempt to create duplicate (should be rejected)
  await TestValidator.error(
    "duplicate policy version cannot be created",
    async () => {
      await api.functional.healthcarePlatform.systemAdmin.policyVersions.create(
        connection,
        { body: policyInput },
      );
    },
  );

  // 6. Attempt create as unauthenticated: create bare connection
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthenticated policy version creation fails",
    async () => {
      await api.functional.healthcarePlatform.systemAdmin.policyVersions.create(
        unauthConn,
        { body: policyInput },
      );
    },
  );
}
