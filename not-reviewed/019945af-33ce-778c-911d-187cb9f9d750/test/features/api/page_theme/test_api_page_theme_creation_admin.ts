import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IFlexOfficeAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeAdmin";
import type { IFlexOfficePageTheme } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficePageTheme";

/**
 * Test the full workflow of admin page theme creation, ensuring authorization,
 * uniqueness constraints, and data integrity.
 *
 * Step-by-step process:
 *
 * 1. Register a new admin user with unique email and password.
 * 2. Log in as the admin user to receive authorization tokens.
 * 3. Use the authorization to create a new page theme with a unique name.
 * 4. Validate the created page theme's properties including ID and timestamps.
 * 5. Attempt to create another page theme with the same name and expect failure.
 * 6. Simulate unauthenticated creation attempt and confirm access denial.
 */
export async function test_api_page_theme_creation_admin(
  connection: api.IConnection,
) {
  // 1. Register a new admin user
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(12);
  const adminCreateBody = {
    email: adminEmail,
    password: adminPassword,
  } satisfies IFlexOfficeAdmin.ICreate;

  const admin: IFlexOfficeAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminCreateBody,
    });
  typia.assert(admin);

  // 2. Log in as the admin user
  const adminLoginBody = {
    email: adminEmail,
    password: adminPassword,
  } satisfies IFlexOfficeAdmin.ILogin;

  const adminLogin: IFlexOfficeAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminLogin);

  // 3. Create a new page theme with unique name
  const themeName = RandomGenerator.name(3);
  const themeDescription = RandomGenerator.paragraph({ sentences: 5 });
  const pageThemeCreateBody = {
    name: themeName,
    description: themeDescription,
  } satisfies IFlexOfficePageTheme.ICreate;

  const createdTheme: IFlexOfficePageTheme =
    await api.functional.flexOffice.admin.pageThemes.create(connection, {
      body: pageThemeCreateBody,
    });
  typia.assert(createdTheme);

  TestValidator.equals(
    "created theme name matches request",
    createdTheme.name,
    themeName,
  );
  if (
    pageThemeCreateBody.description === null ||
    pageThemeCreateBody.description === undefined
  ) {
    TestValidator.predicate(
      "created theme description is null or undefined",
      createdTheme.description === null ||
        createdTheme.description === undefined,
    );
  } else {
    TestValidator.equals(
      "created theme description matches request",
      createdTheme.description,
      themeDescription,
    );
  }

  TestValidator.predicate(
    "created theme id is valid UUID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      createdTheme.id,
    ),
  );

  TestValidator.predicate(
    "created theme created_at is ISO 8601",
    /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9:.]+Z$/.test(createdTheme.created_at),
  );

  TestValidator.predicate(
    "created theme updated_at is ISO 8601",
    /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9:.]+Z$/.test(createdTheme.updated_at),
  );

  // 4. Attempt to create a page theme with the same name and expect failure
  await TestValidator.error(
    "duplicate theme name creation should fail",
    async () => {
      await api.functional.flexOffice.admin.pageThemes.create(connection, {
        body: pageThemeCreateBody,
      });
    },
  );

  // 5. Create a new connection without authorization (simulated unauthenticated)
  const unauthConnection: api.IConnection = { ...connection, headers: {} };

  await TestValidator.error(
    "unauthorized page theme creation should fail",
    async () => {
      await api.functional.flexOffice.admin.pageThemes.create(
        unauthConnection,
        {
          body: {
            name: RandomGenerator.name(2),
            description: RandomGenerator.paragraph({ sentences: 3 }),
          } satisfies IFlexOfficePageTheme.ICreate,
        },
      );
    },
  );
}
