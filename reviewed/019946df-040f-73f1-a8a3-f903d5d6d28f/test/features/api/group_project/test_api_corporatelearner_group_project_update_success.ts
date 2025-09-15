import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEnterpriseLmsCorporateLearner } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsCorporateLearner";
import type { IEnterpriseLmsGroupProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsGroupProject";
import type { IEnterpriseLmsTenant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsTenant";

/**
 * Test suite to verify the update flow of group projects for corporate
 * learners in Enterprise LMS.
 *
 * This test simulates the full journey from user registration/login,
 * through group project creation, to updating the group's details
 * successfully. It also tests failure scenarios including unauthorized
 * access and invalid request parameters.
 *
 * Steps:
 *
 * 1. Authenticate a new corporate learner user using valid tenant and personal
 *    info.
 * 2. Create a group project with initial title, description, start and end
 *    dates.
 * 3. Update the group project with new title, description, and timeframe.
 * 4. Validate the update is reflected and immutable fields remain constant.
 * 5. Test update failure when unauthenticated.
 * 6. Test update failure with invalid UUIDs and invalid payloads.
 */
export async function test_api_corporatelearner_group_project_update_success(
  connection: api.IConnection,
) {
  // 1. Authenticate as a corporate learner user
  const createUserBody = {
    tenant_id: typia.random<string & tags.Format<"uuid">>(),
    email: RandomGenerator.name(2).replace(/ /g, "") + "@enterprise.com",
    password: "TestPassword123!",
    first_name: RandomGenerator.name(1),
    last_name: RandomGenerator.name(1),
  } satisfies IEnterpriseLmsCorporateLearner.ICreate;

  const user: IEnterpriseLmsCorporateLearner.IAuthorized =
    await api.functional.auth.corporateLearner.join(connection, {
      body: createUserBody,
    });
  typia.assert(user);

  // 2. Create a group project
  const createGroupProjectBody = {
    tenant_id: user.tenant_id,
    owner_id: user.id,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.content({ paragraphs: 1 }),
    start_at: new Date(Date.now() + 86400000).toISOString(), // 1 day from now
    end_at: new Date(Date.now() + 86400000 * 7).toISOString(), // 7 days from now
  } satisfies IEnterpriseLmsGroupProject.ICreate;

  const createdGroupProject: IEnterpriseLmsGroupProject =
    await api.functional.enterpriseLms.corporateLearner.groupProjects.create(
      connection,
      { body: createGroupProjectBody },
    );
  typia.assert(createdGroupProject);

  // 3. Update the group project with new data
  const updateGroupProjectBody = {
    title: RandomGenerator.paragraph({ sentences: 4 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    start_at: new Date(Date.now() + 86400000 * 2).toISOString(), // 2 days from now
    end_at: new Date(Date.now() + 86400000 * 10).toISOString(), // 10 days from now
  } satisfies IEnterpriseLmsGroupProject.IUpdate;

  const updatedGroupProject: IEnterpriseLmsGroupProject =
    await api.functional.enterpriseLms.corporateLearner.groupProjects.update(
      connection,
      { groupProjectId: createdGroupProject.id, body: updateGroupProjectBody },
    );
  typia.assert(updatedGroupProject);

  // Validate update changes
  TestValidator.equals(
    "updated group project title matches",
    updatedGroupProject.title,
    updateGroupProjectBody.title,
  );
  TestValidator.equals(
    "updated group project description matches",
    updatedGroupProject.description,
    updateGroupProjectBody.description,
  );
  TestValidator.equals(
    "updated group project start_at matches",
    updatedGroupProject.start_at,
    updateGroupProjectBody.start_at,
  );
  TestValidator.equals(
    "updated group project end_at matches",
    updatedGroupProject.end_at,
    updateGroupProjectBody.end_at,
  );

  // Immutable fields must not change
  TestValidator.equals(
    "group project id unchanged",
    updatedGroupProject.id,
    createdGroupProject.id,
  );
  TestValidator.equals(
    "group project tenant_id unchanged",
    updatedGroupProject.tenant_id,
    createdGroupProject.tenant_id,
  );
  TestValidator.equals(
    "group project owner_id unchanged",
    updatedGroupProject.owner_id,
    createdGroupProject.owner_id,
  );

  // 5. Test update without authentication (unauthenticated)
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  await TestValidator.error("update fails without authentication", async () => {
    await api.functional.enterpriseLms.corporateLearner.groupProjects.update(
      unauthenticatedConnection,
      { groupProjectId: createdGroupProject.id, body: updateGroupProjectBody },
    );
  });

  // 6. Test update with invalid UUID
  await TestValidator.error(
    "update fails with invalid groupProjectId",
    async () => {
      await api.functional.enterpriseLms.corporateLearner.groupProjects.update(
        connection,
        { groupProjectId: "invalid-uuid-format", body: updateGroupProjectBody },
      );
    },
  );

  // 7. Test update with invalid payload (missing mandatory title)
  // NOTE: Skipping test for type error or missing required fields as per policy.
  // Instead, test with logically invalid values - for example empty title.
  const invalidUpdateBody = {
    ...updateGroupProjectBody,
    title: "", // Empty title to simulate invalid data
  } satisfies IEnterpriseLmsGroupProject.IUpdate;

  await TestValidator.error(
    "update fails with invalid payload (empty title)",
    async () => {
      await api.functional.enterpriseLms.corporateLearner.groupProjects.update(
        connection,
        { groupProjectId: createdGroupProject.id, body: invalidUpdateBody },
      );
    },
  );
}
