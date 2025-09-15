import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ILibraryManagementBooks } from "@ORGANIZATION/PROJECT-api/lib/structures/ILibraryManagementBooks";
import type { ILibraryManagementGuestUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ILibraryManagementGuestUser";

export async function test_api_library_management_guestuser_book_create_success(
  connection: api.IConnection,
) {
  // Step 1: Guest user joins and obtains temporary authorization token
  const auth: ILibraryManagementGuestUser.IAuthorized =
    await api.functional.auth.guestUser.join(connection);
  typia.assert(auth);

  // Step 2: Create a new book with unique ISBN
  const uniqueIsbn = `978-${RandomGenerator.alphaNumeric(10)}`;
  const createBody: ILibraryManagementBooks.ICreate = {
    title: RandomGenerator.paragraph({ sentences: 3, wordMin: 3, wordMax: 10 }),
    author: RandomGenerator.name(),
    isbn: uniqueIsbn,
  };

  const book: ILibraryManagementBooks =
    await api.functional.libraryManagement.guestUser.books.create(connection, {
      body: createBody,
    });
  typia.assert(book);
  TestValidator.equals(
    "Created book title matches input",
    book.title,
    createBody.title,
  );
  TestValidator.equals(
    "Created book author matches input",
    book.author,
    createBody.author,
  );
  TestValidator.equals(
    "Created book ISBN matches unique ISBN",
    book.isbn,
    uniqueIsbn,
  );

  // Step 3: Validate duplicate ISBN submission is rejected
  await TestValidator.error(
    "Duplicate ISBN book creation throws error",
    async () => {
      await api.functional.libraryManagement.guestUser.books.create(
        connection,
        {
          body: {
            title: RandomGenerator.paragraph({
              sentences: 2,
              wordMin: 3,
              wordMax: 7,
            }),
            author: RandomGenerator.name(),
            isbn: uniqueIsbn, // same ISBN
          },
        },
      );
    },
  );
}
