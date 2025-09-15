import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ILibraryManagementBooks } from "@ORGANIZATION/PROJECT-api/lib/structures/ILibraryManagementBooks";
import type { ILibraryManagementGuestUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ILibraryManagementGuestUser";

/**
 * This test validates successful update of an existing book by a guest user.
 *
 * The flow involves:
 *
 * 1. Guest user authenticates via join operation to obtain authorization.
 * 2. Creation of an initial book with valid title, author, and unique ISBN.
 * 3. Creation of a second book to use its ISBN as a conflicting value.
 * 4. Updating the first book with new valid title, author, and a unique ISBN.
 * 5. Revalidating the update outcome by asserting the returned book data.
 * 6. Attempting to update the first book to use the second book's ISBN, expecting
 *    a conflict error.
 *
 * Validations include type assertion of API responses, TestValidator assertions
 * for data equality, and error expectation on duplicate ISBN.
 */
export async function test_api_library_management_guestuser_book_update_success(
  connection: api.IConnection,
) {
  // Step 1: Authenticate as guest user (first time)
  const guestUser1: ILibraryManagementGuestUser.IAuthorized =
    await api.functional.auth.guestUser.join(connection);
  typia.assert(guestUser1);

  // Step 2: Create first book
  const bookCreateBody1 = {
    title: RandomGenerator.paragraph({ sentences: 3, wordMin: 5, wordMax: 10 }),
    author: RandomGenerator.name(),
    isbn: RandomGenerator.alphaNumeric(13),
  } satisfies ILibraryManagementBooks.ICreate;

  const book1: ILibraryManagementBooks =
    await api.functional.libraryManagement.guestUser.books.create(connection, {
      body: bookCreateBody1,
    });
  typia.assert(book1);
  TestValidator.equals(
    "Book1 title equals creation input",
    book1.title,
    bookCreateBody1.title,
  );
  TestValidator.equals(
    "Book1 author equals creation input",
    book1.author,
    bookCreateBody1.author,
  );
  TestValidator.equals(
    "Book1 ISBN equals creation input",
    book1.isbn,
    bookCreateBody1.isbn,
  );

  // Step 3: Authenticate as guest user (second time for dependency)
  const guestUser2: ILibraryManagementGuestUser.IAuthorized =
    await api.functional.auth.guestUser.join(connection);
  typia.assert(guestUser2);

  // Step 4: Create second book to have conflicting ISBN
  const bookCreateBody2 = {
    title: RandomGenerator.paragraph({ sentences: 2, wordMin: 5, wordMax: 10 }),
    author: RandomGenerator.name(),
    isbn: RandomGenerator.alphaNumeric(13),
  } satisfies ILibraryManagementBooks.ICreate;

  const book2: ILibraryManagementBooks =
    await api.functional.libraryManagement.guestUser.books.create(connection, {
      body: bookCreateBody2,
    });
  typia.assert(book2);
  TestValidator.equals(
    "Book2 ISBN equals creation input",
    book2.isbn,
    bookCreateBody2.isbn,
  );

  // Step 5: Update first book with new title, author, and unique ISBN
  const bookUpdateBody = {
    title: RandomGenerator.paragraph({ sentences: 4, wordMin: 6, wordMax: 12 }),
    author: RandomGenerator.name(),
    isbn: RandomGenerator.alphaNumeric(13), // unique new ISBN
  } satisfies ILibraryManagementBooks.IUpdate;

  const updateResponse: ILibraryManagementBooks =
    await api.functional.libraryManagement.guestUser.books.update(connection, {
      bookId: book1.id,
      body: bookUpdateBody,
    });
  typia.assert(updateResponse);

  TestValidator.equals(
    "Updated book ID equals original book ID",
    updateResponse.id,
    book1.id,
  );
  TestValidator.equals(
    "Updated book title matches update input",
    updateResponse.title,
    bookUpdateBody.title!,
  );
  TestValidator.equals(
    "Updated book author matches update input",
    updateResponse.author,
    bookUpdateBody.author!,
  );
  TestValidator.equals(
    "Updated book ISBN matches update input",
    updateResponse.isbn,
    bookUpdateBody.isbn!,
  );

  // Step 6: Attempt to update first book's ISBN to duplicate second book's ISBN (conflict)
  await TestValidator.error(
    "Book update fails with duplicate ISBN",
    async () => {
      await api.functional.libraryManagement.guestUser.books.update(
        connection,
        {
          bookId: book1.id,
          body: {
            title: bookUpdateBody.title, // characters as before
            author: bookUpdateBody.author,
            isbn: book2.isbn, // duplicate ISBN causing conflict
          } satisfies ILibraryManagementBooks.IUpdate,
        },
      );
    },
  );
}
