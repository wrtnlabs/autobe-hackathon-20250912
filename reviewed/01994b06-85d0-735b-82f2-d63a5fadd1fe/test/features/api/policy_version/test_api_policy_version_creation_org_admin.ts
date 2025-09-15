import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformOrganization";
import type { IHealthcarePlatformOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformOrganizationAdmin";
import type { IHealthcarePlatformPolicyVersion } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformPolicyVersion";
import type { IHealthcarePlatformSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformSystemAdmin";

/**
 * End-to-end test for organization admin creating a new policy version in their
 * own organization.
 *
 * Steps:
 *
 * 1. Register system admin and login
 * 2. System admin creates a new organization
 * 3. Register organization admin and login
 * 4. Organization admin creates policy version for their organization (success)
 * 5. Attempt to create policy version with duplicate version string (should fail)
 * 6. Register another organization admin that's not admin of this org and try
 *    creation (should fail)
 * 7. Try to create as completely unauthorized user (should fail)
 */
export async function test_api_policy_version_creation_org_admin(
  connection: api.IConnection,
) {
  // 1. Register system admin and login
  const sysadminEmail = typia.random<string & tags.Format<"email">>();
  const sysadminPassword = RandomGenerator.alphaNumeric(12);
  const sysadminJoin = await api.functional.auth.systemAdmin.join(connection, {
    body: {
      email: sysadminEmail,
      full_name: RandomGenerator.name(),
      phone: RandomGenerator.mobile(),
      provider: "local",
      provider_key: sysadminEmail,
      password: sysadminPassword,
    } satisfies IHealthcarePlatformSystemAdmin.IJoin,
  });
  typia.assert(sysadminJoin);
  // ensure admin login works (to update token if needed)
  const sysadminLogin = await api.functional.auth.systemAdmin.login(
    connection,
    {
      body: {
        email: sysadminEmail,
        provider: "local",
        provider_key: sysadminEmail,
        password: sysadminPassword,
      } satisfies IHealthcarePlatformSystemAdmin.ILogin,
    },
  );
  typia.assert(sysadminLogin);

  // 2. System admin creates org
  const orgCode = RandomGenerator.alphaNumeric(8).toUpperCase();
  const orgName = RandomGenerator.name(3);
  const org =
    await api.functional.healthcarePlatform.systemAdmin.organizations.create(
      connection,
      {
        body: {
          code: orgCode,
          name: orgName,
          status: "active",
        } satisfies IHealthcarePlatformOrganization.ICreate,
      },
    );
  typia.assert(org);
  TestValidator.equals("organization code as input", org.code, orgCode);

  // 3. Register org admin and login
  const orgadminEmail = typia.random<string & tags.Format<"email">>();
  const orgadminPassword = RandomGenerator.alphaNumeric(12);
  const orgadminJoin = await api.functional.auth.organizationAdmin.join(
    connection,
    {
      body: {
        email: orgadminEmail,
        full_name: RandomGenerator.name(),
        phone: RandomGenerator.mobile(),
        password: orgadminPassword,
      } satisfies IHealthcarePlatformOrganizationAdmin.IJoin,
    },
  );
  typia.assert(orgadminJoin);
  const orgadminLogin = await api.functional.auth.organizationAdmin.login(
    connection,
    {
      body: {
        email: orgadminEmail,
        password: orgadminPassword,
      } satisfies IHealthcarePlatformOrganizationAdmin.ILogin,
    },
  );
  typia.assert(orgadminLogin);

  // 4. Create policy version (success)
  const policyType = RandomGenerator.name(1);
  const versionStr = "v" + RandomGenerator.alphaNumeric(5);
  const effectiveAt = new Date().toISOString();
  const title = RandomGenerator.paragraph({ sentences: 2 });
  const documentUri =
    "https://example.com/policy/" + RandomGenerator.alphaNumeric(6);
  const documentHash = RandomGenerator.alphaNumeric(32);
  // main success creation
  const policyVersionBody = {
    organization_id: org.id,
    policy_type: policyType,
    version: versionStr,
    effective_at: effectiveAt,
    title,
    document_uri: documentUri,
    document_hash: documentHash,
  } satisfies IHealthcarePlatformPolicyVersion.ICreate;
  const created =
    await api.functional.healthcarePlatform.organizationAdmin.policyVersions.create(
      connection,
      {
        body: policyVersionBody,
      },
    );
  typia.assert(created);
  TestValidator.equals("org id matches", created.organization_id, org.id);
  TestValidator.equals("policy_type matches", created.policy_type, policyType);
  TestValidator.equals("version matches", created.version, versionStr);
  TestValidator.equals("title matches", created.title, title);

  // 5. Duplicate version (should fail)
  await TestValidator.error("duplicate policy version must fail", async () => {
    await api.functional.healthcarePlatform.organizationAdmin.policyVersions.create(
      connection,
      {
        body: policyVersionBody,
      },
    );
  });

  // 6. Different org admin (not admin of org) fails
  // Register another org admin
  const otherOrgAdminEmail = typia.random<string & tags.Format<"email">>();
  const otherOrgAdminPassword = RandomGenerator.alphaNumeric(12);
  await api.functional.auth.organizationAdmin.join(connection, {
    body: {
      email: otherOrgAdminEmail,
      full_name: RandomGenerator.name(),
      phone: RandomGenerator.mobile(),
      password: otherOrgAdminPassword,
    } satisfies IHealthcarePlatformOrganizationAdmin.IJoin,
  });
  // login as other org admin (no assignment to org)
  await api.functional.auth.organizationAdmin.login(connection, {
    body: {
      email: otherOrgAdminEmail,
      password: otherOrgAdminPassword,
    } satisfies IHealthcarePlatformOrganizationAdmin.ILogin,
  });
  // try to create policy version (should fail unauthorized)
  await TestValidator.error("unauthorized org admin must fail", async () => {
    await api.functional.healthcarePlatform.organizationAdmin.policyVersions.create(
      connection,
      {
        body: {
          ...policyVersionBody,
          version: versionStr + "1",
        },
      },
    );
  });

  // 7. Random unauthenticated connection must fail
  // Make unauthenticated connection by stripping headers
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error("unauthenticated creation must fail", async () => {
    await api.functional.healthcarePlatform.organizationAdmin.policyVersions.create(
      unauthConn,
      {
        body: {
          ...policyVersionBody,
          version: versionStr + "2",
        },
      },
    );
  });
}
