import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITaskManagementDesigner } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementDesigner";
import type { ITaskManagementQa } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementQa";

export async function test_api_designer_user_creation_by_qa_role(
  connection: api.IConnection,
) {
  // 1. Register QA user
  const qaUserPayload = {
    email: typia.random<string & tags.Format<"email">>(),
    password_hash: RandomGenerator.alphaNumeric(32),
    name: RandomGenerator.name(),
  } satisfies ITaskManagementQa.ICreate;
  const qaUser: ITaskManagementQa.IAuthorized =
    await api.functional.auth.qa.join(connection, {
      body: qaUserPayload,
    });
  typia.assert(qaUser);

  // 2. Login as QA user (role context)
  const qaLoginPayload = {
    email: qaUser.email,
    password: qaUserPayload.password_hash,
  } satisfies ITaskManagementQa.ILogin;
  const qaLogin: ITaskManagementQa.IAuthorized =
    await api.functional.auth.qa.login(connection, {
      body: qaLoginPayload,
    });
  typia.assert(qaLogin);

  // 3. Register Designer user (multi-role setup, initial join)
  const designerJoinPayload = {
    email: typia.random<string & tags.Format<"email">>(),
    password_hash: RandomGenerator.alphaNumeric(32),
    name: RandomGenerator.name(),
  } satisfies ITaskManagementDesigner.ICreate;
  const designerJoined: ITaskManagementDesigner.IAuthorized =
    await api.functional.auth.designer.join(connection, {
      body: designerJoinPayload,
    });
  typia.assert(designerJoined);

  // 4. Login as Designer user (role switching)
  const designerLoginPayload = {
    email: designerJoined.email,
    password: designerJoinPayload.password_hash,
  } satisfies ITaskManagementDesigner.ILogin;
  const designerLogin: ITaskManagementDesigner.IAuthorized =
    await api.functional.auth.designer.login(connection, {
      body: designerLoginPayload,
    });
  typia.assert(designerLogin);

  // 5. Create new Designer user as QA (authorized)
  const newDesignerPayload = {
    email: typia.random<string & tags.Format<"email">>(),
    password_hash: RandomGenerator.alphaNumeric(32),
    name: RandomGenerator.name(),
  } satisfies ITaskManagementDesigner.ICreate;

  const newDesigner: ITaskManagementDesigner =
    await api.functional.taskManagement.designer.taskManagement.designers.create(
      connection,
      { body: newDesignerPayload },
    );
  typia.assert(newDesigner);

  // 6. Validate created designer matches input except password_hash should not be externally exposed
  TestValidator.equals(
    "created designer email matches input",
    newDesigner.email,
    newDesignerPayload.email,
  );
  TestValidator.equals(
    "created designer name matches input",
    newDesigner.name,
    newDesignerPayload.name,
  );
  TestValidator.predicate(
    "password_hash should not be visible",
    newDesigner.password_hash === undefined ||
      newDesigner.password_hash === null,
  );

  // 7. Attempt duplicate creation to verify rejection
  await TestValidator.error(
    "duplicate designer email creation should fail",
    async () => {
      await api.functional.taskManagement.designer.taskManagement.designers.create(
        connection,
        { body: newDesignerPayload },
      );
    },
  );
}
