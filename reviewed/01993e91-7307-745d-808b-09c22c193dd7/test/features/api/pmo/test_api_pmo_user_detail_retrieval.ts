import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITaskManagementPmo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementPmo";

export async function test_api_pmo_user_detail_retrieval(
  connection: api.IConnection,
) {
  // 1. PMO user registration
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.name(),
  } satisfies ITaskManagementPmo.IJoin;

  const authorizedJoin = await api.functional.auth.pmo.join(connection, {
    body: joinBody,
  });
  typia.assert(authorizedJoin);

  // 2. PMO user login
  const loginBody = {
    email: joinBody.email,
    password: joinBody.password,
  } satisfies ITaskManagementPmo.ILogin;

  const authorizedLogin = await api.functional.auth.pmo.login(connection, {
    body: loginBody,
  });
  typia.assert(authorizedLogin);

  // 3. Retrieve PMO user details by ID
  const pmoDetails =
    await api.functional.taskManagement.pmo.taskManagement.pmos.atPmo(
      connection,
      {
        id: authorizedLogin.id,
      },
    );
  typia.assert(pmoDetails);

  TestValidator.equals(
    "PMO user ID matches",
    pmoDetails.id,
    authorizedLogin.id,
  );
  TestValidator.equals(
    "PMO user email matches",
    pmoDetails.email,
    authorizedLogin.email,
  );
  TestValidator.equals(
    "PMO user name matches",
    pmoDetails.name,
    authorizedLogin.name,
  );

  TestValidator.predicate(
    "PMO password_hash exists and is non-empty",
    typeof pmoDetails.password_hash === "string" &&
      pmoDetails.password_hash.length > 0,
  );

  // 4. Validate timestamps are valid ISO strings
  TestValidator.predicate(
    "PMO created_at is a valid date-time",
    !isNaN(Date.parse(pmoDetails.created_at)),
  );
  TestValidator.predicate(
    "PMO updated_at is a valid date-time",
    !isNaN(Date.parse(pmoDetails.updated_at)),
  );

  // deleted_at is optional nullable string date-time
  if (pmoDetails.deleted_at !== null && pmoDetails.deleted_at !== undefined) {
    TestValidator.predicate(
      "PMO deleted_at is a valid date-time when present",
      !isNaN(Date.parse(pmoDetails.deleted_at)),
    );
  }

  // 5. Attempt to retrieve PMO user details for invalid non-existent UUID
  const nonExistentId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "Requesting non-existent PMO user ID should fail",
    async () => {
      await api.functional.taskManagement.pmo.taskManagement.pmos.atPmo(
        connection,
        {
          id: nonExistentId,
        },
      );
    },
  );
}
