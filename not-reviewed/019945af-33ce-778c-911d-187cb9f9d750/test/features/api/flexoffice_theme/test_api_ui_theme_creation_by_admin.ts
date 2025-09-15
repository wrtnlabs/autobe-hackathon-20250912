import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IFlexOfficeAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeAdmin";
import type { IFlexOfficeTheme } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeTheme";

/**
 * End-to-end test for creating a UI theme by an admin.
 *
 * This test covers admin registration, login, and UI theme creation. It
 * asserts that themes are created with unique names and optional CSS, and
 * rejects duplicates as expected.
 *
 * Steps:
 *
 * 1. Admin registers with unique credentials.
 * 2. Admin logs in to obtain auth tokens.
 * 3. Admin creates a new theme with unique name and CSS.
 * 4. The theme is validated for correct creation attributes.
 * 5. Attempt to create a duplicate theme with the same name results in error.
 */
export async function test_api_ui_theme_creation_by_admin(
  connection: api.IConnection,
) {
  // 1. Admin registration
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(16);
  const adminCreateBody = {
    email: adminEmail,
    password: adminPassword,
  } satisfies IFlexOfficeAdmin.ICreate;

  const adminAuthorized: IFlexOfficeAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, { body: adminCreateBody });
  typia.assert(adminAuthorized);

  // 2. Admin login
  const adminLoginBody = {
    email: adminEmail,
    password: adminPassword,
  } satisfies IFlexOfficeAdmin.ILogin;

  const adminLoginAuthorized: IFlexOfficeAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, { body: adminLoginBody });
  typia.assert(adminLoginAuthorized);

  // 3. Create a new UI theme
  const themeName = RandomGenerator.paragraph({
    sentences: 2,
    wordMin: 5,
    wordMax: 10,
  });
  const themeCss = RandomGenerator.paragraph({
    sentences: 3,
    wordMin: 5,
    wordMax: 10,
  });

  const themeCreateBody = {
    name: themeName,
    css: themeCss,
  } satisfies IFlexOfficeTheme.ICreate;

  const createdTheme: IFlexOfficeTheme =
    await api.functional.flexOffice.admin.themes.createTheme(connection, {
      body: themeCreateBody,
    });
  typia.assert(createdTheme);

  TestValidator.predicate(
    "theme.id is uuid",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      createdTheme.id,
    ),
  );
  TestValidator.equals("theme name matches", createdTheme.name, themeName);
  // css can be null or string, here we supplied string
  TestValidator.equals("theme css matches", createdTheme.css, themeCss);
  TestValidator.predicate(
    "theme created_at valid ISO date",
    typeof createdTheme.created_at === "string" &&
      !isNaN(Date.parse(createdTheme.created_at)),
  );
  TestValidator.predicate(
    "theme updated_at valid ISO date",
    typeof createdTheme.updated_at === "string" &&
      !isNaN(Date.parse(createdTheme.updated_at)),
  );

  // 4. Attempt duplicate theme creation - expect error
  await TestValidator.error(
    "duplicate theme name creation should fail",
    async () => {
      await api.functional.flexOffice.admin.themes.createTheme(connection, {
        body: {
          name: themeName,
          css: "/* duplicate css content */",
        } satisfies IFlexOfficeTheme.ICreate,
      });
    },
  );
}
