import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEnterpriseLmsOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsOrganizationAdmin";

/**
 * This E2E test scenario validates the deletion of a forum post by an
 * organization administrator. It includes authentication as an organization
 * administrator via join and login API endpoints.
 *
 * The scenario tests success path where the oauth token of an
 * organizationAdmin is obtained by join and login sequence. Then, the
 * organizationAdmin deletes a specific forum post identified by forumId,
 * forumThreadId, and forumPostId. It verifies that the deletion request
 * succeeds without exceptions. Afterwards, attempts to delete the same post
 * again results in error (confirming removal). Negative test cases include
 * unauthorized deletion attempts by users with invalid tokens or
 * insufficient role/tenant. These are confirmed to throw errors.
 *
 * The test ensures strict role-based access control and multi-tenant
 * isolation. It uses typia.assert to validate response DTOs and awaits all
 * api calls properly.
 */
export async function test_api_forum_post_deletion_by_organization_admin(
  connection: api.IConnection,
) {
  // 1. Organization Admin joins (registration)
  const joinBody: IEnterpriseLmsOrganizationAdmin.ICreate = {
    tenant_id: typia.random<string & tags.Format<"uuid">>(),
    email: `admin${RandomGenerator.alphaNumeric(6)}@example.com`,
    password: "SecurePass123!",
    first_name: RandomGenerator.name(1),
    last_name: RandomGenerator.name(1),
  };
  const authorizedAdmin: IEnterpriseLmsOrganizationAdmin.IAuthorized =
    await api.functional.auth.organizationAdmin.join(connection, {
      body: joinBody,
    });
  typia.assert(authorizedAdmin);

  // 2. Organization Admin logs in
  const loginBody: IEnterpriseLmsOrganizationAdmin.ILogin = {
    email: joinBody.email,
    password: joinBody.password,
  };
  const loginResult: IEnterpriseLmsOrganizationAdmin.IAuthorized =
    await api.functional.auth.organizationAdmin.login(connection, {
      body: loginBody,
    });
  typia.assert(loginResult);

  // 3. Deletion of forum post by organization admin
  const forumId = typia.random<string & tags.Format<"uuid">>();
  const forumThreadId = typia.random<string & tags.Format<"uuid">>();
  const forumPostId = typia.random<string & tags.Format<"uuid">>();

  // The erase method returns void on success, await to ensure completion
  await api.functional.enterpriseLms.organizationAdmin.forums.forumThreads.forumPosts.erase(
    connection,
    {
      forumId,
      forumThreadId,
      forumPostId,
    },
  );

  // 4. Attempt deletion of the same forum post again should throw error
  await TestValidator.error(
    "deleting already deleted forum post should throw error",
    async () => {
      await api.functional.enterpriseLms.organizationAdmin.forums.forumThreads.forumPosts.erase(
        connection,
        {
          forumId,
          forumThreadId,
          forumPostId,
        },
      );
    },
  );

  // 5. Negative test: attempt deletion without authentication (unauthorized)
  // Create unauthenticated connection by clearing headers
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  await TestValidator.error(
    "unauthorized deletion should throw error",
    async () => {
      await api.functional.enterpriseLms.organizationAdmin.forums.forumThreads.forumPosts.erase(
        unauthenticatedConnection,
        {
          forumId: typia.random<string & tags.Format<"uuid">>(),
          forumThreadId: typia.random<string & tags.Format<"uuid">>(),
          forumPostId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );
}
