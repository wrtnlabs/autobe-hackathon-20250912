import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IFlexOfficeAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeAdmin";
import type { IFlexOfficePageTheme } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficePageTheme";

export async function test_api_page_theme_update_with_authentication(
  connection: api.IConnection,
) {
  // 1. Create admin user
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "Password123!";
  const admin: IFlexOfficeAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
      } satisfies IFlexOfficeAdmin.ICreate,
    });
  typia.assert(admin);

  // 2. Login admin user
  const loginInfo: IFlexOfficeAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
      } satisfies IFlexOfficeAdmin.ILogin,
    });
  typia.assert(loginInfo);

  // 3. Create a page theme
  const pageThemeName = RandomGenerator.paragraph({
    sentences: 2,
    wordMin: 5,
    wordMax: 8,
  });
  const pageThemeDescription = RandomGenerator.content({
    paragraphs: 1,
    sentenceMin: 3,
    sentenceMax: 5,
    wordMin: 4,
    wordMax: 8,
  });
  const createdTheme: IFlexOfficePageTheme =
    await api.functional.flexOffice.admin.pageThemes.create(connection, {
      body: {
        name: pageThemeName,
        description: pageThemeDescription,
      } satisfies IFlexOfficePageTheme.ICreate,
    });
  typia.assert(createdTheme);

  // 4. Update page theme by ID
  const updatedName = RandomGenerator.paragraph({
    sentences: 3,
    wordMin: 6,
    wordMax: 10,
  });
  const updatedDescription = RandomGenerator.content({
    paragraphs: 2,
    sentenceMin: 5,
    sentenceMax: 8,
    wordMin: 5,
    wordMax: 10,
  });
  const updatedCss = `body { background-color: #${RandomGenerator.alphaNumeric(
    6,
  )}; }
h1 { font-family: 'Arial', sans-serif; color: #${RandomGenerator.alphaNumeric(
    6,
  )}; }`;
  const updatedTheme: IFlexOfficePageTheme =
    await api.functional.flexOffice.admin.pageThemes.updatePageTheme(
      connection,
      {
        pageThemeId: createdTheme.id,
        body: {
          name: updatedName,
          description: updatedDescription,
          css: updatedCss,
        } satisfies IFlexOfficePageTheme.IUpdate,
      },
    );
  typia.assert(updatedTheme);
  TestValidator.equals(
    "pageTheme id unchanged after update",
    updatedTheme.id,
    createdTheme.id,
  );
  TestValidator.equals(
    "pageTheme name updated",
    updatedTheme.name,
    updatedName,
  );
  TestValidator.equals(
    "pageTheme description updated",
    updatedTheme.description,
    updatedDescription,
  );
  // CSS is not part of returned data, so no direct validation possible

  // Validate ISO 8601 date format for created_at and updated_at
  const isoDateRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.?\d*Z$/;
  TestValidator.predicate(
    "pageTheme created_at is ISO date format",
    isoDateRegex.test(updatedTheme.created_at),
  );
  TestValidator.predicate(
    "pageTheme updated_at is ISO date format",
    isoDateRegex.test(updatedTheme.updated_at),
  );

  // 5. Test invalid update: duplicate name (using same name re-update)
  await TestValidator.error(
    "updating page theme with duplicate name should fail",
    async () => {
      await api.functional.flexOffice.admin.pageThemes.updatePageTheme(
        connection,
        {
          pageThemeId: updatedTheme.id,
          body: { name: updatedName } satisfies IFlexOfficePageTheme.IUpdate,
        },
      );
    },
  );

  // 6. Test unauthorized update: no authentication
  const unauthConnection: api.IConnection = { ...connection, headers: {} };

  await TestValidator.error(
    "unauthenticated user cannot update page theme",
    async () => {
      await api.functional.flexOffice.admin.pageThemes.updatePageTheme(
        unauthConnection,
        {
          pageThemeId: updatedTheme.id,
          body: {
            name: RandomGenerator.paragraph({
              sentences: 2,
              wordMin: 5,
              wordMax: 8,
            }),
          } satisfies IFlexOfficePageTheme.IUpdate,
        },
      );
    },
  );
}
