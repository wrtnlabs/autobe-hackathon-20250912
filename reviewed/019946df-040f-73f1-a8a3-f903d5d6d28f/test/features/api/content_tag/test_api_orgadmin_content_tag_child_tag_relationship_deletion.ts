import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEnterpriseLmsOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsOrganizationAdmin";

/**
 * E2E test validating the organization administrator's ability to delete a
 * child content tag relationship.
 *
 * This test performs the mandatory organizationAdmin join operation twice,
 * establishing authentication and authorization context. It then sends a
 * DELETE request to the child tag relationship deletion endpoint, providing
 * realistic UUID parameters for the parent and child tags.
 *
 * The test asserts that the DELETE operation completes without errors,
 * demonstrating correct permissions and proper function operation.
 */
export async function test_api_orgadmin_content_tag_child_tag_relationship_deletion(
  connection: api.IConnection,
) {
  // Step 1. Authenticate as organization administrator user (1st join)
  const firstAdminAuth: IEnterpriseLmsOrganizationAdmin.IAuthorized =
    await api.functional.auth.organizationAdmin.join(connection, {
      body: {
        tenant_id: typia.random<string & tags.Format<"uuid">>(),
        email: "admin1@example.com",
        password: "securePassword123",
        first_name: "Admin",
        last_name: "User1",
      } satisfies IEnterpriseLmsOrganizationAdmin.ICreate,
    });
  typia.assert(firstAdminAuth);

  // Step 2. Authenticate as organization administrator user (2nd join, per dependency)
  const secondAdminAuth: IEnterpriseLmsOrganizationAdmin.IAuthorized =
    await api.functional.auth.organizationAdmin.join(connection, {
      body: {
        tenant_id: typia.random<string & tags.Format<"uuid">>(),
        email: "admin2@example.com",
        password: "securePassword123",
        first_name: "Admin",
        last_name: "User2",
      } satisfies IEnterpriseLmsOrganizationAdmin.ICreate,
    });
  typia.assert(secondAdminAuth);

  // Step 3. Issue delete request to erase child content tag relationship
  const parentTagId = typia.random<string & tags.Format<"uuid">>();
  const childTagId = typia.random<string & tags.Format<"uuid">>();

  await api.functional.enterpriseLms.organizationAdmin.contentTags.childTags.eraseChildTagRelationship(
    connection,
    {
      parentTagId: parentTagId,
      childTagId: childTagId,
    },
  );
}
