import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITelegramFileDownloaderAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ITelegramFileDownloaderAdministrator";
import type { ITelegramFileDownloaderDeveloper } from "@ORGANIZATION/PROJECT-api/lib/structures/ITelegramFileDownloaderDeveloper";

export async function test_api_developer_retrieval_by_id_success_and_not_found(
  connection: api.IConnection,
) {
  // 1. Administrator user joins and authenticates to obtain authorization token
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const adminPasswordHash = RandomGenerator.alphaNumeric(64); // Simulate a hash string
  const administrator: ITelegramFileDownloaderAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: adminEmail,
        password_hash: adminPasswordHash,
      } satisfies ITelegramFileDownloaderAdministrator.ICreate,
    });
  typia.assert(administrator);

  // 2. Create a new developer user via the admin developer creation endpoint
  const developerEmail: string = typia.random<string & tags.Format<"email">>();
  const developerPasswordHash = RandomGenerator.alphaNumeric(64); // Simulated hash string
  const developer: ITelegramFileDownloaderDeveloper =
    await api.functional.telegramFileDownloader.administrator.developers.create(
      connection,
      {
        body: {
          email: developerEmail,
          password_hash: developerPasswordHash,
        } satisfies ITelegramFileDownloaderDeveloper.ICreate,
      },
    );
  typia.assert(developer);

  // 3. Retrieve the developer by ID and verify returned data
  const retrievedDeveloper: ITelegramFileDownloaderDeveloper =
    await api.functional.telegramFileDownloader.administrator.developers.at(
      connection,
      {
        developerId: developer.id,
      },
    );
  typia.assert(retrievedDeveloper);

  // Check key properties for equality
  TestValidator.equals(
    "developer id matches",
    retrievedDeveloper.id,
    developer.id,
  );
  TestValidator.equals(
    "developer email matches",
    retrievedDeveloper.email,
    developer.email,
  );
  TestValidator.equals(
    "developer password_hash matches",
    retrievedDeveloper.password_hash,
    developer.password_hash,
  );
  TestValidator.equals(
    "developer created_at matches",
    retrievedDeveloper.created_at,
    developer.created_at,
  );
  TestValidator.equals(
    "developer updated_at matches",
    retrievedDeveloper.updated_at,
    developer.updated_at,
  );

  // If deleted_at exists, it should match as well; if undefined or null, ensure explicit null
  TestValidator.equals(
    "developer deleted_at matches",
    retrievedDeveloper.deleted_at === undefined
      ? null
      : retrievedDeveloper.deleted_at,
    developer.deleted_at === undefined ? null : developer.deleted_at,
  );

  // 4. Attempt retrieval with non-existent developer ID asserts 404 Not Found
  let nonExistentDeveloperId: string = typia.random<
    string & tags.Format<"uuid">
  >();
  // Ensure nonExistentDeveloperId differs from created developer.id
  if (nonExistentDeveloperId === developer.id) {
    // If random matches, generate another
    nonExistentDeveloperId = typia.random<string & tags.Format<"uuid">>();
  }

  await TestValidator.error(
    "retrieving non-existent developer should fail",
    async () => {
      await api.functional.telegramFileDownloader.administrator.developers.at(
        connection,
        {
          developerId: nonExistentDeveloperId,
        },
      );
    },
  );
}
