import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IFlexOfficeAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeAdmin";
import type { IFlexOfficeTheme } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeTheme";

export async function test_api_ui_theme_retrieval_with_admin_authentication(
  connection: api.IConnection,
) {
  // Step 1: Admin user registration
  const adminCreateBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
  } satisfies IFlexOfficeAdmin.ICreate;

  const adminAuthorized: IFlexOfficeAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminCreateBody,
    });
  typia.assert(adminAuthorized);

  // Step 2: Admin login
  const adminLoginBody = {
    email: adminCreateBody.email,
    password: adminCreateBody.password,
  } satisfies IFlexOfficeAdmin.ILogin;

  const adminLoginAuthorized: IFlexOfficeAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminLoginAuthorized);

  // Step 3: Retrieve UI theme details with valid theme ID
  const validThemeId = typia.random<string & tags.Format<"uuid">>();

  const theme: IFlexOfficeTheme =
    await api.functional.flexOffice.admin.themes.atTheme(connection, {
      id: validThemeId,
    });
  typia.assert(theme);

  TestValidator.predicate(
    "Theme 'id' is valid UUID format",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      theme.id,
    ),
  );
  TestValidator.predicate(
    "Theme 'name' is a non-empty string",
    typeof theme.name === "string" && theme.name.length > 0,
  );
  TestValidator.predicate(
    "Theme 'created_at' is ISO date-time string",
    /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z/.test(theme.created_at),
  );
  TestValidator.predicate(
    "Theme 'updated_at' is ISO date-time string",
    /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z/.test(theme.updated_at),
  );

  // Step 4: Error cases

  // 4-1: Unauthorized theme detail retrieval (no auth)
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "Unauthorized access to theme detail is rejected",
    async () => {
      await api.functional.flexOffice.admin.themes.atTheme(unauthConn, {
        id: validThemeId,
      });
    },
  );

  // 4-2: Invalid theme ID retrieval results in 404 error
  const invalidThemeId =
    "00000000-0000-0000-0000-000000000000" satisfies string &
      tags.Format<"uuid">;

  await TestValidator.error(
    "Theme retrieval with invalid ID returns error",
    async () => {
      await api.functional.flexOffice.admin.themes.atTheme(connection, {
        id: invalidThemeId,
      });
    },
  );
}
