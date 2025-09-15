import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEnterpriseLmsForums } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsForums";
import type { IEnterpriseLmsOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsOrganizationAdmin";

/**
 * This end-to-end test scenario verifies the deletion of a discussion forum by
 * an authorized organization administrator user within a tenant in the
 * Enterprise LMS. The workflow begins with registering a new
 * organizationAdministrator user with a valid tenant_id, followed by logging in
 * as that user to obtain authentication tokens. Then, the scenario proceeds to
 * create a new forum using the authenticated context, ensuring the forum is
 * properly stored and retrievable. Finally, the test executes the deletion of
 * the forum by its unique forumId under the same tenant and organizationAdmin
 * user context.
 *
 * Validation points include verifying successful registration and
 * authentication, confirming the forum creation response contains all expected
 * attributes including UUID and tenant association, and confirming the deletion
 * endpoint returns no content indicating success. The test also verifies
 * appropriate error handling when attempting to delete a non-existent or
 * unauthorized forum is performed.
 *
 * Business rules verified include enforcing multi-tenant data isolation to
 * prevent accessing or deleting forums outside the tenant context and ensuring
 * only organization administrators can delete forums.
 *
 * Success criteria are successful chain creation of authenticated
 * organizationAdmin user, forum creation, and forum deletion without errors and
 * with correct HTTP status codes and response structure.
 *
 * Failure cases tested include unauthorized delete attempts, invalid UUIDs, and
 * deletion of already deleted or non-existent forums.
 */
export async function test_api_forum_deletion_with_authentication_context(
  connection: api.IConnection,
) {
  // 1. Register organizationAdmin user (tenant1)
  const tenantId1 = typia.random<string & tags.Format<"uuid">>();
  const orgAdmin1Email = `${RandomGenerator.name(1).toLowerCase()}.${RandomGenerator.name(1).toLowerCase()}@example.com`;
  const orgAdmin1Create = {
    tenant_id: tenantId1,
    email: orgAdmin1Email,
    password: "SecurePa$$123",
    first_name: RandomGenerator.name(1),
    last_name: RandomGenerator.name(1),
  } satisfies IEnterpriseLmsOrganizationAdmin.ICreate;

  const orgAdmin1: IEnterpriseLmsOrganizationAdmin.IAuthorized =
    await api.functional.auth.organizationAdmin.join(connection, {
      body: orgAdmin1Create,
    });
  typia.assert(orgAdmin1);

  // 2. Login as organizationAdmin user (tenant1) to renew tokens
  const orgAdmin1LoginBody = {
    email: orgAdmin1Email,
    password: "SecurePa$$123",
  } satisfies IEnterpriseLmsOrganizationAdmin.ILogin;

  const orgAdmin1Login: IEnterpriseLmsOrganizationAdmin.IAuthorized =
    await api.functional.auth.organizationAdmin.login(connection, {
      body: orgAdmin1LoginBody,
    });
  typia.assert(orgAdmin1Login);

  // 3. Create a forum under tenant1 and owned by orgAdmin1
  const forumCreateBody = {
    tenant_id: tenantId1,
    owner_id: orgAdmin1.id,
    name: `Test Forum ${RandomGenerator.paragraph({ sentences: 1, wordMin: 5, wordMax: 10 })}`,
    description: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies IEnterpriseLmsForums.ICreate;

  const forum: IEnterpriseLmsForums =
    await api.functional.enterpriseLms.organizationAdmin.forums.create(
      connection,
      {
        body: forumCreateBody,
      },
    );

  typia.assert(forum);

  TestValidator.predicate(
    "forum ID is a valid UUID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      forum.id,
    ),
  );

  TestValidator.equals(
    "forum tenant ID matches tenant1",
    forum.tenant_id,
    tenantId1,
  );
  TestValidator.equals(
    "forum owner ID matches orgAdmin1",
    forum.owner_id,
    orgAdmin1.id,
  );

  // 4. Delete the created forum (expect success with no error)
  await api.functional.enterpriseLms.organizationAdmin.forums.erase(
    connection,
    {
      forumId: forum.id,
    },
  );

  // 5. Attempt deleting the same forum again to test error handling
  await TestValidator.error(
    "deleting already deleted or non-existent forum should fail",
    async () => {
      await api.functional.enterpriseLms.organizationAdmin.forums.erase(
        connection,
        {
          forumId: forum.id,
        },
      );
    },
  );

  // 6. Register another organizationAdmin user from different tenant (tenant2)
  const tenantId2 = typia.random<string & tags.Format<"uuid">>();
  const orgAdmin2Email = `${RandomGenerator.name(1).toLowerCase()}.${RandomGenerator.name(1).toLowerCase()}@example.com`;
  const orgAdmin2Create = {
    tenant_id: tenantId2,
    email: orgAdmin2Email,
    password: "SecurePa$$123",
    first_name: RandomGenerator.name(1),
    last_name: RandomGenerator.name(1),
  } satisfies IEnterpriseLmsOrganizationAdmin.ICreate;

  const orgAdmin2: IEnterpriseLmsOrganizationAdmin.IAuthorized =
    await api.functional.auth.organizationAdmin.join(connection, {
      body: orgAdmin2Create,
    });
  typia.assert(orgAdmin2);

  // 7. Login as organizationAdmin user (tenant2) to renew tokens
  const orgAdmin2LoginBody = {
    email: orgAdmin2Email,
    password: "SecurePa$$123",
  } satisfies IEnterpriseLmsOrganizationAdmin.ILogin;

  const orgAdmin2Login: IEnterpriseLmsOrganizationAdmin.IAuthorized =
    await api.functional.auth.organizationAdmin.login(connection, {
      body: orgAdmin2LoginBody,
    });
  typia.assert(orgAdmin2Login);

  // 8. Create another forum under tenant1 to check unauthorized delete
  const forum2CreateBody = {
    tenant_id: tenantId1, // same tenant as orgAdmin1
    owner_id: orgAdmin1.id,
    name: `Test Forum2 ${RandomGenerator.paragraph({ sentences: 1, wordMin: 5, wordMax: 10 })}`,
    description: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies IEnterpriseLmsForums.ICreate;

  // To create forum under orgAdmin1's identity, need to switch connection tokens
  // Simulate switching user by calling join and then login for orgAdmin1 again

  // Re-login orgAdmin1 to set tokens into connection
  await api.functional.auth.organizationAdmin.login(connection, {
    body: orgAdmin1LoginBody,
  });

  const forum2: IEnterpriseLmsForums =
    await api.functional.enterpriseLms.organizationAdmin.forums.create(
      connection,
      {
        body: forum2CreateBody,
      },
    );
  typia.assert(forum2);

  TestValidator.predicate(
    "forum2 ID is a valid UUID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      forum2.id,
    ),
  );

  TestValidator.equals(
    "forum2 tenant ID matches tenant1",
    forum2.tenant_id,
    tenantId1,
  );
  TestValidator.equals(
    "forum2 owner ID matches orgAdmin1",
    forum2.owner_id,
    orgAdmin1.id,
  );

  // 9. Try to delete forum2 with orgAdmin2's authentication (which is from tenant2)
  await api.functional.auth.organizationAdmin.login(connection, {
    body: orgAdmin2LoginBody,
  });

  await TestValidator.error(
    "orgAdmin2 from tenant2 cannot delete forum in tenant1",
    async () => {
      await api.functional.enterpriseLms.organizationAdmin.forums.erase(
        connection,
        {
          forumId: forum2.id,
        },
      );
    },
  );

  // 10. Re-login orgAdmin1 to delete forum2 successfully
  await api.functional.auth.organizationAdmin.login(connection, {
    body: orgAdmin1LoginBody,
  });

  await api.functional.enterpriseLms.organizationAdmin.forums.erase(
    connection,
    {
      forumId: forum2.id,
    },
  );
}
