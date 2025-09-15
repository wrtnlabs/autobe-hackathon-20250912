import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformOrganizationAdmin";
import type { IHealthcarePlatformUserCredential } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformUserCredential";

/**
 * Organization admin archives a new credential value for a user in their
 * organization.
 *
 * Validates organization admin registration and login, then user credential
 * archival by org admin. Steps:
 *
 * 1. Register new organization admin
 * 2. Login as the new organization admin
 * 3. Archive a user credential for the admin's own account using POST
 *    /healthcarePlatform/organizationAdmin/userCredentials
 *
 *    - Required fields (user_id, user_type, credential_type, credential_hash,
 *         archived_at, created_at) are populated
 *    - Response is asserted for success, data correctness, and schema compliance
 * 4. Attempt to archive a credential for a non-existent/cross-org user_id, expect
 *    policy enforcement (error)
 */
export async function test_api_organization_admin_user_credential_creation_and_rbac(
  connection: api.IConnection,
) {
  // 1. Register new organization admin
  const joinEmail = typia.random<string & tags.Format<"email">>();
  const joinName = RandomGenerator.name();
  const joinPhone = RandomGenerator.mobile();
  const joinPassword = RandomGenerator.alphaNumeric(14);
  const orgAdmin = await api.functional.auth.organizationAdmin.join(
    connection,
    {
      body: {
        email: joinEmail,
        full_name: joinName,
        phone: joinPhone,
        password: joinPassword,
      } satisfies IHealthcarePlatformOrganizationAdmin.IJoin,
    },
  );
  typia.assert(orgAdmin);

  // 2. Login as organization admin
  const loggedInAdmin = await api.functional.auth.organizationAdmin.login(
    connection,
    {
      body: {
        email: joinEmail,
        password: joinPassword,
      } satisfies IHealthcarePlatformOrganizationAdmin.ILogin,
    },
  );
  typia.assert(loggedInAdmin);
  TestValidator.equals(
    "logged-in user and joined user are same",
    loggedInAdmin.email,
    joinEmail,
  );

  // 3. Archive a user credential for the admin's own user ID
  const now = new Date();
  const createdAt = now.toISOString();
  const archivedAt = new Date(now.valueOf() + 1000 * 60 * 10).toISOString();
  const credentialBody = {
    user_id: orgAdmin.id,
    user_type: "orgadmin",
    credential_type: RandomGenerator.pick([
      "password",
      "sso",
      "certificate",
    ] as const),
    credential_hash: RandomGenerator.alphaNumeric(32),
    created_at: createdAt,
    archived_at: archivedAt,
  } satisfies IHealthcarePlatformUserCredential.ICreate;

  const archivedCredential =
    await api.functional.healthcarePlatform.organizationAdmin.userCredentials.create(
      connection,
      {
        body: credentialBody,
      },
    );
  typia.assert(archivedCredential);
  TestValidator.equals(
    "archived credential user_id matches",
    archivedCredential.user_id,
    orgAdmin.id,
  );
  TestValidator.equals(
    "archived credential user_type matches",
    archivedCredential.user_type,
    credentialBody.user_type,
  );
  TestValidator.equals(
    "archived credential credential_type matches",
    archivedCredential.credential_type,
    credentialBody.credential_type,
  );
  TestValidator.equals(
    "archived credential hash matches",
    archivedCredential.credential_hash,
    credentialBody.credential_hash,
  );
  TestValidator.equals(
    "archived credential created_at matches",
    archivedCredential.created_at,
    credentialBody.created_at,
  );
  TestValidator.equals(
    "archived credential archived_at matches",
    archivedCredential.archived_at,
    credentialBody.archived_at,
  );

  // 4. RBAC: Attempt to archive credential for a non-existent or cross-org user_id (should be denied)
  const crossOrgCredentialBody = {
    ...credentialBody,
    user_id: typia.random<string & tags.Format<"uuid">>(),
  } satisfies IHealthcarePlatformUserCredential.ICreate;
  await TestValidator.error(
    "cross-org or non-existent user_id must be rejected",
    async () => {
      await api.functional.healthcarePlatform.organizationAdmin.userCredentials.create(
        connection,
        {
          body: crossOrgCredentialBody,
        },
      );
    },
  );
}
