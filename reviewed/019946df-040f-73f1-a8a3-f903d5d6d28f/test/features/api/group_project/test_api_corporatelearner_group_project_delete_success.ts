import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEnterpriseLmsCorporateLearner } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsCorporateLearner";
import type { IEnterpriseLmsGroupProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsGroupProject";
import type { IEnterpriseLmsTenant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsTenant";

/**
 * Test the successful deletion workflow of a group project by an
 * authenticated corporate learner.
 *
 * This test covers the entire lifecycle from user authentication, group
 * project creation, deletion, and validation of deletion through error
 * checking. It also verifies that unauthorized deletion attempts fail.
 */
export async function test_api_corporatelearner_group_project_delete_success(
  connection: api.IConnection,
) {
  // 1. Authenticate corporate learner user via join
  const joinPayload = {
    tenant_id: typia.random<string & tags.Format<"uuid">>(),
    email: RandomGenerator.alphaNumeric(8) + "@test.com",
    password: "Password123!",
    first_name: RandomGenerator.name(1),
    last_name: RandomGenerator.name(1),
  } satisfies IEnterpriseLmsCorporateLearner.ICreate;

  const corporateLearner: IEnterpriseLmsCorporateLearner.IAuthorized =
    await api.functional.auth.corporateLearner.join(connection, {
      body: joinPayload,
    });
  typia.assert(corporateLearner);

  // 2. Create a new group project
  const createBody = {
    tenant_id: corporateLearner.tenant_id,
    owner_id: corporateLearner.id,
    title: RandomGenerator.name(3),
    description: RandomGenerator.content({ paragraphs: 1 }),
    start_at: new Date(Date.now() - 86400000).toISOString(),
    end_at: new Date(Date.now() + 864000000).toISOString(),
  } satisfies IEnterpriseLmsGroupProject.ICreate;

  const groupProject =
    await api.functional.enterpriseLms.corporateLearner.groupProjects.create(
      connection,
      {
        body: createBody,
      },
    );
  typia.assert(groupProject);

  // 3. Delete the created group project
  await api.functional.enterpriseLms.corporateLearner.groupProjects.erase(
    connection,
    {
      groupProjectId: groupProject.id,
    },
  );

  // 4. Confirm deletion by trying to delete again, expecting an error
  await TestValidator.error(
    "Deleting deleted project throws error",
    async () => {
      await api.functional.enterpriseLms.corporateLearner.groupProjects.erase(
        connection,
        {
          groupProjectId: groupProject.id,
        },
      );
    },
  );

  // 5. Verify unauthorized deletion fails
  // Create a fresh unauthenticated connection by cloning but removing headers
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  await TestValidator.error("Unauthorized deletion should fail", async () => {
    await api.functional.enterpriseLms.corporateLearner.groupProjects.erase(
      unauthenticatedConnection,
      {
        groupProjectId: groupProject.id,
      },
    );
  });
}
