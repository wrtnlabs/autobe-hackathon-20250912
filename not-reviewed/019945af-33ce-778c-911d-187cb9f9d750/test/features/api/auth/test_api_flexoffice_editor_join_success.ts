import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IFlexOfficeEditor } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeEditor";

export async function test_api_flexoffice_editor_join_success(
  connection: api.IConnection,
) {
  // 1. Generate unique editor registration data
  const editorName = RandomGenerator.name();
  const editorEmail = `editor.${typia.random<string & tags.Format<"email">>()}`;
  const editorPassword = `StrongPassword123!`;

  // Create the IFlexOfficeEditor.ICreate request body
  const createBody = {
    name: editorName,
    email: editorEmail,
    password: editorPassword,
  } satisfies IFlexOfficeEditor.ICreate;

  // 2. Attempt to join
  const authorized: IFlexOfficeEditor.IAuthorized =
    await api.functional.auth.editor.join(connection, {
      body: createBody,
    });
  typia.assert(authorized);

  // Validate ID and token properties
  TestValidator.predicate(
    "id is UUID formatted",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      authorized.id,
    ),
  );
  TestValidator.predicate(
    "access token is string",
    typeof authorized.token.access === "string" &&
      authorized.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token is string",
    typeof authorized.token.refresh === "string" &&
      authorized.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "expired_at is ISO 8601",
    !isNaN(Date.parse(authorized.token.expired_at)),
  );
  TestValidator.predicate(
    "refreshable_until is ISO 8601",
    !isNaN(Date.parse(authorized.token.refreshable_until)),
  );

  // 3. Attempt duplicate join to trigger 409 error
  await TestValidator.error(
    "duplicate email join should fail with conflict",
    async () => {
      await api.functional.auth.editor.join(connection, {
        body: createBody,
      });
    },
  );

  // 4. Attempt join with invalid password (empty string)
  await TestValidator.error(
    "empty password should fail validation",
    async () => {
      await api.functional.auth.editor.join(connection, {
        body: {
          name: editorName,
          email: `invalid_${typia.random<string & tags.Format<"email">>()}`,
          password: "",
        } satisfies IFlexOfficeEditor.ICreate,
      });
    },
  );

  // 5. Attempt join with invalid password (too short)
  await TestValidator.error(
    "too short password should fail validation",
    async () => {
      await api.functional.auth.editor.join(connection, {
        body: {
          name: editorName,
          email: `shortpass_${typia.random<string & tags.Format<"email">>()}`,
          password: "123",
        } satisfies IFlexOfficeEditor.ICreate,
      });
    },
  );
}
