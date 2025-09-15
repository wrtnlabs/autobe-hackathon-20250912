import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITaskManagementDesigner } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementDesigner";
import type { ITaskManagementQa } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementQa";

export async function test_api_designer_user_update_by_qa_role(
  connection: api.IConnection,
) {
  // 1. QA user plain password generation
  const qaPassword = RandomGenerator.alphaNumeric(16);

  // 2. QA user registration
  const qaUserEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const qaUser: ITaskManagementQa.IAuthorized =
    await api.functional.auth.qa.join(connection, {
      body: {
        email: qaUserEmail,
        password_hash: qaPassword,
        name: RandomGenerator.name(),
      } satisfies ITaskManagementQa.ICreate,
    });
  typia.assert(qaUser);

  // 3. QA user login to establish session
  const qaLogin: ITaskManagementQa.IAuthorized =
    await api.functional.auth.qa.login(connection, {
      body: {
        email: qaUserEmail,
        password: qaPassword,
      } satisfies ITaskManagementQa.ILogin,
    });
  typia.assert(qaLogin);

  // 4. Designer user creation to be updated
  const designerEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const originalDesigner: ITaskManagementDesigner.IAuthorized =
    await api.functional.auth.designer.join(connection, {
      body: {
        email: designerEmail,
        password_hash: RandomGenerator.alphaNumeric(16),
        name: RandomGenerator.name(),
      } satisfies ITaskManagementDesigner.ICreate,
    });
  typia.assert(originalDesigner);

  // 5. QA user authenticates (re-login) to ensure session token
  await api.functional.auth.qa.login(connection, {
    body: {
      email: qaUserEmail,
      password: qaPassword,
    } satisfies ITaskManagementQa.ILogin,
  });

  // 6. Prepare update data for the Designer user
  const updateData: ITaskManagementDesigner.IUpdate = {
    email: typia.random<string & tags.Format<"email">>(),
    name: RandomGenerator.name(),
    updated_at: new Date().toISOString(),
    deleted_at: null,
  };

  // 7. Perform update as QA user
  const updatedDesigner: ITaskManagementDesigner =
    await api.functional.taskManagement.designer.taskManagement.designers.update(
      connection,
      {
        id: originalDesigner.id,
        body: updateData,
      },
    );
  typia.assert(updatedDesigner);

  // 8. Validate returned data matches updated fields
  TestValidator.equals(
    "Updated email should match",
    updatedDesigner.email,
    updateData.email ?? originalDesigner.email,
  );
  TestValidator.equals(
    "Updated name should match",
    updatedDesigner.name,
    updateData.name ?? originalDesigner.name,
  );
  TestValidator.equals(
    "Updated deleted_at should match",
    updatedDesigner.deleted_at,
    updateData.deleted_at,
  );

  // 9. Ensure password_hash is not altered improperly (not empty and same type)
  TestValidator.predicate(
    "password_hash exists and is string",
    typeof updatedDesigner.password_hash === "string" &&
      updatedDesigner.password_hash.length > 0,
  );

  // 10. Test update with invalid ID (expect error)
  await TestValidator.error(
    "Updating non-existent ID should fail",
    async () => {
      await api.functional.taskManagement.designer.taskManagement.designers.update(
        connection,
        {
          id: typia.random<string & tags.Format<"uuid">>(),
          body: {
            email: typia.random<string & tags.Format<"email">>(),
          } satisfies ITaskManagementDesigner.IUpdate,
        },
      );
    },
  );

  // 11. Test update with invalid data (empty body) - should still succeed as all fields optional
  const emptyUpdate: ITaskManagementDesigner.IUpdate = {};
  const updatedDesigner2: ITaskManagementDesigner =
    await api.functional.taskManagement.designer.taskManagement.designers.update(
      connection,
      {
        id: updatedDesigner.id,
        body: emptyUpdate,
      },
    );
  typia.assert(updatedDesigner2);

  TestValidator.equals(
    "Empty update preserves email",
    updatedDesigner2.email,
    updatedDesigner.email,
  );
}
