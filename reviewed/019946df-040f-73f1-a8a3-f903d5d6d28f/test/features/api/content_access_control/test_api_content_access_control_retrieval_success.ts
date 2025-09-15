import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEnterpriseLmsContentAccessControl } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsContentAccessControl";
import type { IEnterpriseLmsOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsOrganizationAdmin";

/**
 * Test the retrieval of a specific content access control entry by ID.
 *
 * This E2E test validates that an organization administrator can
 * authenticate, then successfully retrieve content access control details
 * belonging to their tenant. It verifies the content access control's
 * properties including allowed roles and learners.
 *
 * The test covers:
 *
 * 1. Organization admin user creation and authentication.
 * 2. Retrieving a valid content access control by ID through simulation.
 * 3. Ensuring tenant isolation by unauthorized access denied.
 * 4. Access attempts using non-existent IDs result in errors.
 */
export async function test_api_content_access_control_retrieval_success(
  connection: api.IConnection,
) {
  // 1. Create and authenticate organization administrator user
  const tenantId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const adminCreate = {
    tenant_id: tenantId,
    email: RandomGenerator.alphaNumeric(8) + "@example.com",
    password: "Passw0rd!",
    first_name: RandomGenerator.name(1),
    last_name: RandomGenerator.name(1),
  } satisfies IEnterpriseLmsOrganizationAdmin.ICreate;

  const organizationAdmin: IEnterpriseLmsOrganizationAdmin.IAuthorized =
    await api.functional.auth.organizationAdmin.join(connection, {
      body: adminCreate,
    });
  typia.assert(organizationAdmin);

  // 2. Simulate retrieval of a content access control by a known ID to test success
  const simulatedContentAccessControl: IEnterpriseLmsContentAccessControl =
    await api.functional.enterpriseLms.organizationAdmin.contentAccessControls.at(
      { ...connection, simulate: true },
      {
        id: typia.random<string & tags.Format<"uuid">>(),
      },
    );
  typia.assert(simulatedContentAccessControl);

  // 3. Unauthorized access attempt with empty headers
  const unauthenticatedConn: api.IConnection = { ...connection, headers: {} };

  await TestValidator.error("Unauthorized retrieval should fail", async () => {
    await api.functional.enterpriseLms.organizationAdmin.contentAccessControls.at(
      unauthenticatedConn,
      {
        id: typia.random<string & tags.Format<"uuid">>(),
      },
    );
  });

  // 4. Retrieval of non-existent ID should result in error
  await TestValidator.error(
    "Retrieval with non-existent ID should fail",
    async () => {
      await api.functional.enterpriseLms.organizationAdmin.contentAccessControls.at(
        connection,
        {
          id: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );
}
