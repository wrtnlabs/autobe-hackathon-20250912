import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITaskManagementDesigner } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementDesigner";
import type { ITaskManagementQa } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementQa";

export async function test_api_designer_detail_retrieval_by_qa_role(
  connection: api.IConnection,
) {
  // 1. Register and login QA user
  const qaCreateBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password_hash: RandomGenerator.alphaNumeric(32),
    name: RandomGenerator.name(),
  } satisfies ITaskManagementQa.ICreate;
  const qaUser: ITaskManagementQa.IAuthorized =
    await api.functional.auth.qa.join(connection, { body: qaCreateBody });
  typia.assert(qaUser);

  // Login QA user again (redundant but based on scenario order)
  const qaLoginBody = {
    email: qaCreateBody.email,
    password: qaCreateBody.password_hash,
  } satisfies ITaskManagementQa.ILogin;
  const qaUserLogin: ITaskManagementQa.IAuthorized =
    await api.functional.auth.qa.login(connection, { body: qaLoginBody });
  typia.assert(qaUserLogin);

  // 2. Register Designer user
  const designerCreateBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password_hash: RandomGenerator.alphaNumeric(32),
    name: RandomGenerator.name(),
  } satisfies ITaskManagementDesigner.ICreate;
  const designerUser: ITaskManagementDesigner.IAuthorized =
    await api.functional.auth.designer.join(connection, {
      body: designerCreateBody,
    });
  typia.assert(designerUser);

  // 3. QA user retrieving Designer's detail by ID
  const retrievedDesigner: ITaskManagementDesigner =
    await api.functional.taskManagement.designer.taskManagement.designers.at(
      connection,
      { id: designerUser.id },
    );
  typia.assert(retrievedDesigner);

  // 4. Check that returned Designer data matches registered Designer data
  TestValidator.equals(
    "designer email matches",
    retrievedDesigner.email,
    designerUser.email,
  );
  TestValidator.equals(
    "designer name matches",
    retrievedDesigner.name,
    designerUser.name,
  );
  TestValidator.equals(
    "designer created_at matches",
    retrievedDesigner.created_at,
    designerUser.created_at,
  );
  TestValidator.equals(
    "designer updated_at matches",
    retrievedDesigner.updated_at,
    designerUser.updated_at,
  );
  TestValidator.equals(
    "designer deleted_at matches",
    retrievedDesigner.deleted_at ?? null,
    designerUser.deleted_at ?? null,
  );

  // Check that password_hash is present in Designer detail since this is authorization mode
  TestValidator.predicate(
    "password_hash present in retrieved designer",
    typeof retrievedDesigner.password_hash === "string" &&
      retrievedDesigner.password_hash.length > 0,
  );

  // 5. Unauthorized attempts:
  // 5.1 Anonymous user trying to read Designer detail: create connection with empty headers
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "anonymous user cannot retrieve designer details",
    async () => {
      await api.functional.taskManagement.designer.taskManagement.designers.at(
        unauthConn,
        { id: designerUser.id },
      );
    },
  );

  // 5.2 Designer user login and trying to access another Designer's details
  const designerLoginBody = {
    email: designerCreateBody.email,
    password: designerCreateBody.password_hash,
  } satisfies ITaskManagementDesigner.ILogin;
  const designerLoginUser: ITaskManagementDesigner.IAuthorized =
    await api.functional.auth.designer.login(connection, {
      body: designerLoginBody,
    });
  typia.assert(designerLoginUser);

  // Designer user trying to retrieve another Designer detail should error
  // Use same connection authenticated as Designer user
  await TestValidator.error(
    "designer role user cannot retrieve other designer details",
    async () => {
      await api.functional.taskManagement.designer.taskManagement.designers.at(
        connection,
        { id: designerUser.id },
      );
    },
  );

  // 6. Invalid or non-existent Designer IDs

  // Invalid UUID format
  await TestValidator.error("should error on invalid UUID format", async () => {
    await api.functional.taskManagement.designer.taskManagement.designers.at(
      connection,
      { id: "invalid-uuid-format" as string & tags.Format<"uuid"> },
    );
  });

  // Non-existent but valid UUID
  let nonExistentId = typia.random<string & tags.Format<"uuid">>();
  if (nonExistentId === designerUser.id) {
    // ensure different
    nonExistentId = typia.random<string & tags.Format<"uuid">>();
  }
  await TestValidator.error(
    "should error on non-existent Designer ID",
    async () => {
      await api.functional.taskManagement.designer.taskManagement.designers.at(
        connection,
        { id: nonExistentId },
      );
    },
  );

  // Login QA again to ensure session active
  await api.functional.auth.qa.login(connection, { body: qaLoginBody });
}
