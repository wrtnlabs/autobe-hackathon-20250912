import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformOrganizationAdmin";
import type { IHealthcarePlatformUserAuthentication } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformUserAuthentication";

/**
 * Test updating a user authentication record as an organization admin, covering
 * valid and invalid scenarios:
 *
 * 1. Register two organization admins in separate organizations
 * 2. Log in as admin 1 and create a user authentication record belonging to their
 *    organization
 * 3. Successfully update the provider and provider_key for this record
 * 4. Attempt to update the same authentication record as admin 2 (should be
 *    forbidden)
 * 5. Attempt to update a non-existent authentication record (should be not found)
 * 6. Validation: attempts to set provider or provider_key to empty string are
 *    rejected
 */
export async function test_api_org_user_authentication_update_edge_cases(
  connection: api.IConnection,
) {
  // 1. Register two organization admins (org1, org2)
  const orgAdmin1Email = typia.random<string & tags.Format<"email">>();
  const orgAdmin2Email = typia.random<string & tags.Format<"email">>();

  const orgAdmin1: IHealthcarePlatformOrganizationAdmin.IAuthorized =
    await api.functional.auth.organizationAdmin.join(connection, {
      body: {
        email: orgAdmin1Email,
        full_name: RandomGenerator.name(),
        phone: RandomGenerator.mobile(),
        password: RandomGenerator.alphaNumeric(12),
      },
    });
  typia.assert(orgAdmin1);

  const orgAdmin2: IHealthcarePlatformOrganizationAdmin.IAuthorized =
    await api.functional.auth.organizationAdmin.join(connection, {
      body: {
        email: orgAdmin2Email,
        full_name: RandomGenerator.name(),
        phone: RandomGenerator.mobile(),
        password: RandomGenerator.alphaNumeric(12),
      },
    });
  typia.assert(orgAdmin2);

  // 2. Log in as orgAdmin1 (join sets token, so session ready)
  const orgUser1Id = typia.random<string & tags.Format<"uuid">>();
  const authRecord: IHealthcarePlatformUserAuthentication =
    await api.functional.healthcarePlatform.organizationAdmin.userAuthentications.create(
      connection,
      {
        body: {
          user_id: orgUser1Id,
          user_type: "organizationadmin",
          provider: "local",
          provider_key: RandomGenerator.alphaNumeric(10),
        },
      },
    );
  typia.assert(authRecord);

  // 3. Update provider & provider_key for own organization's authentication record
  const newProvider = "saml";
  const newProviderKey = RandomGenerator.alphaNumeric(16);
  const updated: IHealthcarePlatformUserAuthentication =
    await api.functional.healthcarePlatform.organizationAdmin.userAuthentications.update(
      connection,
      {
        userAuthenticationId: authRecord.id,
        body: {
          provider: newProvider,
          provider_key: newProviderKey,
          updated_at: new Date().toISOString(),
        },
      },
    );
  typia.assert(updated);
  TestValidator.equals(
    "provider should be updated for own org record",
    updated.provider,
    newProvider,
  );
  TestValidator.equals(
    "provider_key should be updated for own org record",
    updated.provider_key,
    newProviderKey,
  );

  // 4. Register an authentication record for orgAdmin2 (other org)
  //    Admin2's record used for cross-org forbidden test
  await api.functional.auth.organizationAdmin.join(connection, {
    body: {
      email: orgAdmin2Email,
      full_name: orgAdmin2.full_name,
      phone: orgAdmin2.phone || RandomGenerator.mobile(),
      password: RandomGenerator.alphaNumeric(12),
    },
  });
  const orgUser2Id = typia.random<string & tags.Format<"uuid">>();
  const authRecordOrg2: IHealthcarePlatformUserAuthentication =
    await api.functional.healthcarePlatform.organizationAdmin.userAuthentications.create(
      connection,
      {
        body: {
          user_id: orgUser2Id,
          user_type: "organizationadmin",
          provider: "local",
          provider_key: RandomGenerator.alphaNumeric(10),
        },
      },
    );
  typia.assert(authRecordOrg2);

  // Attempt to update orgAdmin1's authRecord as orgAdmin2 (should be forbidden)
  await TestValidator.error(
    "cross-organization update is forbidden",
    async () => {
      await api.functional.healthcarePlatform.organizationAdmin.userAuthentications.update(
        connection,
        {
          userAuthenticationId: authRecord.id,
          body: { provider: "oauth2" },
        },
      );
    },
  );

  // 5. Attempt to update a non-existent authentication record (should be not found)
  const fakeId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "updating non-existent authentication record must fail",
    async () => {
      await api.functional.healthcarePlatform.organizationAdmin.userAuthentications.update(
        connection,
        {
          userAuthenticationId: fakeId,
          body: { provider: "oauth2" },
        },
      );
    },
  );

  // 6. Validation: update with empty provider (forbidden by business validation)
  await TestValidator.error(
    "provider cannot be empty string on update",
    async () => {
      await api.functional.healthcarePlatform.organizationAdmin.userAuthentications.update(
        connection,
        {
          userAuthenticationId: authRecordOrg2.id,
          body: { provider: "", updated_at: new Date().toISOString() },
        },
      );
    },
  );
  // ...and empty provider_key (also forbidden)
  await TestValidator.error(
    "provider_key cannot be empty string on update",
    async () => {
      await api.functional.healthcarePlatform.organizationAdmin.userAuthentications.update(
        connection,
        {
          userAuthenticationId: authRecordOrg2.id,
          body: { provider_key: "", updated_at: new Date().toISOString() },
        },
      );
    },
  );
}
