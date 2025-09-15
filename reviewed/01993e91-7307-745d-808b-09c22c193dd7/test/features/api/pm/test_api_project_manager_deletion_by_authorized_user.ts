import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITaskManagementPm } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementPm";

export async function test_api_project_manager_deletion_by_authorized_user(
  connection: api.IConnection,
) {
  // 1. Register and login as first PM user (authorized deleter)
  const firstPmCreateBody = {
    email: `pm_${RandomGenerator.alphaNumeric(8)}@example.com`,
    password: "TestPassword123!",
    name: RandomGenerator.name(2),
  } satisfies ITaskManagementPm.ICreate;
  const firstPm = await api.functional.auth.pm.join(connection, {
    body: firstPmCreateBody,
  });
  typia.assert(firstPm);

  // 2. Register second PM user to delete
  const secondPmCreateBody = {
    email: `pm_${RandomGenerator.alphaNumeric(8)}@example.com`,
    password: "AnotherPass123$",
    name: RandomGenerator.name(2),
  } satisfies ITaskManagementPm.ICreate;
  const secondPm = await api.functional.auth.pm.join(connection, {
    body: secondPmCreateBody,
  });
  typia.assert(secondPm);

  // 3. Attempt to delete second PM without authorization (should fail)
  const unauthConnection: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "delete PM without authorization should fail",
    async () => {
      await api.functional.taskManagement.pm.taskManagement.pms.erasePm(
        unauthConnection,
        { id: secondPm.id },
      );
    },
  );

  // 4. Login as first PM user again to ensure valid auth
  await api.functional.auth.pm.login(connection, {
    body: {
      email: firstPmCreateBody.email,
      password: firstPmCreateBody.password,
    } satisfies ITaskManagementPm.ILogin,
  });

  // 5. Delete the second PM user as authorized user
  await api.functional.taskManagement.pm.taskManagement.pms.erasePm(
    connection,
    { id: secondPm.id },
  );

  // 6. Attempt to delete a non-existent PM user (random UUID) and expect error
  await TestValidator.error(
    "delete non-existent PM user should fail",
    async () => {
      await api.functional.taskManagement.pm.taskManagement.pms.erasePm(
        connection,
        {
          id: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );
}
